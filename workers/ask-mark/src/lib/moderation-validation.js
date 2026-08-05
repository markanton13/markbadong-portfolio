import {
  MODERATION_ACTIONS,
  MODERATION_REASON_CODES,
  ModerationStorageError,
  normalizePrivateModerationNote,
} from './moderation-storage.js'

export const MODERATION_BODY_MAX_BYTES = 4096
export const MODERATION_DEFAULT_LIMIT = 20
export const MODERATION_MAXIMUM_LIMIT = 50

const STATUSES = new Set([
  'received',
  'pending_review',
  'approved',
  'rejected',
  'archived',
])
const TYPES = new Set([
  'question',
  'correction',
  'feedback',
])
const LANGUAGES = new Set([
  'en',
  'tl',
  'taglish',
])
const ACTION_FIELDS = new Set([
  'action',
  'expectedStatus',
  'expectedUpdatedAt',
  'reasonCode',
  'note',
])
const CURSOR_MAXIMUM_LENGTH = 512
const SUBMISSION_ID_PATTERN =
  /^submission_[A-Za-z0-9-]{1,180}$/u

const utf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
})
const utf8Encoder = new TextEncoder()

export class ModerationRequestError extends Error {
  constructor(code, status, message, cause) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ModerationRequestError'
    this.code = code
    this.status = status
  }
}

function fail(code, status, message, cause) {
  throw new ModerationRequestError(
    code,
    status,
    message,
    cause,
  )
}

function exactIsoTimestamp(value) {
  if (typeof value !== 'string' || !value) return false

  const parsed = Date.parse(value)

  return (
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString() === value
  )
}

function base64UrlEncode(value) {
  const bytes = utf8Encoder.encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function base64UrlDecode(value) {
  const standard = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
  const padding =
    standard.length % 4 === 0
      ? ''
      : '='.repeat(4 - (standard.length % 4))
  const binary = atob(standard + padding)
  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0),
  )

  return utf8Decoder.decode(bytes)
}

export function isValidModerationSubmissionId(value) {
  return (
    typeof value === 'string' &&
    SUBMISSION_ID_PATTERN.test(value)
  )
}

export function encodeModerationCursor({
  createdAt,
  id,
}) {
  if (
    !exactIsoTimestamp(createdAt) ||
    !isValidModerationSubmissionId(id)
  ) {
    throw new TypeError(
      'A valid moderation cursor source is required.',
    )
  }

  return base64UrlEncode(
    JSON.stringify({
      createdAt,
      id,
    }),
  )
}

function decodeModerationCursor(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > CURSOR_MAXIMUM_LENGTH ||
    !/^[A-Za-z0-9_-]+$/u.test(value)
  ) {
    fail(
      'invalid_cursor',
      400,
      'The moderation cursor is invalid.',
    )
  }

  let parsed

  try {
    parsed = JSON.parse(base64UrlDecode(value))
  } catch (error) {
    fail(
      'invalid_cursor',
      400,
      'The moderation cursor is invalid.',
      error,
    )
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.keys(parsed).length !== 2 ||
    !Object.hasOwn(parsed, 'createdAt') ||
    !Object.hasOwn(parsed, 'id') ||
    !exactIsoTimestamp(parsed.createdAt) ||
    !isValidModerationSubmissionId(parsed.id)
  ) {
    fail(
      'invalid_cursor',
      400,
      'The moderation cursor is invalid.',
    )
  }

  return {
    createdAt: parsed.createdAt,
    id: parsed.id,
  }
}

function singleQueryValue(searchParams, field) {
  const values = searchParams.getAll(field)

  if (values.length > 1) {
    fail(
      'invalid_query',
      400,
      `The ${field} filter may be provided only once.`,
    )
  }

  return values[0] ?? null
}

export function parseModerationQueueQuery(urlValue) {
  const url =
    urlValue instanceof URL
      ? urlValue
      : new URL(urlValue)

  const allowedFields = new Set([
    'status',
    'type',
    'language',
    'limit',
    'cursor',
  ])

  for (const field of url.searchParams.keys()) {
    if (!allowedFields.has(field)) {
      fail(
        'unknown_query_parameter',
        400,
        `The query parameter ${field} is not supported.`,
      )
    }
  }

  const status =
    singleQueryValue(url.searchParams, 'status') ??
    'pending_review'
  const type =
    singleQueryValue(url.searchParams, 'type')
  const language =
    singleQueryValue(url.searchParams, 'language')
  const limitText =
    singleQueryValue(url.searchParams, 'limit')
  const cursorText =
    singleQueryValue(url.searchParams, 'cursor')

  if (!STATUSES.has(status)) {
    fail(
      'invalid_status',
      400,
      'The moderation status filter is invalid.',
    )
  }

  if (type !== null && !TYPES.has(type)) {
    fail(
      'invalid_submission_type',
      400,
      'The moderation submission-type filter is invalid.',
    )
  }

  if (
    language !== null &&
    !LANGUAGES.has(language)
  ) {
    fail(
      'invalid_language',
      400,
      'The moderation language filter is invalid.',
    )
  }

  let limit = MODERATION_DEFAULT_LIMIT

  if (limitText !== null) {
    if (!/^[1-9]\d*$/u.test(limitText)) {
      fail(
        'invalid_limit',
        400,
        'The moderation page limit is invalid.',
      )
    }

    limit = Number(limitText)

    if (
      !Number.isSafeInteger(limit) ||
      limit > MODERATION_MAXIMUM_LIMIT
    ) {
      fail(
        'invalid_limit',
        400,
        `The moderation page limit cannot exceed ${MODERATION_MAXIMUM_LIMIT}.`,
      )
    }
  }

  return {
    status,
    type,
    language,
    limit,
    cursor:
      cursorText === null
        ? null
        : decodeModerationCursor(cursorText),
  }
}

function contentTypeIsJson(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  const parts = value
    .split(';')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (parts[0] !== 'application/json') {
    return false
  }

  if (parts.length === 1) return true
  if (parts.length !== 2) return false

  return /^charset\s*=\s*"?utf-8"?$/u.test(parts[1])
}

function declaredBodyTooLarge(request) {
  const value = request.headers.get('content-length')

  if (!value || !/^\d+$/u.test(value)) {
    return false
  }

  return Number(value) > MODERATION_BODY_MAX_BYTES
}

async function readUtf8Json(request) {
  if (
    !contentTypeIsJson(
      request.headers.get('content-type') || '',
    )
  ) {
    fail(
      'unsupported_media_type',
      415,
      'Send the moderation action as application/json.',
    )
  }

  if (declaredBodyTooLarge(request)) {
    fail(
      'payload_too_large',
      413,
      `Moderation bodies are limited to ${MODERATION_BODY_MAX_BYTES} bytes.`,
    )
  }

  let buffer

  try {
    buffer = await request.arrayBuffer()
  } catch (error) {
    fail(
      'invalid_payload',
      400,
      'The moderation request body could not be read.',
      error,
    )
  }

  if (buffer.byteLength > MODERATION_BODY_MAX_BYTES) {
    fail(
      'payload_too_large',
      413,
      `Moderation bodies are limited to ${MODERATION_BODY_MAX_BYTES} bytes.`,
    )
  }

  let text

  try {
    text = utf8Decoder.decode(buffer)
  } catch (error) {
    fail(
      'invalid_unicode',
      400,
      'The moderation request body must contain valid UTF-8.',
      error,
    )
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    fail(
      'invalid_json',
      400,
      'The moderation request body must contain valid JSON.',
      error,
    )
  }
}

function requiredOwnString(value, field) {
  if (
    !Object.hasOwn(value, field) ||
    typeof value[field] !== 'string' ||
    value[field].length === 0
  ) {
    fail(
      'invalid_payload',
      400,
      `The moderation field ${field} is required.`,
    )
  }

  return value[field]
}

export async function readModerationActionRequest(
  request,
) {
  const body = await readUtf8Json(request)

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.getPrototypeOf(body) !== Object.prototype
  ) {
    fail(
      'invalid_payload',
      400,
      'The moderation request body must be a plain JSON object.',
    )
  }

  for (const field of Object.keys(body)) {
    if (!ACTION_FIELDS.has(field)) {
      fail(
        'unknown_field',
        400,
        `The moderation field ${field} is not supported.`,
      )
    }
  }

  const action = requiredOwnString(body, 'action')

  if (!MODERATION_ACTIONS.includes(action)) {
    fail(
      'invalid_action',
      400,
      'The moderation action is invalid.',
    )
  }

  const expectedStatus = requiredOwnString(
    body,
    'expectedStatus',
  )

  if (!STATUSES.has(expectedStatus)) {
    fail(
      'invalid_status',
      400,
      'The expected moderation status is invalid.',
    )
  }

  const expectedUpdatedAt = requiredOwnString(
    body,
    'expectedUpdatedAt',
  )

  if (!exactIsoTimestamp(expectedUpdatedAt)) {
    fail(
      'invalid_timestamp',
      400,
      'The expected update timestamp is invalid.',
    )
  }

  const reasonCode = requiredOwnString(
    body,
    'reasonCode',
  )

  if (
    !MODERATION_REASON_CODES[action].includes(
      reasonCode,
    )
  ) {
    fail(
      'invalid_reason_code',
      400,
      'The moderation reason is invalid for this action.',
    )
  }

  if (
    Object.hasOwn(body, 'note') &&
    body.note !== null &&
    typeof body.note !== 'string'
  ) {
    fail(
      'invalid_note',
      400,
      'The private moderation note must be plain text.',
    )
  }

  let note

  try {
    note = normalizePrivateModerationNote(
      Object.hasOwn(body, 'note')
        ? body.note
        : null,
    )
  } catch (error) {
    if (error instanceof ModerationStorageError) {
      fail(
        error.code,
        error.status,
        error.message,
        error,
      )
    }

    throw error
  }

  return {
    action,
    expectedStatus,
    expectedUpdatedAt,
    reasonCode,
    note,
  }
}
