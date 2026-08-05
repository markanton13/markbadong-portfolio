export const MODERATION_ACTIONS = Object.freeze([
  'approve',
  'reject',
  'archive',
  'reopen',
])

export const MODERATION_REASON_CODES = Object.freeze({
  approve: Object.freeze([
    'useful_question',
    'valid_correction',
    'helpful_feedback',
    'other',
  ]),
  reject: Object.freeze([
    'duplicate',
    'not_relevant',
    'unsafe_or_abusive',
    'contains_sensitive_data',
    'not_actionable',
    'other',
  ]),
  archive: Object.freeze([
    'resolved',
    'retention_cleanup',
    'other',
  ]),
  reopen: Object.freeze([
    'needs_reconsideration',
    'other',
  ]),
})

const TRANSITIONS = Object.freeze({
  approve: Object.freeze({
    allowedFrom: Object.freeze(['pending_review']),
    resultingStatus: 'approved',
    eventType: 'approved',
  }),
  reject: Object.freeze({
    allowedFrom: Object.freeze(['pending_review']),
    resultingStatus: 'rejected',
    eventType: 'rejected',
  }),
  archive: Object.freeze({
    allowedFrom: Object.freeze([
      'pending_review',
      'approved',
      'rejected',
    ]),
    resultingStatus: 'archived',
    eventType: 'archived',
  }),
  reopen: Object.freeze({
    allowedFrom: Object.freeze([
      'approved',
      'rejected',
      'archived',
    ]),
    resultingStatus: 'pending_review',
    eventType: 'reopened',
  }),
})

const MAXIMUM_ID_LENGTH = 200
const MAXIMUM_ACTOR_ID_LENGTH = 100
const MAXIMUM_NOTE_CODE_POINTS = 1000

export class ModerationStorageError extends Error {
  constructor(code, status, message, cause) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ModerationStorageError'
    this.code = code
    this.status = status
  }
}

function fail(code, status, message) {
  throw new ModerationStorageError(code, status, message)
}

function requiredString(record, field, maximumLength = MAXIMUM_ID_LENGTH) {
  const value = record?.[field]

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximumLength
  ) {
    throw new TypeError(
      `Moderation storage field ${field} is required.`,
    )
  }

  return value
}

function validateIsoTimestamp(value, field) {
  const parsed = Date.parse(value)

  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== value
  ) {
    throw new TypeError(
      `Moderation storage field ${field} must be an exact ISO timestamp.`,
    )
  }

  return value
}

function assertWellFormedUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)

      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        fail(
          'invalid_unicode',
          400,
          'The private moderation note contains malformed Unicode.',
        )
      }

      index += 1
      continue
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      fail(
        'invalid_unicode',
        400,
        'The private moderation note contains malformed Unicode.',
      )
    }
  }
}

function hasProhibitedControl(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0)

    if (
      (codePoint < 32 && codePoint !== 10) ||
      (codePoint >= 127 && codePoint <= 159)
    ) {
      return true
    }
  }

  return false
}

export function normalizePrivateModerationNote(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    fail(
      'invalid_note',
      400,
      'The private moderation note must be plain text.',
    )
  }

  assertWellFormedUnicode(value)

  const normalized = value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\t', ' ')
    .normalize('NFKC')
    .trim()

  if (!normalized) return null

  if (hasProhibitedControl(normalized)) {
    fail(
      'invalid_note',
      400,
      'The private moderation note contains prohibited control characters.',
    )
  }

  if (Array.from(normalized).length > MAXIMUM_NOTE_CODE_POINTS) {
    fail(
      'note_too_long',
      400,
      `Private moderation notes are limited to ${MAXIMUM_NOTE_CODE_POINTS} characters.`,
    )
  }

  return normalized
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('A moderation storage record is required.')
  }

  const action = requiredString(record, 'action')
  const transition = TRANSITIONS[action]

  if (!transition) {
    fail('invalid_action', 400, 'The moderation action is invalid.')
  }

  const reasonCode = requiredString(record, 'reasonCode')

  if (!MODERATION_REASON_CODES[action].includes(reasonCode)) {
    fail(
      'invalid_reason_code',
      400,
      'The moderation reason is invalid for this action.',
    )
  }

  const expectedStatus = requiredString(record, 'expectedStatus')
  const expectedUpdatedAt = validateIsoTimestamp(
    requiredString(record, 'expectedUpdatedAt'),
    'expectedUpdatedAt',
  )
  const createdAt = validateIsoTimestamp(
    requiredString(record, 'createdAt'),
    'createdAt',
  )

  if (createdAt <= expectedUpdatedAt) {
    throw new TypeError(
      'The moderation action timestamp must be later than the expected update timestamp.',
    )
  }

  return {
    submissionId: requiredString(record, 'submissionId'),
    actionId: requiredString(record, 'actionId'),
    eventId: requiredString(record, 'eventId'),
    action,
    transition,
    expectedStatus,
    expectedUpdatedAt,
    reasonCode,
    noteText: normalizePrivateModerationNote(record.note),
    actorId: requiredString(
      record,
      'actorId',
      MAXIMUM_ACTOR_ID_LENGTH,
    ),
    createdAt,
  }
}

function validateDatabase(db) {
  if (
    !db ||
    typeof db.prepare !== 'function' ||
    typeof db.batch !== 'function'
  ) {
    throw new TypeError('A D1 database binding is required.')
  }
}

async function readSubmissionState(db, submissionId) {
  const statement = db
    .prepare(
      [
        'SELECT id, status, updated_at',
        'FROM visitor_submissions',
        'WHERE id = ?1',
        'LIMIT 1',
      ].join(' '),
    )
    .bind(submissionId)

  if (typeof statement.first !== 'function') {
    throw new TypeError('The D1 statement must support first().')
  }

  return statement.first()
}

function changedRows(result) {
  const value = result?.meta?.changes
  return Number.isFinite(Number(value)) ? Number(value) : null
}

export async function transitionIntakeSubmission(db, record) {
  validateDatabase(db)
  const value = validateRecord(record)
  const current = await readSubmissionState(db, value.submissionId)

  if (!current) {
    fail(
      'not_found',
      404,
      'The requested visitor submission does not exist.',
    )
  }

  if (!value.transition.allowedFrom.includes(current.status)) {
    fail(
      'invalid_moderation_transition',
      409,
      'The requested moderation transition is not allowed.',
    )
  }

  if (
    current.status !== value.expectedStatus ||
    current.updated_at !== value.expectedUpdatedAt
  ) {
    fail(
      'stale_submission',
      409,
      'The visitor submission changed before this decision was saved.',
    )
  }

  const updateStatement = db
    .prepare(
      [
        'UPDATE visitor_submissions',
        'SET status = ?1, updated_at = ?2',
        'WHERE id = ?3',
        'AND status = ?4',
        'AND updated_at = ?5',
      ].join(' '),
    )
    .bind(
      value.transition.resultingStatus,
      value.createdAt,
      value.submissionId,
      value.expectedStatus,
      value.expectedUpdatedAt,
    )

  const actionStatement = db
    .prepare(
      [
        'INSERT INTO visitor_submission_moderation_actions (',
        'id, submission_id, action_type, previous_status,',
        'resulting_status, reason_code, note_text, actor_id, created_at',
        ')',
        'SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9',
        'WHERE EXISTS (',
        'SELECT 1 FROM visitor_submissions',
        'WHERE id = ?2 AND status = ?5 AND updated_at = ?9',
        ')',
      ].join(' '),
    )
    .bind(
      value.actionId,
      value.submissionId,
      value.action,
      value.expectedStatus,
      value.transition.resultingStatus,
      value.reasonCode,
      value.noteText,
      value.actorId,
      value.createdAt,
    )

  const eventStatement = db
    .prepare(
      [
        'INSERT INTO visitor_submission_events (',
        'id, submission_id, event_type, previous_status,',
        'resulting_status, reason_code, actor_type, actor_id, created_at',
        ')',
        'SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9',
        'WHERE EXISTS (',
        'SELECT 1 FROM visitor_submissions',
        'WHERE id = ?2 AND status = ?5 AND updated_at = ?9',
        ')',
      ].join(' '),
    )
    .bind(
      value.eventId,
      value.submissionId,
      value.transition.eventType,
      value.expectedStatus,
      value.transition.resultingStatus,
      value.reasonCode,
      'admin',
      value.actorId,
      value.createdAt,
    )

  const results = await db.batch([
    updateStatement,
    actionStatement,
    eventStatement,
  ])

  if (!Array.isArray(results) || results.length !== 3) {
    throw new Error('The moderation transaction returned an invalid result.')
  }

  const updateChanges = changedRows(results[0])

  if (updateChanges === 0) {
    fail(
      'stale_submission',
      409,
      'The visitor submission changed before this decision was saved.',
    )
  }

  if (updateChanges !== 1) {
    throw new Error(
      'The moderation transaction did not update exactly one submission.',
    )
  }

  return {
    id: value.submissionId,
    status: value.transition.resultingStatus,
    updatedAt: value.createdAt,
    actionId: value.actionId,
  }
}
