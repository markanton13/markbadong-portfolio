const DEFAULT_TIMEOUT_MS = 2200
const REMOTE_PREVIEW_MODE = 'remote-preview'
const REMOTE_PREVIEW_VITE_MODE = 'askmark-preview'
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

    const isRemotePreview =
      apiMode === REMOTE_PREVIEW_MODE &&
      viteMode === REMOTE_PREVIEW_VITE_MODE &&
      allowedHost &&
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === allowedHost &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''

    if (isRemotePreview) {
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
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {},
) {
  const config = resolveAskMarkApiConfig(environment)

  if (!config.enabled || typeof fetchImpl !== 'function') {
    return staticResponse(fallbackResponse)
  }

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    timeoutMs,
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
        }),
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      return staticResponse(fallbackResponse)
    }

    const payload = await response.json()

    if (
      payload?.ok !== true ||
      payload.matched !== true ||
      typeof payload.answer !== 'string' ||
      !payload.answer.trim() ||
      !payload.item
    ) {
      return staticResponse(fallbackResponse)
    }

    const actions = mapActions(payload.actions)
    const projectAction = actions.find(
      (item) =>
        item.type === 'project' &&
        item.href.startsWith('/projects/'),
    )

    const isProject = payload.item.kind === 'project'

    return {
      answer: payload.answer.trim(),
      category:
        typeof payload.item.category === 'string'
          ? payload.item.category
          : 'approved_d1',
      sources:
        isProject && projectAction
          ? [
              {
                label:
                  payload.item.title || projectAction.label,
                href: projectAction.href,
              },
            ]
          : [],
      actions,
      followUps: [],
      context:
        isProject && projectAction
          ? {
              type: 'project',
              id: projectAction.href.replace(
                '/projects/',
                '',
              ),
              label:
                payload.item.title || projectAction.label,
            }
          : null,
      delivery: 'd1',
    }
  } catch {
    return staticResponse(fallbackResponse)
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}
