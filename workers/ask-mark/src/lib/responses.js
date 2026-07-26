const ALLOWED_ORIGINS = new Set([
  'https://markbadong.com',
  'https://www.markbadong.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function responseHeaders(request, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    ...extraHeaders,
  })

  const origin = request.headers.get('origin')

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    headers.set('Access-Control-Max-Age', '600')
    headers.append('Vary', 'Origin')
  }

  return headers
}

export function jsonResponse(request, data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status ?? 200,
    headers: responseHeaders(request, options.headers),
  })
}

export function errorResponse(
  request,
  status,
  code,
  message,
  extraHeaders = {},
) {
  return jsonResponse(
    request,
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...extraHeaders,
      },
    },
  )
}

export function noContentResponse(request) {
  const headers = responseHeaders(request, {
    'Cache-Control': 'no-store',
  })

  headers.delete('Content-Type')

  return new Response(null, {
    status: 204,
    headers,
  })
}
