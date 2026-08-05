import {
  IntakeStorageError,
  storeIntakeSubmission,
} from './intake-storage.js'
import {
  INTAKE_BODY_MAX_BYTES,
  validateIntakeSubmission,
} from './intake-validation.js'
import {
  errorResponse,
  jsonResponse,
} from './responses.js'

export const LOCAL_INTAKE_MODE = 'local-only'
export const INTAKE_WINDOW_MILLISECONDS = 15 * 60 * 1000
export const INTAKE_RETENTION_MILLISECONDS =
  90 * 24 * 60 * 60 * 1000

const MINIMUM_HASH_KEY_LENGTH = 32
const MAXIMUM_REQUESTER_IDENTITY_LENGTH = 200
const textEncoder = new TextEncoder()
const utf8Decoder = new TextDecoder('utf-8', {
  fatal: true,
})

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}

async function sha256Hex(value) {
  return bytesToHex(
    await crypto.subtle.digest(
      'SHA-256',
      textEncoder.encode(value),
    ),
  )
}

async function hmacSha256Hex(keyText, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(keyText),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )

  return bytesToHex(
    await crypto.subtle.sign(
      'HMAC',
      key,
      textEncoder.encode(value),
    ),
  )
}

function localHashKey(env) {
  const value = env?.ASK_MARK_INTAKE_HASH_KEY

  if (
    typeof value !== 'string' ||
    value.length < MINIMUM_HASH_KEY_LENGTH
  ) {
    return null
  }

  return value
}

export function isLocalIntakeEnabled(env) {
  return (
    env?.ASK_MARK_INTAKE_MODE === LOCAL_INTAKE_MODE &&
    localHashKey(env) !== null
  )
}

function normalizedLocalRequester(request) {
  const explicitLocalRequester =
    request.headers.get('x-ask-mark-local-requester')?.trim()

  if (
    explicitLocalRequester &&
    explicitLocalRequester.length <=
      MAXIMUM_REQUESTER_IDENTITY_LENGTH
  ) {
    return `local:${explicitLocalRequester}`
  }

  const connectingIp =
    request.headers.get('cf-connecting-ip')?.trim()

  if (
    connectingIp &&
    connectingIp.length <= MAXIMUM_REQUESTER_IDENTITY_LENGTH
  ) {
    return `cf:${connectingIp}`
  }

  return 'local:shared'
}

function opaqueId(prefix, idFactory) {
  const value = idFactory()

  if (typeof value !== 'string' || !value) {
    throw new TypeError('The intake ID factory returned an invalid ID.')
  }

  return `${prefix}_${value}`
}

function canonicalContent(submission) {
  return [
    submission.type,
    submission.language,
    submission.message,
  ].join('\u0000')
}

export async function createIntakeStorageRecord({
  submission,
  requesterIdentity,
  hashKey,
  nowMilliseconds = Date.now(),
  idFactory = () => crypto.randomUUID(),
}) {
  if (
    !submission ||
    typeof submission !== 'object' ||
    Array.isArray(submission)
  ) {
    throw new TypeError('A validated intake submission is required.')
  }

  if (
    typeof requesterIdentity !== 'string' ||
    !requesterIdentity
  ) {
    throw new TypeError('A requester identity is required.')
  }

  if (
    typeof hashKey !== 'string' ||
    hashKey.length < MINIMUM_HASH_KEY_LENGTH
  ) {
    throw new TypeError('A local intake hashing key is required.')
  }

  if (
    !Number.isFinite(nowMilliseconds) ||
    nowMilliseconds < 0
  ) {
    throw new TypeError('A valid intake timestamp is required.')
  }

  const windowStartedMilliseconds =
    Math.floor(
      nowMilliseconds / INTAKE_WINDOW_MILLISECONDS,
    ) * INTAKE_WINDOW_MILLISECONDS

  const windowExpiresMilliseconds =
    windowStartedMilliseconds + INTAKE_WINDOW_MILLISECONDS

  const createdAt = new Date(nowMilliseconds).toISOString()
  const windowStartedAt =
    new Date(windowStartedMilliseconds).toISOString()
  const windowExpiresAt =
    new Date(windowExpiresMilliseconds).toISOString()
  const submissionExpiresAt = new Date(
    nowMilliseconds + INTAKE_RETENTION_MILLISECONDS,
  ).toISOString()

  const contentHash = await sha256Hex(
    canonicalContent(submission),
  )

  const bucketHash = await hmacSha256Hex(
    hashKey,
    `bucket:v1\u0000${requesterIdentity}`,
  )

  const deduplicationHash = await hmacSha256Hex(
    hashKey,
    [
      'dedup:v1',
      requesterIdentity,
      windowStartedAt,
      contentHash,
    ].join('\u0000'),
  )

  return {
    submissionId: opaqueId('submission', idFactory),
    receivedEventId: opaqueId('event', idFactory),
    queuedEventId: opaqueId('event', idFactory),
    type: submission.type,
    language: submission.language,
    message: submission.message,
    contentHash,
    deduplicationHash,
    bucketHash,
    windowStartedAt,
    windowExpiresAt,
    submissionExpiresAt,
    createdAt,
  }
}

function contentLengthExceedsLimit(request) {
  const contentLength = request.headers.get('content-length')

  if (!contentLength || !/^\d+$/u.test(contentLength)) {
    return false
  }

  return Number(contentLength) > INTAKE_BODY_MAX_BYTES
}

async function readUtf8Body(request) {
  if (contentLengthExceedsLimit(request)) {
    return {
      ok: false,
      response: errorResponse(
        request,
        413,
        'payload_too_large',
        `Request bodies are limited to ${INTAKE_BODY_MAX_BYTES} bytes.`,
      ),
    }
  }

  let bodyBuffer

  try {
    bodyBuffer = await request.arrayBuffer()
  } catch {
    return {
      ok: false,
      response: errorResponse(
        request,
        400,
        'invalid_payload',
        'The request body could not be read.',
      ),
    }
  }

  if (bodyBuffer.byteLength > INTAKE_BODY_MAX_BYTES) {
    return {
      ok: false,
      response: errorResponse(
        request,
        413,
        'payload_too_large',
        `Request bodies are limited to ${INTAKE_BODY_MAX_BYTES} bytes.`,
      ),
    }
  }

  try {
    return {
      ok: true,
      rawBody: utf8Decoder.decode(bodyBuffer),
    }
  } catch {
    return {
      ok: false,
      response: errorResponse(
        request,
        400,
        'invalid_unicode',
        'The request body must contain valid UTF-8.',
      ),
    }
  }
}

export async function handleLocalIntakeSubmission(
  request,
  env,
  options = {},
) {
  if (!isLocalIntakeEnabled(env)) {
    return errorResponse(
      request,
      404,
      'not_found',
      'The requested Ask Mark endpoint does not exist.',
    )
  }

  const decodedBody = await readUtf8Body(request)

  if (!decodedBody.ok) {
    return decodedBody.response
  }

  const validation = validateIntakeSubmission({
    contentType: request.headers.get('content-type') || '',
    rawBody: decodedBody.rawBody,
  })

  if (!validation.ok) {
    return errorResponse(
      request,
      validation.error.status,
      validation.error.code,
      validation.error.message,
    )
  }

  const nowMilliseconds =
    options.nowMilliseconds ?? Date.now()

  const record = await createIntakeStorageRecord({
    submission: validation.value,
    requesterIdentity: normalizedLocalRequester(request),
    hashKey: localHashKey(env),
    nowMilliseconds,
    idFactory:
      options.idFactory ?? (() => crypto.randomUUID()),
  })

  try {
    const stored = await storeIntakeSubmission(
      env.ASK_MARK_DB,
      record,
    )

    return jsonResponse(
      request,
      {
        ok: true,
        submission: stored,
      },
      {
        status: 202,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    if (!(error instanceof IntakeStorageError)) throw error

    const extraHeaders =
      error.code === 'rate_limited'
        ? {
            'Retry-After': String(
              Math.max(
                1,
                Math.ceil(
                  (
                    Date.parse(record.windowExpiresAt) -
                    nowMilliseconds
                  ) / 1000,
                ),
              ),
            ),
          }
        : {}

    return errorResponse(
      request,
      error.status,
      error.code,
      error.message,
      extraHeaders,
    )
  }
}
