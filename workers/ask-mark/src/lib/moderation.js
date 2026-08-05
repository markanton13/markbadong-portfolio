import {
  ModerationStorageError,
  transitionIntakeSubmission,
} from './moderation-storage.js'
import {
  ModerationRequestError,
  encodeModerationCursor,
  isValidModerationSubmissionId,
  parseModerationQueueQuery,
  readModerationActionRequest,
} from './moderation-validation.js'
import {
  errorResponse,
} from './responses.js'

export const LOCAL_MODERATION_MODE = 'local-only'
export const LOCAL_MODERATION_ADMIN_HEADER =
  'X-Ask-Mark-Local-Admin-Key'

const MINIMUM_KEY_LENGTH = 32
const LOCAL_ADMIN_ACTOR_ID = 'local-admin:mark'
const ADMIN_ORIGINS = new Set([
  'http://localhost:5174',
  'http://127.0.0.1:5174',
])
const textEncoder = new TextEncoder()

function moderationKey(env) {
  const value = env?.ASK_MARK_MODERATION_KEY

  if (
    typeof value !== 'string' ||
    value.length < MINIMUM_KEY_LENGTH
  ) {
    return null
  }

  return value
}

export function isLocalModerationEnabled(env) {
  return (
    env?.ASK_MARK_MODERATION_MODE ===
      LOCAL_MODERATION_MODE &&
    moderationKey(env) !== null
  )
}

export function isModerationPath(request) {
  const pathname = new URL(request.url).pathname

  return (
    pathname === '/v1/admin/intake/submissions' ||
    pathname.startsWith(
      '/v1/admin/intake/submissions/',
    )
  )
}

function allowedAdminOrigin(request) {
  const origin = request.headers.get('origin')

  return (
    typeof origin === 'string' &&
    ADMIN_ORIGINS.has(origin)
  )
}

function appendVary(headers, value) {
  const current = headers.get('Vary')

  if (!current) {
    headers.set('Vary', value)
    return
  }

  const values = new Set(
    current
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )

  values.add(value)
  headers.set('Vary', Array.from(values).join(', '))
}

function adminHeaders(request, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })

  appendVary(headers, 'Origin')

  if (allowedAdminOrigin(request)) {
    const origin = request.headers.get('origin')

    headers.set('Access-Control-Allow-Origin', origin)
    headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS',
    )
    headers.set(
      'Access-Control-Allow-Headers',
      [
        'Content-Type',
        LOCAL_MODERATION_ADMIN_HEADER,
      ].join(', '),
    )
    headers.set('Access-Control-Max-Age', '600')
  }

  return headers
}

function adminJsonResponse(
  request,
  data,
  options = {},
) {
  return new Response(JSON.stringify(data), {
    status: options.status ?? 200,
    headers: adminHeaders(
      request,
      options.headers,
    ),
  })
}

function adminErrorResponse(
  request,
  status,
  code,
  message,
  extraHeaders = {},
) {
  return adminJsonResponse(
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
      headers: extraHeaders,
    },
  )
}

function adminPreflightResponse(request) {
  const headers = adminHeaders(request)
  headers.delete('Content-Type')

  return new Response(null, {
    status: 204,
    headers,
  })
}

async function digest(value) {
  return new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      textEncoder.encode(value),
    ),
  )
}

async function constantTimeKeyMatches(
  supplied,
  expected,
) {
  const [suppliedDigest, expectedDigest] =
    await Promise.all([
      digest(supplied),
      digest(expected),
    ])

  let difference = 0

  for (
    let index = 0;
    index < expectedDigest.length;
    index += 1
  ) {
    difference |=
      suppliedDigest[index] ^
      expectedDigest[index]
  }

  return difference === 0
}

async function authorizeLocalAdmin(request, env) {
  const supplied =
    request.headers.get(
      'x-ask-mark-local-admin-key',
    )

  if (!supplied) {
    return {
      ok: false,
      response: adminErrorResponse(
        request,
        401,
        'admin_auth_required',
        'A local moderation key is required.',
      ),
    }
  }

  const accepted = await constantTimeKeyMatches(
    supplied,
    moderationKey(env),
  )

  if (!accepted) {
    return {
      ok: false,
      response: adminErrorResponse(
        request,
        403,
        'admin_auth_invalid',
        'The local moderation key is invalid.',
      ),
    }
  }

  return {
    ok: true,
  }
}

function validateDatabase(db) {
  if (
    !db ||
    typeof db.prepare !== 'function'
  ) {
    throw new TypeError(
      'A D1 database binding is required.',
    )
  }
}

function statementWithBindings(
  db,
  sql,
  bindings,
) {
  const statement = db.prepare(sql)

  return bindings.length > 0
    ? statement.bind(...bindings)
    : statement
}

function moderationPreview(value) {
  const characters = Array.from(value || '')

  if (characters.length <= 160) {
    return characters.join('')
  }

  return (
    characters.slice(0, 160).join('') +
    '\u2026'
  )
}

function serializeQueueRow(row) {
  return {
    id: row.id,
    type: row.submission_type,
    language: row.language,
    messagePreview: moderationPreview(
      row.message_preview,
    ),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  }
}

async function listSubmissions(db, filters) {
  validateDatabase(db)

  const clauses = ['status = ?']
  const bindings = [filters.status]

  if (filters.type !== null) {
    clauses.push('submission_type = ?')
    bindings.push(filters.type)
  }

  if (filters.language !== null) {
    clauses.push('language = ?')
    bindings.push(filters.language)
  }

  if (filters.cursor !== null) {
    clauses.push(
      '(created_at < ? OR (created_at = ? AND id < ?))',
    )
    bindings.push(
      filters.cursor.createdAt,
      filters.cursor.createdAt,
      filters.cursor.id,
    )
  }

  bindings.push(filters.limit + 1)

  const statement = statementWithBindings(
    db,
    [
      'SELECT',
      'id, submission_type, language,',
      'substr(content_text, 1, 161) AS message_preview,',
      'status, created_at, updated_at, expires_at',
      'FROM visitor_submissions',
      'WHERE ' + clauses.join(' AND '),
      'ORDER BY created_at DESC, id DESC',
      'LIMIT ?',
    ].join(' '),
    bindings,
  )

  if (typeof statement.all !== 'function') {
    throw new TypeError(
      'The D1 statement must support all().',
    )
  }

  const result = await statement.all()
  const rows = Array.isArray(result?.results)
    ? result.results
    : []
  const hasMore = rows.length > filters.limit
  const visibleRows = hasMore
    ? rows.slice(0, filters.limit)
    : rows
  const finalRow =
    visibleRows[visibleRows.length - 1]

  return {
    submissions: visibleRows.map(
      serializeQueueRow,
    ),
    nextCursor:
      hasMore && finalRow
        ? encodeModerationCursor({
            createdAt: finalRow.created_at,
            id: finalRow.id,
          })
        : null,
  }
}

async function firstRow(statement) {
  if (typeof statement.first !== 'function') {
    throw new TypeError(
      'The D1 statement must support first().',
    )
  }

  return statement.first()
}

async function allRows(statement) {
  if (typeof statement.all !== 'function') {
    throw new TypeError(
      'The D1 statement must support all().',
    )
  }

  const result = await statement.all()

  return Array.isArray(result?.results)
    ? result.results
    : []
}

async function readSubmissionDetail(
  db,
  submissionId,
) {
  validateDatabase(db)

  const submission = await firstRow(
    db
      .prepare(
        [
          'SELECT',
          'id, submission_type, language, content_text,',
          'status, created_at, updated_at, expires_at',
          'FROM visitor_submissions',
          'WHERE id = ?1',
          'LIMIT 1',
        ].join(' '),
      )
      .bind(submissionId),
  )

  if (!submission) return null

  const actions = await allRows(
    db
      .prepare(
        [
          'SELECT',
          'id, action_type, previous_status,',
          'resulting_status, reason_code,',
          'note_text, actor_id, created_at',
          'FROM visitor_submission_moderation_actions',
          'WHERE submission_id = ?1',
          'ORDER BY created_at ASC, id ASC',
        ].join(' '),
      )
      .bind(submissionId),
  )

  const events = await allRows(
    db
      .prepare(
        [
          'SELECT',
          'id, event_type, previous_status,',
          'resulting_status, reason_code,',
          'actor_type, actor_id, created_at',
          'FROM visitor_submission_events',
          'WHERE submission_id = ?1',
          'ORDER BY created_at ASC, id ASC',
        ].join(' '),
      )
      .bind(submissionId),
  )

  return {
    id: submission.id,
    type: submission.submission_type,
    language: submission.language,
    message: submission.content_text,
    status: submission.status,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
    expiresAt: submission.expires_at,
    actions: actions.map((action) => ({
      id: action.id,
      action: action.action_type,
      previousStatus: action.previous_status,
      resultingStatus: action.resulting_status,
      reasonCode: action.reason_code,
      note: action.note_text,
      actorId: action.actor_id,
      createdAt: action.created_at,
    })),
    events: events.map((event) => ({
      id: event.id,
      event: event.event_type,
      previousStatus: event.previous_status,
      resultingStatus: event.resulting_status,
      reasonCode: event.reason_code,
      actorType: event.actor_type,
      actorId: event.actor_id,
      createdAt: event.created_at,
    })),
  }
}

function opaqueId(prefix, idFactory) {
  const value = idFactory()

  if (typeof value !== 'string' || !value) {
    throw new TypeError(
      'The moderation ID factory returned an invalid ID.',
    )
  }

  return `${prefix}_${value}`
}

function actionTimestamp(
  expectedUpdatedAt,
  nowMilliseconds,
) {
  const expectedMilliseconds =
    Date.parse(expectedUpdatedAt)
  const candidate = Number.isFinite(nowMilliseconds)
    ? nowMilliseconds
    : Date.now()
  const resolved = Math.max(
    candidate,
    expectedMilliseconds + 1,
  )

  return new Date(resolved).toISOString()
}

function routeParts(request) {
  const pathname = new URL(request.url).pathname
  const base = '/v1/admin/intake/submissions'

  if (pathname === base) {
    return {
      kind: 'queue',
      submissionId: null,
    }
  }

  const escapedBase = base.replace(
    /[.*+?^${}()|[\]\\]/gu,
    '\\$&',
  )
  const detailMatch = pathname.match(
    new RegExp(
      `^${escapedBase}/([^/]+)$`,
      'u',
    ),
  )

  if (
    detailMatch &&
    isValidModerationSubmissionId(
      detailMatch[1],
    )
  ) {
    return {
      kind: 'detail',
      submissionId: detailMatch[1],
    }
  }

  const actionMatch = pathname.match(
    new RegExp(
      `^${escapedBase}/([^/]+)/actions$`,
      'u',
    ),
  )

  if (
    actionMatch &&
    isValidModerationSubmissionId(
      actionMatch[1],
    )
  ) {
    return {
      kind: 'action',
      submissionId: actionMatch[1],
    }
  }

  return {
    kind: 'unknown',
    submissionId: null,
  }
}

function methodNotAllowed(
  request,
  allow,
) {
  return adminErrorResponse(
    request,
    405,
    'method_not_allowed',
    'That HTTP method is not supported for this moderation endpoint.',
    {
      Allow: allow,
    },
  )
}

async function handleAuthenticatedRequest(
  request,
  env,
  options,
) {
  const route = routeParts(request)
  const method = request.method.toUpperCase()

  if (route.kind === 'unknown') {
    return adminErrorResponse(
      request,
      404,
      'not_found',
      'The requested Ask Mark endpoint does not exist.',
    )
  }

  if (route.kind === 'queue') {
    if (method !== 'GET') {
      return methodNotAllowed(
        request,
        'GET, OPTIONS',
      )
    }

    const filters = parseModerationQueueQuery(
      new URL(request.url),
    )
    const page = await listSubmissions(
      env.ASK_MARK_DB,
      filters,
    )

    return adminJsonResponse(request, {
      ok: true,
      submissions: page.submissions,
      page: {
        nextCursor: page.nextCursor,
      },
    })
  }

  if (route.kind === 'detail') {
    if (method !== 'GET') {
      return methodNotAllowed(
        request,
        'GET, OPTIONS',
      )
    }

    const submission = await readSubmissionDetail(
      env.ASK_MARK_DB,
      route.submissionId,
    )

    if (!submission) {
      return adminErrorResponse(
        request,
        404,
        'not_found',
        'The requested visitor submission does not exist.',
      )
    }

    return adminJsonResponse(request, {
      ok: true,
      submission,
    })
  }

  if (method !== 'POST') {
    return methodNotAllowed(
      request,
      'POST, OPTIONS',
    )
  }

  const action = await readModerationActionRequest(
    request,
  )
  const nowMilliseconds =
    options.nowMilliseconds ?? Date.now()
  const idFactory =
    options.idFactory ??
    (() => crypto.randomUUID())
  const createdAt = actionTimestamp(
    action.expectedUpdatedAt,
    nowMilliseconds,
  )

  const stored = await transitionIntakeSubmission(
    env.ASK_MARK_DB,
    {
      submissionId: route.submissionId,
      actionId: opaqueId(
        'action',
        idFactory,
      ),
      eventId: opaqueId(
        'event',
        idFactory,
      ),
      action: action.action,
      expectedStatus: action.expectedStatus,
      expectedUpdatedAt:
        action.expectedUpdatedAt,
      reasonCode: action.reasonCode,
      note: action.note,
      actorId:
        options.actorId ??
        LOCAL_ADMIN_ACTOR_ID,
      createdAt,
    },
  )

  return adminJsonResponse(request, {
    ok: true,
    submission: {
      id: stored.id,
      status: stored.status,
      updatedAt: stored.updatedAt,
    },
    action: {
      id: stored.actionId,
    },
  })
}

export async function handleLocalModerationRequest(
  request,
  env,
  options = {},
) {
  if (!isLocalModerationEnabled(env)) {
    return errorResponse(
      request,
      404,
      'not_found',
      'The requested Ask Mark endpoint does not exist.',
    )
  }

  if (
    request.method.toUpperCase() === 'OPTIONS'
  ) {
    return adminPreflightResponse(request)
  }

  if (!allowedAdminOrigin(request)) {
    return adminErrorResponse(
      request,
      403,
      'admin_origin_forbidden',
      'The moderation request origin is not allowed.',
    )
  }

  const authorization =
    await authorizeLocalAdmin(request, env)

  if (!authorization.ok) {
    return authorization.response
  }

  try {
    return await handleAuthenticatedRequest(
      request,
      env,
      options,
    )
  } catch (error) {
    if (
      error instanceof ModerationRequestError ||
      error instanceof ModerationStorageError
    ) {
      return adminErrorResponse(
        request,
        error.status,
        error.code,
        error.message,
      )
    }

    throw error
  }
}
