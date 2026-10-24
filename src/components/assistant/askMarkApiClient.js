const DEFAULT_TIMEOUT_MS = 2200
const LOCAL_AI_TIMEOUT_MS = 37_000
const REMOTE_MODE_RULES = new Map([
  [
    'remote-preview',
    {
      viteMode: 'askmark-preview',
      host: 'ask-mark-api-preview.markantonbadong13.workers.dev',
    },
  ],
  [
    'remote-production',
    {
      viteMode: 'askmark-production',
      host: 'ask-mark-api-production.markantonbadong13.workers.dev',
    },
  ],
])
const LOOPBACK_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '[::1]',
])

function staticResponse(fallbackResponse) {
  return {
    ...fallbackResponse,
    delivery: 'static',
  }
}

export function resolveAskMarkApiConfig(
  environment = import.meta.env,
) {
  const configuredUrl =
    typeof environment?.VITE_ASK_MARK_API_BASE_URL === 'string'
      ? environment.VITE_ASK_MARK_API_BASE_URL.trim()
      : ''
  const apiMode =
    typeof environment?.VITE_ASK_MARK_API_MODE === 'string'
      ? environment.VITE_ASK_MARK_API_MODE.trim()
      : ''
  const viteMode =
    typeof environment?.MODE === 'string'
      ? environment.MODE.trim()
      : ''

  const allowedHost =
    typeof environment?.VITE_ASK_MARK_API_ALLOWED_HOST === 'string'
      ? environment.VITE_ASK_MARK_API_ALLOWED_HOST
          .trim()
          .toLowerCase()
      : ''

  if (!configuredUrl) {
    return {
      enabled: false,
      baseUrl: null,
    }
  }

  try {
    const url = new URL(configuredUrl)
    const normalizedUrl = url.toString().replace(/\/+$/, '')

    const isLocalDevelopment =
      environment?.DEV === true &&
      url.protocol === 'http:' &&
      LOOPBACK_HOSTS.has(url.hostname)

    if (isLocalDevelopment) {
      return {
        enabled: true,
        baseUrl: normalizedUrl,
      }
    }

    const remoteRule = REMOTE_MODE_RULES.get(apiMode)
    const isAllowedRemote =
      remoteRule &&
      viteMode === remoteRule.viteMode &&
      allowedHost === remoteRule.host &&
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === remoteRule.host &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''

    if (isAllowedRemote) {
      return {
        enabled: true,
        baseUrl: normalizedUrl,
      }
    }

    return {
      enabled: false,
      baseUrl: null,
    }
  } catch {
    return {
      enabled: false,
      baseUrl: null,
    }
  }
}

export function isLocalAskMarkAiEnabled(environment = import.meta.env) {
  if (
    environment?.DEV !== true ||
    environment?.VITE_ASK_MARK_AI_MODE !== 'local-only'
  ) {
    return false
  }

  const config = resolveAskMarkApiConfig(environment)
  if (!config.enabled) return false

  try {
    const url = new URL(config.baseUrl)
    return (
      url.protocol === 'http:' &&
      LOOPBACK_HOSTS.has(url.hostname) &&
      url.username === '' &&
      url.password === ''
    )
  } catch {
    return false
  }
}

function mapActions(actions) {
  if (!Array.isArray(actions)) return []

  return actions
    .filter(
      (item) =>
        item &&
        typeof item.label === 'string' &&
        item.label.trim() &&
        typeof item.href === 'string' &&
        item.href.trim(),
    )
    .map((item) => ({
      label: item.label.trim(),
      href: item.href.trim(),
      type:
        typeof item.type === 'string' && item.type.trim()
          ? item.type.trim()
          : 'internal_link',
      external: /^https?:\/\//i.test(item.href),
    }))
}

export async function getAskMarkResponse(
  question,
  fallbackResponse,
  {
    environment = import.meta.env,
    fetchImpl = globalThis.fetch,
    timeoutMs,
    generative = false,
    contextKey = null,
    contextKeys = [],
    signal,
  } = {},
) {
  const config = resolveAskMarkApiConfig(environment)

  if (!config.enabled || typeof fetchImpl !== 'function') {
    return staticResponse(fallbackResponse)
  }

  const isLocalGenerative = generative && isLocalAskMarkAiEnabled(environment)
  const effectiveTimeoutMs = Number.isFinite(timeoutMs)
    ? timeoutMs
    : isLocalGenerative ? LOCAL_AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    effectiveTimeoutMs,
  )

  try {
    const response = await fetchImpl(
      `${config.baseUrl}/v1/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question.trim(),
          ...(isLocalGenerative
            ? {
                generative: true,
                ...(Array.isArray(contextKeys) && contextKeys.length
                  ? { contextKeys: contextKeys.slice(0, 2) }
                  : typeof contextKey === 'string' ? { contextKey } : {}),
              }
            : {}),
        }),
        signal: controller.signal,
      },
    )

    if (controller.signal.aborted) return staticResponse(fallbackResponse)

    if (!response.ok) {
      return staticResponse(fallbackResponse)
    }

    const payload = await response.json()
    if (controller.signal.aborted) return staticResponse(fallbackResponse)

    if (
      payload?.ok !== true ||
      typeof payload.answer !== 'string' ||
      !payload.answer.trim()
    ) {
      return staticResponse(fallbackResponse)
    }

    if (payload.clarificationRequired === true) {
      return {
        ...fallbackResponse,
        answer: payload.answer.trim(),
        category: 'clarification',
        sources: [],
        actions: mapActions(payload.actions),
        context: null,
        knowledgeKeys: [],
        knowledgeKey: null,
        delivery: 'd1',
      }
    }

    const items = (Array.isArray(payload.items) ? payload.items : [payload.item])
      .filter((item) => item && typeof item === 'object')
      .slice(0, 2)
    if (payload.matched !== true || !items.length || !items[0].key) {
      return staticResponse(fallbackResponse)
    }

    const actions = mapActions(payload.actions)
    const projectActions = actions.filter(
      (item) =>
        item.type === 'project' &&
        item.href.startsWith('/projects/'),
    )
    const sources = items.flatMap((knowledgeItem) => {
      const sourceAction = projectActions.find((item) =>
        item.href.endsWith(`/${knowledgeItem.key.replace(/^project\./, '').replace(/_/g, '-')}`),
      ) || projectActions.find((item) => item.href.includes(knowledgeItem.key.split('.')[1]?.replace(/_/g, '-')))
      return knowledgeItem.kind === 'project' && sourceAction
        ? [{ label: knowledgeItem.title || sourceAction.label, href: sourceAction.href }]
        : []
    })
    const contextProjects = items.map((knowledgeItem) => ({
      id: knowledgeItem.key.replace(/^project\./, '').replace(/_/g, '-'),
      label: knowledgeItem.title,
      key: knowledgeItem.key,
    }))
    const isProject = items.every((item) => item.kind === 'project')

    return {
      answer: payload.answer.trim(),
      category:
        typeof items[0].category === 'string'
          ? items[0].category
          : 'approved_d1',
      sources,
      actions,
      followUps: [],
      context: isProject
        ? items.length > 1
          ? { type: 'projects', projects: contextProjects }
          : { type: 'project', id: contextProjects[0].id, label: contextProjects[0].label }
        : null,
      delivery: payload.mode === 'kilo-local' ? 'kilo-local' : 'd1',
      knowledgeKey: typeof items[0].key === 'string' ? items[0].key : null,
      knowledgeKeys: items.map((item) => item.key).filter((key) => typeof key === 'string').slice(0, 2),
    }
  } catch {
    return staticResponse(fallbackResponse)
  } finally {
    globalThis.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
