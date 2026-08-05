import assert from 'node:assert/strict'
import {
  INTAKE_STORAGE_STATUS,
  IntakeStorageError,
  classifyIntakeStorageError,
  purgeExpiredIntake,
  storeIntakeSubmission,
} from '../workers/ask-mark/src/lib/intake-storage.js'

class FakeStatement {
  constructor(sql) {
    this.sql = sql
    this.values = []
  }

  bind(...values) {
    this.values = values
    return this
  }
}

class FakeDatabase {
  constructor(error = null) {
    this.error = error
    this.prepared = []
    this.batches = []
  }

  prepare(sql) {
    const statement = new FakeStatement(sql)
    this.prepared.push(statement)
    return statement
  }

  async batch(statements) {
    this.batches.push(statements)

    if (this.error) throw this.error

    return statements.map(() => ({
      success: true,
      results: [],
    }))
  }
}

const record = {
  submissionId: 'submission_test_0001',
  receivedEventId: 'event_test_received_0001',
  queuedEventId: 'event_test_queued_0001',
  type: 'question',
  language: 'taglish',
  message: 'May CRM projects ba si Mark na puwedeng makita?',
  contentHash: 'a'.repeat(64),
  deduplicationHash: 'b'.repeat(64),
  bucketHash: 'c'.repeat(64),
  windowStartedAt: '2026-07-27T10:30:00.000Z',
  windowExpiresAt: '2026-07-27T10:45:00.000Z',
  submissionExpiresAt: '2026-10-25T10:30:00.000Z',
  createdAt: '2026-07-27T10:33:00.000Z',
}

const database = new FakeDatabase()
const stored = await storeIntakeSubmission(database, record)

assert.deepEqual(stored, {
  id: record.submissionId,
  status: INTAKE_STORAGE_STATUS,
})

assert.equal(database.batches.length, 1)
assert.equal(database.batches[0].length, 4)
assert.equal(database.prepared.length, 4)

const [
  bucketStatement,
  submissionStatement,
  receivedStatement,
  queuedStatement,
] = database.batches[0]

assert.match(
  bucketStatement.sql,
  /request_count = visitor_rate_limit_buckets\.request_count \+ 1/u,
)
assert.deepEqual(bucketStatement.values, [
  record.bucketHash,
  record.windowStartedAt,
  record.windowExpiresAt,
  record.createdAt,
])

assert.match(submissionStatement.sql, /deduplication_hash/u)
assert.equal(
  submissionStatement.values.includes(record.bucketHash),
  false,
)
assert.deepEqual(submissionStatement.values, [
  record.submissionId,
  record.type,
  record.language,
  record.message,
  record.contentHash,
  record.deduplicationHash,
  'pending_review',
  record.createdAt,
  record.submissionExpiresAt,
])

assert.deepEqual(receivedStatement.values, [
  record.receivedEventId,
  record.submissionId,
  'received',
  'received',
  'system',
  record.createdAt,
])

assert.deepEqual(queuedStatement.values, [
  record.queuedEventId,
  record.submissionId,
  'queued_for_review',
  'received',
  'pending_review',
  'system',
  record.createdAt,
])

for (const statement of database.prepared) {
  assert.equal(statement.sql.includes(record.message), false)
  assert.equal(statement.sql.includes(record.bucketHash), false)
}

const duplicateDatabase = new FakeDatabase(
  new Error(
    'D1_ERROR: UNIQUE constraint failed: ' +
      'visitor_submissions.deduplication_hash: SQLITE_CONSTRAINT',
  ),
)

await assert.rejects(
  storeIntakeSubmission(duplicateDatabase, record),
  (error) =>
    error instanceof IntakeStorageError &&
    error.code === 'duplicate_submission' &&
    error.status === 409,
)

const rateDatabase = new FakeDatabase(
  new Error(
    'D1_ERROR: CHECK constraint failed: ' +
      'request_count BETWEEN 0 AND 5: SQLITE_CONSTRAINT',
  ),
)

await assert.rejects(
  storeIntakeSubmission(rateDatabase, record),
  (error) =>
    error instanceof IntakeStorageError &&
    error.code === 'rate_limited' &&
    error.status === 429,
)

const unknownError = new Error('D1_ERROR: database unavailable')
const unavailableDatabase = new FakeDatabase(unknownError)

await assert.rejects(
  storeIntakeSubmission(unavailableDatabase, record),
  (error) => error === unknownError,
)

assert.equal(
  classifyIntakeStorageError(
    new Error(
      'UNIQUE constraint failed: visitor_submissions.deduplication_hash',
    ),
  ).code,
  'duplicate_submission',
)

assert.equal(
  classifyIntakeStorageError(
    new Error('CHECK constraint failed: request_count'),
  ).code,
  'rate_limited',
)

assert.equal(
  classifyIntakeStorageError(new Error('unrelated')),
  null,
)

const purgeDatabase = new FakeDatabase()
const purgeResult = await purgeExpiredIntake(
  purgeDatabase,
  '2026-10-26T00:00:00.000Z',
)

assert.equal(purgeDatabase.batches.length, 1)
assert.equal(purgeDatabase.batches[0].length, 2)
assert.equal(purgeResult.length, 2)
assert.match(
  purgeDatabase.batches[0][0].sql,
  /^DELETE FROM visitor_submissions/u,
)
assert.match(
  purgeDatabase.batches[0][1].sql,
  /^DELETE FROM visitor_rate_limit_buckets/u,
)

await assert.rejects(
  storeIntakeSubmission(null, record),
  /D1 database binding/u,
)

await assert.rejects(
  storeIntakeSubmission(new FakeDatabase(), {
    ...record,
    contentHash: 'invalid',
  }),
  /contentHash/u,
)

await assert.rejects(
  purgeExpiredIntake(new FakeDatabase(), ''),
  /purge timestamp/u,
)

console.log(
  'Ask Mark intake storage checks passed: prepared statements, one atomic ' +
    'four-statement batch, bucket isolation, duplicate and rate-limit error ' +
    'classification, unknown-error propagation, and expiry purge batching.',
)
