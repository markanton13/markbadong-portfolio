import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MODERATION_REASON_CODES,
  ModerationStorageError,
  normalizePrivateModerationNote,
  transitionIntakeSubmission,
} from '../workers/ask-mark/src/lib/moderation-storage.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sourcePath = path.join(
  root,
  'workers',
  'ask-mark',
  'src',
  'lib',
  'moderation-storage.js',
)

class FakeStatement {
  constructor(sql, database) {
    this.sql = sql
    this.database = database
    this.bindings = []
  }

  bind(...bindings) {
    this.bindings = bindings
    return this
  }

  async first() {
    return this.database.currentState
  }
}

class FakeDatabase {
  constructor({
    currentState,
    batchResults = [
      { meta: { changes: 1 } },
      { meta: { changes: 1 } },
      { meta: { changes: 1 } },
    ],
  }) {
    this.currentState = currentState
    this.batchResults = batchResults
    this.prepared = []
    this.batches = []
  }

  prepare(sql) {
    const statement = new FakeStatement(sql, this)
    this.prepared.push(statement)
    return statement
  }

  async batch(statements) {
    this.batches.push(statements)
    return this.batchResults
  }
}

const baseUpdatedAt = '2026-08-04T00:00:00.000Z'
const actionCreatedAt = '2026-08-04T00:00:01.000Z'

function record(overrides = {}) {
  return {
    submissionId: 'submission_storage_check',
    actionId: 'action_storage_check',
    eventId: 'event_storage_check',
    action: 'approve',
    expectedStatus: 'pending_review',
    expectedUpdatedAt: baseUpdatedAt,
    reasonCode: 'useful_question',
    note: 'Verify against approved sources.',
    actorId: 'local-admin:mark',
    createdAt: actionCreatedAt,
    ...overrides,
  }
}

function database(status = 'pending_review', options = {}) {
  return new FakeDatabase({
    currentState: {
      id: 'submission_storage_check',
      status,
      updated_at: baseUpdatedAt,
    },
    ...options,
  })
}

async function expectModerationError(promise, code, status) {
  await assert.rejects(
    promise,
    (error) =>
      error instanceof ModerationStorageError &&
      error.code === code &&
      error.status === status,
  )
}

const approveDatabase = database()
const approved = await transitionIntakeSubmission(
  approveDatabase,
  record(),
)

assert.deepEqual(approved, {
  id: 'submission_storage_check',
  status: 'approved',
  updatedAt: actionCreatedAt,
  actionId: 'action_storage_check',
})
assert.equal(approveDatabase.batches.length, 1)
assert.equal(approveDatabase.batches[0].length, 3)
assert.equal(approveDatabase.prepared.length, 4)

const [readStatement, updateStatement, actionStatement, eventStatement] =
  approveDatabase.prepared

assert.match(readStatement.sql, /FROM visitor_submissions/iu)
assert.match(updateStatement.sql, /AND status = \?4/iu)
assert.match(updateStatement.sql, /AND updated_at = \?5/iu)
assert.match(actionStatement.sql, /WHERE EXISTS/iu)
assert.match(actionStatement.sql, /visitor_submission_moderation_actions/iu)
assert.match(eventStatement.sql, /WHERE EXISTS/iu)
assert.equal(eventStatement.bindings[6], 'admin')

const transitionCases = [
  {
    action: 'reject',
    from: 'pending_review',
    result: 'rejected',
    reasonCode: 'not_actionable',
  },
  {
    action: 'archive',
    from: 'pending_review',
    result: 'archived',
    reasonCode: 'resolved',
  },
  {
    action: 'archive',
    from: 'approved',
    result: 'archived',
    reasonCode: 'retention_cleanup',
  },
  {
    action: 'archive',
    from: 'rejected',
    result: 'archived',
    reasonCode: 'other',
  },
  {
    action: 'reopen',
    from: 'approved',
    result: 'pending_review',
    reasonCode: 'needs_reconsideration',
  },
  {
    action: 'reopen',
    from: 'rejected',
    result: 'pending_review',
    reasonCode: 'other',
  },
  {
    action: 'reopen',
    from: 'archived',
    result: 'pending_review',
    reasonCode: 'needs_reconsideration',
  },
]

for (const testCase of transitionCases) {
  const db = database(testCase.from)
  const result = await transitionIntakeSubmission(
    db,
    record({
      action: testCase.action,
      expectedStatus: testCase.from,
      reasonCode: testCase.reasonCode,
    }),
  )

  assert.equal(result.status, testCase.result)
  assert.equal(db.batches.length, 1)
}

const invalidTransitions = [
  ['approve', 'approved'],
  ['approve', 'received'],
  ['reject', 'rejected'],
  ['reject', 'approved'],
  ['archive', 'archived'],
  ['reopen', 'pending_review'],
  ['reopen', 'received'],
]

for (const [action, currentStatus] of invalidTransitions) {
  const db = database(currentStatus)

  await expectModerationError(
    transitionIntakeSubmission(
      db,
      record({
        action,
        expectedStatus: currentStatus,
        reasonCode:
          MODERATION_REASON_CODES[action]?.[0] ?? 'other',
      }),
    ),
    'invalid_moderation_transition',
    409,
  )

  assert.equal(db.batches.length, 0)
}

const staleStatusDatabase = database('pending_review')
await expectModerationError(
  transitionIntakeSubmission(
    staleStatusDatabase,
    record({ expectedStatus: 'approved' }),
  ),
  'stale_submission',
  409,
)
assert.equal(staleStatusDatabase.batches.length, 0)

const staleTimestampDatabase = database('pending_review')
await expectModerationError(
  transitionIntakeSubmission(
    staleTimestampDatabase,
    record({
      expectedUpdatedAt: '2026-08-03T23:59:59.000Z',
    }),
  ),
  'stale_submission',
  409,
)
assert.equal(staleTimestampDatabase.batches.length, 0)

const raceDatabase = database('pending_review', {
  batchResults: [
    { meta: { changes: 0 } },
    { meta: { changes: 0 } },
    { meta: { changes: 0 } },
  ],
})
await expectModerationError(
  transitionIntakeSubmission(raceDatabase, record()),
  'stale_submission',
  409,
)

const missingDatabase = new FakeDatabase({ currentState: null })
await expectModerationError(
  transitionIntakeSubmission(missingDatabase, record()),
  'not_found',
  404,
)
assert.equal(missingDatabase.batches.length, 0)

await expectModerationError(
  transitionIntakeSubmission(
    database(),
    record({ reasonCode: 'duplicate' }),
  ),
  'invalid_reason_code',
  400,
)

await expectModerationError(
  transitionIntakeSubmission(
    database(),
    record({ action: 'publish' }),
  ),
  'invalid_action',
  400,
)

assert.equal(
  normalizePrivateModerationNote('  Ａ\r\nB\tC  '),
  'A\nB C',
)
assert.equal(normalizePrivateModerationNote('   '), null)

await expectModerationError(
  Promise.resolve().then(() =>
    normalizePrivateModerationNote('x'.repeat(1001)),
  ),
  'note_too_long',
  400,
)

await expectModerationError(
  Promise.resolve().then(() =>
    normalizePrivateModerationNote('unsafe\u0000note'),
  ),
  'invalid_note',
  400,
)

const source = await readFile(sourcePath, 'utf8')

for (const prohibited of [
  'knowledge.js',
  'publication',
  'knowledge_items',
  'publication_releases',
  'v_active_knowledge',
  'UPDATE visitor_submission_moderation_actions',
  'DELETE FROM visitor_submission_moderation_actions',
]) {
  assert.equal(
    source.includes(prohibited),
    false,
    `Moderation storage must not contain: ${prohibited}`,
  )
}

for (const required of [
  'UPDATE visitor_submissions',
  'AND status = ?4',
  'AND updated_at = ?5',
  'INSERT INTO visitor_submission_moderation_actions',
  'INSERT INTO visitor_submission_events',
  'WHERE EXISTS',
  "'admin'",
  'db.batch([',
]) {
  assert.equal(
    source.includes(required),
    true,
    `Moderation storage contract is missing: ${required}`,
  )
}

console.log(
  [
    'Ask Mark moderation storage checks passed:',
    'approve/reject/archive/reopen transitions, action-specific reasons,',
    'plain-text private notes, conditional stale-write protection,',
    'one atomic three-statement batch, immutable append-only audit writes,',
    'and zero knowledge or publication coupling.',
  ].join(' '),
)
