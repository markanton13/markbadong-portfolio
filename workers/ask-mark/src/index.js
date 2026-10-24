import {
  getBootstrap,
  getHealth,
  queryApprovedKnowledge,
} from './lib/knowledge.js'
import { generateGroundedAnswer } from './lib/kilo-gateway.js'
import {
  handleLocalIntakeSubmission,
  isLocalIntakeEnabled,
} from './lib/intake.js'
import {
  handleLocalModerationRequest,
  isLocalModerationEnabled,
  isModerationPath,
} from './lib/moderation.js'
import {
  errorResponse,
  jsonResponse,
  noContentResponse,
} from './lib/responses.js'

const MAX_MESSAGE_LENGTH = 500
const LOCAL_AI_DIAGNOSTIC_CODES = new Set([
  'ai_disabled',
  'no_approved_evidence',
  'sensitive_input',
  'input_rejected',
  'request_aborted',
  'provider_timeout',
  'provider_http_error',
  'provider_content_filtered',
  'provider_transport_error',
  'provider_invalid_response',
  'provider_non_json',
  'provider_unexpected_content_type',
  'provider_missing_choices',
  'provider_empty_choices',
  'provider_empty_content',
  'provider_invalid_message_shape',
  'provider_incomplete_generation',
  'model_mismatch',
  'output_not_grounded',
  'output_too_large',
  'model_answer_accepted',
  'catalog_unavailable',
  'catalog_timeout',
  'catalog_http_error',
  'catalog_network_error',
  'catalog_invalid_response',
  'catalog_schema_mismatch',
  'catalog_no_approved_free_model',
  'total_request_timeout',
])

function routeKey(request) {
  const url = new URL(request.url)
  return `${request.method.toUpperCase()} ${url.pathname}`
}

function notFoundResponse(request) {
  return errorResponse(
    request,
    404,
    'not_found',
    'The requested Ask Mark endpoint does not exist.',
  )
}

function isLoopbackHost(requestUrl) {
  try {
    return ['127.0.0.1', 'localhost', '[::1]'].includes(
      new URL(requestUrl).hostname,
    )
  } catch {
    return false
  }
}

export function reportLocalAiDiagnostic(request, event) {
  if (!isLoopbackHost(request.url)) return
  if (!LOCAL_AI_DIAGNOSTIC_CODES.has(event?.code)) return
  const safeEvent = {
    code: event.code,
    providerCallAttempted: event.providerCallAttempted === true,
  }
  if (Number.isFinite(event.elapsedMs)) {
    safeEvent.elapsedMs = Math.min(60_000, Math.max(0, Math.round(event.elapsedMs)))
  }
  if (Number.isFinite(event.overallElapsedMs)) {
    safeEvent.overallElapsedMs = Math.min(60_000, Math.max(0, Math.round(event.overallElapsedMs)))
  }
  if (event.usageMetadataInconsistent === true) safeEvent.usageMetadataInconsistent = true
  for (const field of ['completionTokens', 'reasoningTokens']) {
    if (Number.isInteger(event[field]) && event[field] >= 0 && event[field] <= 1_000_000) {
      safeEvent[field] = event[field]
    }
  }
  if (Number.isInteger(event.httpStatus) && event.httpStatus >= 100 && event.httpStatus <= 599) {
    safeEvent.httpStatus = event.httpStatus
  }
  for (const field of ['httpStatusReceived', 'responseHeadersReceived']) {
    if (typeof event[field] === 'boolean') safeEvent[field] = event[field]
  }
  if (['attempt_deadline', 'adapter_deadline'].includes(event.timeoutSource)) {
    safeEvent.timeoutSource = event.timeoutSource
  }
  if (event.abortSource === 'client_request') safeEvent.abortSource = event.abortSource
  if (Number.isInteger(event.attemptNumber) && event.attemptNumber >= 1 && event.attemptNumber <= 2) {
    safeEvent.attemptNumber = event.attemptNumber
  }
  if (['nvidia/nemotron-3.5-super-vl:free', 'dots-studio/dots-3-note-preview:free'].includes(event.modelId)) {
    safeEvent.modelId = event.modelId
  }
  if (Number.isInteger(event.choicesCount) && event.choicesCount >= 0 && event.choicesCount <= 1_000) {
    safeEvent.choicesCount = event.choicesCount
  }
  if (['application/json', 'application/problem+json', 'text/event-stream', 'text/plain', 'missing', 'other'].includes(event.contentType)) {
    safeEvent.contentType = event.contentType
  }
  if (['stop', 'length', 'tool_calls', 'content_filter'].includes(event.finishReason)) {
    safeEvent.finishReason = event.finishReason
  }
  console.info(`ASK_MARK_LOCAL_AI_DIAGNOSTIC ${JSON.stringify(safeEvent)}`)
}

export function isLocalGenerativeRequest(request, env, body) {
  return (
    body?.generative === true &&
    env?.ASK_MARK_AI_MODE === 'local-only' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(
      new URL(request.url).hostname,
    )
  )
}

async function handleQuery(request, env) {
  const contentType = request.headers.get('content-type') || ''

  if (!contentType.toLowerCase().includes('application/json')) {
    return errorResponse(
      request,
      415,
      'unsupported_media_type',
      'Send the request body as application/json.',
    )
  }

  let body

  try {
    body = await request.json()
  } catch {
    return errorResponse(
      request,
      400,
      'invalid_json',
      'The request body must contain valid JSON.',
    )
  }

  const message =
    typeof body?.message === 'string' ? body.message.trim() : ''

  if (!message) {
    return errorResponse(
      request,
      400,
      'message_required',
      'A non-empty message is required.',
    )
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return errorResponse(
      request,
      413,
      'message_too_long',
      `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
    )
  }

  const localAiRequested = isLocalGenerativeRequest(request, env, body)
  const localGenerativeAttempt =
    body?.generative === true && isLoopbackHost(request.url)
  if (localGenerativeAttempt && !localAiRequested) {
    reportLocalAiDiagnostic(request, {
      code: 'ai_disabled',
      providerCallAttempted: false,
    })
  }
  const result = await queryApprovedKnowledge(
    env.ASK_MARK_DB,
    message,
    {
      contextKey: localAiRequested ? body?.contextKey : null,
      contextKeys: localAiRequested ? body?.contextKeys : [],
    },
  )
  let responsePayload = result

  if (localAiRequested) {
    const evidence = result.matched
      ? (Array.isArray(result.items) ? result.items : [result.item]).filter(Boolean)
      : []
    const publicResult = result
    if (!evidence.length && !result.clarificationRequired) {
      reportLocalAiDiagnostic(request, {
        code: 'no_approved_evidence',
        providerCallAttempted: false,
      })
    }
    const answer = evidence.length
      ? await generateGroundedAnswer({
          question: message,
          evidence: evidence.map((item) => ({ title: item.title, answer: item.answer })),
          env,
          requestUrl: request.url,
          requestSignal: request.signal,
          onDiagnostic: (event) => reportLocalAiDiagnostic(request, event),
        })
      : null

    if (answer) {
      responsePayload = {
        ...publicResult,
        matched: true,
        mode: 'kilo-local',
        answer,
        item: evidence[0],
        items: evidence,
        actions: evidence.flatMap((item) => item.actions || []).length
          ? evidence.flatMap((item) => item.actions || [])
          : result.actions,
      }
    } else {
      responsePayload = publicResult
    }
  }

  return jsonResponse(request, responsePayload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

async function handleRequest(request, env) {
  if (
    isModerationPath(request) &&
    isLocalModerationEnabled(env)
  ) {
    return handleLocalModerationRequest(request, env)
  }

  if (request.method.toUpperCase() === 'OPTIONS') {
    return noContentResponse(request)
  }

  switch (routeKey(request)) {
    case 'GET /v1/health':
      return jsonResponse(request, await getHealth(env.ASK_MARK_DB), {
        headers: {
          'Cache-Control': 'no-store',
        },
      })

    case 'GET /v1/bootstrap':
      return jsonResponse(request, await getBootstrap(env.ASK_MARK_DB), {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      })

    case 'POST /v1/query':
      return handleQuery(request, env)

    case 'POST /v1/intake/submissions':
      return isLocalIntakeEnabled(env)
        ? handleLocalIntakeSubmission(request, env)
        : notFoundResponse(request)

    case 'GET /v1/intake/submissions':
      if (!isLocalIntakeEnabled(env)) {
        return notFoundResponse(request)
      }

      return errorResponse(
        request,
        405,
        'method_not_allowed',
        'That HTTP method is not supported for this endpoint.',
        {
          Allow: 'POST, OPTIONS',
        },
      )

    case 'GET /v1/query':
    case 'POST /v1/health':
    case 'POST /v1/bootstrap':
      return errorResponse(
        request,
        405,
        'method_not_allowed',
        'That HTTP method is not supported for this endpoint.',
        {
          Allow:
            new URL(request.url).pathname === '/v1/query'
              ? 'POST, OPTIONS'
              : 'GET, OPTIONS',
        },
      )

    default:
      return notFoundResponse(request)
  }
}

export default {
  async fetch(request, env) {
    try {
      if (!env?.ASK_MARK_DB) {
        throw new Error('ASK_MARK_DB binding is unavailable.')
      }

      return await handleRequest(request, env)
    } catch (error) {
      console.error('Ask Mark Worker request failed.', {
        route: new URL(request.url).pathname,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return errorResponse(
        request,
        503,
        'service_unavailable',
        'Ask Mark knowledge is temporarily unavailable. The portfolio fallback should remain active.',
      )
    }
  },
}
