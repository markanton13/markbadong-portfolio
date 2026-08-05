const LOCAL_MODERATION_MODE =
  'askmark-moderation'
const LOCAL_MODERATION_URL =
  'http://127.0.0.1:8787'
const MODERATION_PATH =
  '/v1/admin/intake/submissions'
const ADMIN_HEADER =
  'X-Ask-Mark-Local-Admin-Key'
const REQUEST_TIMEOUT_MILLISECONDS = 12_000

export class ModerationClientError extends Error {
  constructor({
    code,
    status,
    message,
    cause,
  }) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ModerationClientError'
    this.code = code
    this.status = status
  }
}

function fail(
  code,
  status,
  message,
  cause,
) {
  throw new ModerationClientError({
    code,
    status,
    message,
    cause,
  })
}

function safeLocalBaseUrl(value) {
  let parsed

  try {
    parsed = new URL(value)
  } catch {
    return null
  }

  const loopback =
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === 'localhost'

  if (
    parsed.protocol !== 'http:' ||
    !loopback ||
    parsed.port !== '8787' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    return null
  }

  return parsed.origin
}

export function resolveModerationConfig(
  environment,
) {
  if (
    environment?.DEV !== true ||
    environment?.MODE !==
      LOCAL_MODERATION_MODE
  ) {
    return {
      enabled: false,
      baseUrl: null,
    }
  }

  const configured =
    typeof environment
      ?.VITE_ASK_MARK_MODERATION_API_URL ===
      'string'
      ? environment
          .VITE_ASK_MARK_MODERATION_API_URL
          .trim()
      : LOCAL_MODERATION_URL

  const baseUrl = safeLocalBaseUrl(configured)

  return {
    enabled: baseUrl !== null,
    baseUrl,
  }
}

function encodeFilters(filters) {
  const parameters = new URLSearchParams()

  for (const field of [
    'status',
    'type',
    'language',
    'limit',
    'cursor',
  ]) {
    const value = filters?.[field]

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      parameters.set(field, String(value))
    }
  }

  const query = parameters.toString()

  return query ? `?${query}` : ''
}

function validateSubmissionId(value) {
  if (
    typeof value !== 'string' ||
    !/^submission_[A-Za-z0-9-]{1,180}$/u.test(
      value,
    )
  ) {
    throw new TypeError(
      'A valid moderation submission ID is required.',
    )
  }

  return value
}

function normalizeClientError(error) {
  if (error instanceof ModerationClientError) {
    return error
  }

  if (error?.name === 'AbortError') {
    return new ModerationClientError({
      code: 'request_timeout',
      status: 0,
      message:
        'The local moderation request timed out.',
      cause: error,
    })
  }

  return new ModerationClientError({
    code: 'network_error',
    status: 0,
    message:
      'The local moderation service could not be reached.',
    cause: error,
  })
}

export function createModerationClient({
  baseUrl,
  adminKey,
  fetchImpl = fetch,
}) {
  const safeBaseUrl = safeLocalBaseUrl(baseUrl)

  if (!safeBaseUrl) {
    throw new TypeError(
      'A loopback moderation API URL is required.',
    )
  }

  if (
    typeof adminKey !== 'string' ||
    adminKey.length < 32
  ) {
    throw new TypeError(
      'A local moderation key of at least 32 characters is required.',
    )
  }

  async function request(
    path,
    {
      method = 'GET',
      body,
    } = {},
  ) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MILLISECONDS,
    )

    try {
      const response = await fetchImpl(
        `${safeBaseUrl}${path}`,
        {
          method,
          headers: {
            Accept: 'application/json',
            [ADMIN_HEADER]: adminKey,
            ...(body === undefined
              ? {}
              : {
                  'Content-Type':
                    'application/json; charset=utf-8',
                }),
          },
          body:
            body === undefined
              ? undefined
              : JSON.stringify(body),
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        },
      )

      let payload

      try {
        payload = await response.json()
      } catch (error) {
        fail(
          'invalid_response',
          response.status,
          'The moderation service returned an invalid response.',
          error,
        )
      }

      if (
        !response.ok ||
        payload?.ok !== true
      ) {
        fail(
          payload?.error?.code ||
            'request_failed',
          response.status,
          payload?.error?.message ||
            'The moderation request failed.',
        )
      }

      return payload
    } catch (error) {
      throw normalizeClientError(error)
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    async list(filters = {}) {
      return request(
        `${MODERATION_PATH}${encodeFilters(filters)}`,
      )
    },

    async detail(submissionId) {
      return request(
        `${MODERATION_PATH}/${encodeURIComponent(
          validateSubmissionId(
            submissionId,
          ),
        )}`,
      )
    },

    async act(
      submissionId,
      action,
    ) {
      return request(
        `${MODERATION_PATH}/${encodeURIComponent(
          validateSubmissionId(
            submissionId,
          ),
        )}/actions`,
        {
          method: 'POST',
          body: action,
        },
      )
    },
  }
}
