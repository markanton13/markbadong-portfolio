export const INTAKE_STORAGE_STATUS = 'pending_review'

export class IntakeStorageError extends Error {
  constructor(code, status, message, cause) {
    super(message, cause ? { cause } : undefined)
    this.name = 'IntakeStorageError'
    this.code = code
    this.status = status
  }
}

function requiredString(record, field) {
  const value = record?.[field]

  if (typeof value !== 'string' || !value) {
    throw new TypeError(`Intake storage field ${field} is required.`)
  }

  return value
}

function validateHash(value, field) {
  if (!/^[0-9a-f]{64}$/iu.test(value)) {
    throw new TypeError(
      `Intake storage field ${field} must be a 64-character hexadecimal hash.`,
    )
  }

  return value.toLowerCase()
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('An intake storage record is required.')
  }

  const validated = {
    submissionId: requiredString(record, 'submissionId'),
    receivedEventId: requiredString(record, 'receivedEventId'),
    queuedEventId: requiredString(record, 'queuedEventId'),
    type: requiredString(record, 'type'),
    language: requiredString(record, 'language'),
    message: requiredString(record, 'message'),
    contentHash: validateHash(
      requiredString(record, 'contentHash'),
      'contentHash',
    ),
    deduplicationHash: validateHash(
      requiredString(record, 'deduplicationHash'),
      'deduplicationHash',
    ),
    bucketHash: validateHash(
      requiredString(record, 'bucketHash'),
      'bucketHash',
    ),
    windowStartedAt: requiredString(record, 'windowStartedAt'),
    windowExpiresAt: requiredString(record, 'windowExpiresAt'),
    submissionExpiresAt: requiredString(record, 'submissionExpiresAt'),
    createdAt: requiredString(record, 'createdAt'),
  }

  if (!['question', 'correction', 'feedback'].includes(validated.type)) {
    throw new TypeError('Intake storage submission type is invalid.')
  }

  if (!['en', 'tl', 'taglish'].includes(validated.language)) {
    throw new TypeError('Intake storage language is invalid.')
  }

  return validated
}

function errorText(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

export function classifyIntakeStorageError(error) {
  const message = errorText(error)

  if (
    /unique constraint failed:\s*visitor_submissions\.deduplication_hash/iu.test(
      message,
    )
  ) {
    return new IntakeStorageError(
      'duplicate_submission',
      409,
      'An identical submission was already received in this window.',
      error,
    )
  }

  if (
    /check constraint failed:[^\n]*request_count/iu.test(message) ||
    /request_count between 0 and 5/iu.test(message)
  ) {
    return new IntakeStorageError(
      'rate_limited',
      429,
      'The intake limit for this window has been reached.',
      error,
    )
  }

  return null
}

export async function storeIntakeSubmission(db, record) {
  if (
    !db ||
    typeof db.prepare !== 'function' ||
    typeof db.batch !== 'function'
  ) {
    throw new TypeError('A D1 database binding is required.')
  }

  const value = validateRecord(record)

  const bucketStatement = db
    .prepare(
      [
        'INSERT INTO visitor_rate_limit_buckets (',
        'bucket_hash, window_started_at, request_count, expires_at, updated_at',
        ') VALUES (?1, ?2, 1, ?3, ?4)',
        'ON CONFLICT(bucket_hash, window_started_at) DO UPDATE SET',
        'request_count = visitor_rate_limit_buckets.request_count + 1,',
        'expires_at = excluded.expires_at,',
        'updated_at = excluded.updated_at',
      ].join(' '),
    )
    .bind(
      value.bucketHash,
      value.windowStartedAt,
      value.windowExpiresAt,
      value.createdAt,
    )

  const submissionStatement = db
    .prepare(
      [
        'INSERT INTO visitor_submissions (',
        'id, submission_type, language, content_text, content_hash,',
        'deduplication_hash, status, created_at, updated_at, expires_at',
        ') VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?9)',
      ].join(' '),
    )
    .bind(
      value.submissionId,
      value.type,
      value.language,
      value.message,
      value.contentHash,
      value.deduplicationHash,
      INTAKE_STORAGE_STATUS,
      value.createdAt,
      value.submissionExpiresAt,
    )

  const receivedEventStatement = db
    .prepare(
      [
        'INSERT INTO visitor_submission_events (',
        'id, submission_id, event_type, previous_status,',
        'resulting_status, reason_code, actor_type, actor_id, created_at',
        ') VALUES (?1, ?2, ?3, NULL, ?4, NULL, ?5, NULL, ?6)',
      ].join(' '),
    )
    .bind(
      value.receivedEventId,
      value.submissionId,
      'received',
      'received',
      'system',
      value.createdAt,
    )

  const queuedEventStatement = db
    .prepare(
      [
        'INSERT INTO visitor_submission_events (',
        'id, submission_id, event_type, previous_status,',
        'resulting_status, reason_code, actor_type, actor_id, created_at',
        ') VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, NULL, ?7)',
      ].join(' '),
    )
    .bind(
      value.queuedEventId,
      value.submissionId,
      'queued_for_review',
      'received',
      INTAKE_STORAGE_STATUS,
      'system',
      value.createdAt,
    )

  try {
    await db.batch([
      bucketStatement,
      submissionStatement,
      receivedEventStatement,
      queuedEventStatement,
    ])
  } catch (error) {
    const classified = classifyIntakeStorageError(error)

    if (classified) throw classified
    throw error
  }

  return {
    id: value.submissionId,
    status: INTAKE_STORAGE_STATUS,
  }
}

export async function purgeExpiredIntake(db, nowIso) {
  if (
    !db ||
    typeof db.prepare !== 'function' ||
    typeof db.batch !== 'function'
  ) {
    throw new TypeError('A D1 database binding is required.')
  }

  if (typeof nowIso !== 'string' || !nowIso) {
    throw new TypeError('A purge timestamp is required.')
  }

  return db.batch([
    db
      .prepare(
        'DELETE FROM visitor_submissions WHERE expires_at <= ?1',
      )
      .bind(nowIso),
    db
      .prepare(
        'DELETE FROM visitor_rate_limit_buckets WHERE expires_at <= ?1',
      )
      .bind(nowIso),
  ])
}
