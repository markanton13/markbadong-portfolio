const DEFAULT_TIMEOUT_MS = 5000
const LOCAL_INTAKE_MODE = 'local-only'
const LOCAL_INTAKE_PORT = '8787'
const INTAKE_BODY_MAX_BYTES = 4096

export const ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS = 10
export const ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS = 1000

export const ASK_MARK_INTAKE_TYPES = Object.freeze([
  'question',
  'correction',
  'feedback',
])

export const ASK_MARK_INTAKE_LANGUAGES = Object.freeze([
  'en',
  'tl',
  'taglish',
])

const LOOPBACK_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '[::1]',
])

const KNOWN_SERVER_ERROR_CODES = new Set([
  'invalid_json',
  'invalid_payload',
  'unknown_field',
  'duplicate_field',
  'invalid_submission_type',
  'invalid_language',
  'message_required',
  'message_too_short',
  'invalid_unicode',
  'method_not_allowed',
  'payload_too_large',
  'message_too_long',
  'unsupported_media_type',
  'duplicate_submission',
  'rate_limited',
  'service_unavailable',
])

const submissionTypeSet = new Set(ASK_MARK_INTAKE_TYPES)
const languageSet = new Set(ASK_MARK_INTAKE_LANGUAGES)
const textEncoder = new TextEncoder()

function failure(
  code,
  status = 0,
  retryAfterSeconds = null,
) {
  return {
    ok: false,
    error: {
      code,
      status,
      retryAfterSeconds,
    },
  }
}

function normalizeMessage(value) {
  return value
    .replace(/\r\n?/gu, '\n')
    .replace(/\t/gu, ' ')
    .normalize('NFKC')
    .trim()
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
  for (const character of value) {
    const codePoint = character.codePointAt(0)

    if (
      codePoint <= 0x08 ||
      (codePoint >= 0x0b && codePoint <= 0x0c) ||
      (codePoint >= 0x0e && codePoint <= 0x1f) ||
      (codePoint >= 0x7f && codePoint <= 0x9f)
    ) {
      return true
    }
  }

  return false
}

function hasExactSubmissionFields(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false
  }

  const fields = Object.keys(value).sort()

  return (
    fields.length === 3 &&
    fields[0] === 'language' &&
    fields[1] === 'message' &&
    fields[2] === 'type'
  )
}

export function countAskMarkIntakeCodePoints(value) {
  if (typeof value !== 'string') return 0

  return Array.from(normalizeMessage(value)).length
}

export function prepareAskMarkIntakeSubmission(value) {
  if (!hasExactSubmissionFields(value)) {
    return failure('invalid_payload')
  }

  if (
    typeof value.type !== 'string' ||
    !submissionTypeSet.has(value.type)
  ) {
    return failure('invalid_submission_type')
  }

  if (
    typeof value.language !== 'string' ||
    !languageSet.has(value.language)
  ) {
    return failure('invalid_language')
  }

  if (typeof value.message !== 'string') {
    return failure('message_required')
  }

  if (
    hasUnpairedSurrogate(value.message) ||
    hasForbiddenControl(value.message)
  ) {
    return failure('invalid_unicode')
  }

  const message = normalizeMessage(value.message)

  if (!message) {
    return failure('message_required')
  }

  const messageCodePoints = Array.from(message).length

  if (
    messageCodePoints <
    ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS
  ) {
    return failure('message_too_short')
  }

  if (
    messageCodePoints >
    ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS
  ) {
    return failure('message_too_long')
  }

  const submission = {
    type: value.type,
    language: value.language,
    message,
  }

  const body = JSON.stringify(submission)
  const bodyBytes = textEncoder.encode(body).byteLength

  if (bodyBytes > INTAKE_BODY_MAX_BYTES) {
    return failure('payload_too_large')
  }

  return {
    ok: true,
    value: {
      submission,
      body,
      bodyBytes,
      messageCodePoints,
    },
  }
}

export function resolveAskMarkIntakeConfig(
  environment = import.meta.env,
) {
  const mode =
    typeof environment?.VITE_ASK_MARK_INTAKE_MODE === 'string'
      ? environment.VITE_ASK_MARK_INTAKE_MODE.trim()
      : ''

  const configuredUrl =
    typeof environment?.VITE_ASK_MARK_API_BASE_URL === 'string'
      ? environment.VITE_ASK_MARK_API_BASE_URL.trim()
      : ''

  if (
    environment?.DEV !== true ||
    mode !== LOCAL_INTAKE_MODE ||
    !configuredUrl
  ) {
    return {
      enabled: false,
      baseUrl: null,
    }
  }

  try {
    const url = new URL(configuredUrl)

    const isAllowedLocalUrl =
      url.protocol === 'http:' &&
      LOOPBACK_HOSTS.has(url.hostname) &&
      url.port === LOCAL_INTAKE_PORT &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''

    if (!isAllowedLocalUrl) {
      return {
        enabled: false,
        baseUrl: null,
      }
    }

    return {
      enabled: true,
      baseUrl: url.toString().replace(/\/+$/u, ''),
    }
  } catch {
    return {
      enabled: false,
      baseUrl: null,
    }
  }
}

function safeRetryAfterSeconds(response) {
  const value = response.headers.get('retry-after')

  if (!value || !/^\d+$/u.test(value)) return null

  const seconds = Number(value)

  if (
    !Number.isSafeInteger(seconds) ||
    seconds < 1 ||
    seconds > 900
  ) {
    return null
  }

  return seconds
}

async function safeResponsePayload(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function mappedServerError(response, payload) {
  const code =
    typeof payload?.error?.code === 'string' &&
    KNOWN_SERVER_ERROR_CODES.has(payload.error.code)
      ? payload.error.code
      : 'unexpected_response'

  return failure(
    code,
    response.status,
    code === 'rate_limited'
      ? safeRetryAfterSeconds(response)
      : null,
  )
}

export async function submitAskMarkIntake(
  submission,
  {
    environment = import.meta.env,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const config = resolveAskMarkIntakeConfig(environment)

  if (!config.enabled || typeof fetchImpl !== 'function') {
    return failure('intake_unavailable')
  }

  const prepared = prepareAskMarkIntakeSubmission(submission)

  if (!prepared.ok) {
    return prepared
  }

  const safeTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    safeTimeoutMs,
  )

  try {
    const response = await fetchImpl(
      `${config.baseUrl}/v1/intake/submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: prepared.value.body,
        signal: controller.signal,
      },
    )

    const payload = await safeResponsePayload(response)

    if (
      response.status === 202 &&
      response.ok &&
      payload?.ok === true &&
      typeof payload?.submission?.id === 'string' &&
      payload.submission.id.trim() &&
      payload.submission.status === 'pending_review'
    ) {
      return {
        ok: true,
        submission: {
          id: payload.submission.id.trim(),
          status: 'pending_review',
        },
      }
    }

    return mappedServerError(response, payload)
  } catch {
    return failure(
      controller.signal.aborted
        ? 'request_timed_out'
        : 'intake_unavailable',
    )
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}
