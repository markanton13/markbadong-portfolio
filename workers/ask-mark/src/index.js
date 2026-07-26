import {
  getBootstrap,
  getHealth,
  queryApprovedKnowledge,
} from './lib/knowledge.js'
import {
  errorResponse,
  jsonResponse,
  noContentResponse,
} from './lib/responses.js'

const MAX_MESSAGE_LENGTH = 500

function routeKey(request) {
  const url = new URL(request.url)
  return `${request.method.toUpperCase()} ${url.pathname}`
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

  const result = await queryApprovedKnowledge(env.ASK_MARK_DB, message)

  return jsonResponse(request, result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

async function handleRequest(request, env) {
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
      return errorResponse(
        request,
        404,
        'not_found',
        'The requested Ask Mark endpoint does not exist.',
      )
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
