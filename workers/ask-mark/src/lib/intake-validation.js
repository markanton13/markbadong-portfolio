export const INTAKE_BODY_MAX_BYTES = 4096
export const INTAKE_MESSAGE_MIN_CODE_POINTS = 10
export const INTAKE_MESSAGE_MAX_CODE_POINTS = 1000

export const INTAKE_SUBMISSION_TYPES = Object.freeze([
  'question',
  'correction',
  'feedback',
])

export const INTAKE_LANGUAGES = Object.freeze([
  'en',
  'tl',
  'taglish',
])

const allowedFields = Object.freeze([
  'language',
  'message',
  'type',
])

const submissionTypeSet = new Set(INTAKE_SUBMISSION_TYPES)
const languageSet = new Set(INTAKE_LANGUAGES)
const textEncoder = new TextEncoder()

function failure(status, code, message) {
  return {
    ok: false,
    error: {
      status,
      code,
      message,
    },
  }
}

function success(value) {
  return {
    ok: true,
    value,
  }
}

function parseJsonMediaType(contentType) {
  if (typeof contentType !== 'string') return false

  const segments = contentType
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) return false
  if (segments[0].toLowerCase() !== 'application/json') return false
  if (segments.length === 1) return true
  if (segments.length !== 2) return false

  const parameter = segments[1].split('=')

  if (parameter.length !== 2) return false

  const name = parameter[0].trim().toLowerCase()
  const value = parameter[1].trim().replace(/^"(.*)"$/, '$1').toLowerCase()

  return name === 'charset' && value === 'utf-8'
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1)

      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
        return true
      }

      index += 1
      continue
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true
    }
  }

  return false
}

function hasForbiddenControl(value) {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(
    value,
  )
}

function normalizeMessage(value) {
  return value
    .replace(/\r\n?/gu, '\n')
    .replace(/\t/gu, ' ')
    .normalize('NFKC')
    .trim()
}

function scanJsonString(source, startIndex) {
  let index = startIndex + 1

  while (index < source.length) {
    const character = source[index]

    if (character === '"') {
      return index + 1
    }

    if (character === '\\') {
      index += 1

      if (index >= source.length) {
        return -1
      }

      if (source[index] === 'u') {
        const escape = source.slice(index + 1, index + 5)

        if (!/^[0-9a-fA-F]{4}$/u.test(escape)) {
          return -1
        }

        index += 4
      }
    }

    index += 1
  }

  return -1
}

function decodeJsonStringToken(token) {
  try {
    return JSON.parse(token)
  } catch {
    return null
  }
}

function findDuplicateTopLevelKey(source) {
  let index = 0
  let depth = 0
  let expectingTopLevelKey = false
  const keys = new Set()

  while (index < source.length) {
    const character = source[index]

    if (/\s/u.test(character)) {
      index += 1
      continue
    }

    if (character === '{') {
      depth += 1

      if (depth === 1) {
        expectingTopLevelKey = true
      }

      index += 1
      continue
    }

    if (character === '}') {
      depth -= 1
      index += 1
      continue
    }

    if (character === ',' && depth === 1) {
      expectingTopLevelKey = true
      index += 1
      continue
    }

    if (character === ':' && depth === 1) {
      expectingTopLevelKey = false
      index += 1
      continue
    }

    if (character === '"') {
      const endIndex = scanJsonString(source, index)

      if (endIndex === -1) return null

      if (depth === 1 && expectingTopLevelKey) {
        const token = source.slice(index, endIndex)
        const key = decodeJsonStringToken(token)

        if (typeof key !== 'string') return null
        if (keys.has(key)) return key

        keys.add(key)
      }

      index = endIndex
      continue
    }

    index += 1
  }

  return null
}

function isPlainJsonObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function hasExactFields(value) {
  const actualFields = Object.keys(value).sort()

  return (
    actualFields.length === allowedFields.length &&
    actualFields.every(
      (field, index) => field === allowedFields[index],
    )
  )
}

function hasNestedValue(value) {
  return Object.values(value).some(
    (fieldValue) =>
      fieldValue !== null &&
      typeof fieldValue === 'object',
  )
}

export function validateIntakeSubmission({
  contentType,
  rawBody,
} = {}) {
  if (!parseJsonMediaType(contentType)) {
    return failure(
      415,
      'unsupported_media_type',
      'Send the request body as application/json.',
    )
  }

  if (typeof rawBody !== 'string') {
    return failure(
      400,
      'invalid_payload',
      'The request body must be a JSON text value.',
    )
  }

  const bodyBytes = textEncoder.encode(rawBody).byteLength

  if (bodyBytes > INTAKE_BODY_MAX_BYTES) {
    return failure(
      413,
      'payload_too_large',
      `Request bodies are limited to ${INTAKE_BODY_MAX_BYTES} bytes.`,
    )
  }

  const duplicateKey = findDuplicateTopLevelKey(rawBody)

  if (duplicateKey !== null) {
    return failure(
      400,
      'duplicate_field',
      'Duplicate request fields are not allowed.',
    )
  }

  let body

  try {
    body = JSON.parse(rawBody)
  } catch {
    return failure(
      400,
      'invalid_json',
      'The request body must contain valid JSON.',
    )
  }

  if (!isPlainJsonObject(body) || hasNestedValue(body)) {
    return failure(
      400,
      'invalid_payload',
      'The request body must be a flat JSON object.',
    )
  }

  const actualFields = Object.keys(body)

  if (!hasExactFields(body)) {
    const hasUnknownField = actualFields.some(
      (field) => !allowedFields.includes(field),
    )

    return failure(
      400,
      hasUnknownField ? 'unknown_field' : 'invalid_payload',
      hasUnknownField
        ? 'Unknown request fields are not allowed.'
        : 'The request must include type, language, and message.',
    )
  }

  if (
    typeof body.type !== 'string' ||
    !submissionTypeSet.has(body.type)
  ) {
    return failure(
      400,
      'invalid_submission_type',
      'Submission type must be question, correction, or feedback.',
    )
  }

  if (
    typeof body.language !== 'string' ||
    !languageSet.has(body.language)
  ) {
    return failure(
      400,
      'invalid_language',
      'Language must be en, tl, or taglish.',
    )
  }

  if (typeof body.message !== 'string') {
    return failure(
      400,
      'message_required',
      'A plain-text message is required.',
    )
  }

  if (
    hasUnpairedSurrogate(body.message) ||
    hasForbiddenControl(body.message)
  ) {
    return failure(
      400,
      'invalid_unicode',
      'The message contains invalid Unicode or control characters.',
    )
  }

  const message = normalizeMessage(body.message)

  if (!message) {
    return failure(
      400,
      'message_required',
      'A non-empty message is required.',
    )
  }

  const messageCodePoints = Array.from(message).length

  if (messageCodePoints < INTAKE_MESSAGE_MIN_CODE_POINTS) {
    return failure(
      400,
      'message_too_short',
      `Messages must contain at least ${INTAKE_MESSAGE_MIN_CODE_POINTS} characters.`,
    )
  }

  if (messageCodePoints > INTAKE_MESSAGE_MAX_CODE_POINTS) {
    return failure(
      413,
      'message_too_long',
      `Messages are limited to ${INTAKE_MESSAGE_MAX_CODE_POINTS} characters.`,
    )
  }

  return success({
    type: body.type,
    language: body.language,
    message,
    bodyBytes,
    messageCodePoints,
  })
}
