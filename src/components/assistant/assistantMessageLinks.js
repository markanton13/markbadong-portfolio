import { projectKnowledge } from './assistantKnowledge.js'

const DESTINATION_BASE = 'https://markbadong.com'

export function normalizeAssistantDestination(href) {
  if (typeof href !== 'string' || !href.trim()) return ''

  try {
    const destination = new URL(href.trim(), DESTINATION_BASE)
    if (destination.pathname.length > 1) {
      destination.pathname = destination.pathname.replace(/\/+$/, '') || '/'
    }
    destination.searchParams.sort()
    return destination.href
  } catch {
    return href.trim()
  }
}

function getActionPurpose(item) {
  return String(item.type || item.purpose || item.label || 'link')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ')
}

function labelProjectGitHubAction(item, sources) {
  const destination = normalizeAssistantDestination(item?.href)
  if (!destination) return item

  const project = projectKnowledge.find((candidate) =>
    candidate.githubUrl &&
    normalizeAssistantDestination(candidate.githubUrl) === destination &&
    sources.some((source) =>
      normalizeAssistantDestination(source?.href) ===
      normalizeAssistantDestination(candidate.sourcePath),
    ),
  )
  if (!project) return item

  const projectLabel = project.id === 'markhq' ? 'MarkHQ' : project.label
  return { ...item, label: `${projectLabel} · GitHub` }
}

export function getAssistantMessageLinks(rawSources, rawActions) {
  const availableSources = Array.isArray(rawSources) ? rawSources : []
  const sources = []
  const seenSources = new Set()

  for (const item of availableSources) {
    const destination = normalizeAssistantDestination(item?.href)
    if (!destination) continue

    const purpose = String(item.label || 'source')
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase('en-US')
      .replace(/\s+/g, ' ')
    const key = `${destination}\u0000${purpose}`
    if (seenSources.has(key)) continue
    seenSources.add(key)
    sources.push(item)
  }

  const proofDestinations = new Set(
    sources.map((item) => normalizeAssistantDestination(item.href)),
  )
  const actions = []
  const seenActions = new Set()

  for (const rawItem of Array.isArray(rawActions) ? rawActions : []) {
    const item = labelProjectGitHubAction(rawItem, availableSources)
    const destination = normalizeAssistantDestination(item?.href)
    if (!destination || proofDestinations.has(destination)) continue

    const key = `${destination}\u0000${getActionPurpose(item)}`
    if (seenActions.has(key)) continue
    seenActions.add(key)
    actions.push(item)
  }

  return { sources, actions }
}
