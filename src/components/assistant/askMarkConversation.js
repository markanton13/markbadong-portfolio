import {
  getAskMarkResponse,
  isLocalAskMarkAiEnabled,
} from './askMarkApiClient.js'

export const ASK_MARK_CONTEXT_TTL_MS = 10 * 60 * 1000
const APPROVED_PROJECT_KEYS_BY_ID = Object.freeze({
  personalvabot: 'project.personalvabot',
  markhq: 'project.markhq',
  applylang: 'project.applylang',
  'learning-library': 'project.learning_library',
  'funnel-lab': 'project.funnel_lab',
  leaveflow: 'project.leaveflow',
})

export function getAskMarkKnowledgeKeysFromResponse(response) {
  if (Array.isArray(response?.knowledgeKeys)) return response.knowledgeKeys.slice(0, 2)
  if (typeof response?.knowledgeKey === 'string') return [response.knowledgeKey]
  if (response?.context?.type === 'project') {
    const key = APPROVED_PROJECT_KEYS_BY_ID[response.context.id]
    return key ? [key] : []
  }
  if (response?.context?.type === 'projects' && Array.isArray(response.context.projects)) {
    return response.context.projects.slice(0, 2)
      .map((project) => project.key || APPROVED_PROJECT_KEYS_BY_ID[project.id])
      .filter(Boolean)
  }
  return []
}

export function createAskMarkKnowledgeContext(keys, now = Date.now()) {
  const safeKeys = [...new Set(Array.isArray(keys) ? keys : [])]
    .filter((key) => typeof key === 'string' && /^project\.[a-z0-9._-]{1,80}$/i.test(key))
    .slice(0, 2)
  return safeKeys.length ? { keys: safeKeys, updatedAt: now } : null
}

export function getFreshAskMarkKnowledgeKeys(context, now = Date.now()) {
  if (!context || !Number.isFinite(context.updatedAt) || now - context.updatedAt > ASK_MARK_CONTEXT_TTL_MS) return []
  return createAskMarkKnowledgeContext(context.keys, context.updatedAt)?.keys || []
}

export function createAskMarkRequestLifecycle() {
  let sequence = 0
  let controller = null
  return {
    begin() {
      controller?.abort()
      controller = new AbortController()
      sequence += 1
      return { sequence, signal: controller.signal }
    },
    isCurrent(candidate) {
      return candidate === sequence
    },
    cancel() {
      sequence += 1
      controller?.abort()
      controller = null
      return sequence
    },
    finish(candidate) {
      if (candidate === sequence) controller = null
    },
  }
}

/**
 * Resolve known contextual follow-ups from the frozen, approved static data.
 * Other questions keep using the existing read-only API and its static fallback.
 */
export async function getAskMarkTurn(
  question,
  fallbackResponse,
  {
    query = getAskMarkResponse,
    environment = import.meta.env,
    knowledgeKey = null,
    knowledgeKeys = [],
    signal,
  } = {},
) {
  const safeKeys = Array.isArray(knowledgeKeys) && knowledgeKeys.length
    ? knowledgeKeys.slice(0, 2)
    : typeof knowledgeKey === 'string' ? [knowledgeKey] : []
  if (isLocalAskMarkAiEnabled(environment)) {
    return query(question, fallbackResponse, {
      environment,
      generative: true,
      contextKeys: safeKeys,
      contextKey: safeKeys[0] || null,
      signal,
    })
  }

  if (fallbackResponse?.conversationalFollowUp === true) {
    return {
      ...fallbackResponse,
      delivery: 'static',
    }
  }

  return query(question, fallbackResponse)
}
