const SERVICE_NAME = 'ask-mark'
const API_VERSION = '2C.1'

const FALLBACK_ACTIONS = Object.freeze([
  {
    type: 'contact',
    label: 'Contact Mark',
    href: '/#contact',
  },
  {
    type: 'resume',
    label: 'View résumé',
    href: '/files/Mark-Anton-Badong-Resume.pdf',
  },
])

const STARTER_QUESTIONS = Object.freeze([
  'Who is Mark?',
  'What customer support experience does Mark have?',
  'Which projects best demonstrate his operations skills?',
  'What roles may fit Mark’s background?',
])

function normalizeText(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9@&+.#'/$%-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wholeWordMatch(message, term) {
  if (!term) return false

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\s|[^a-z0-9])${escaped}(?=\\s|$|[^a-z0-9])`, 'i').test(message)
}

function termScore(message, term) {
  const normalizedTerm = term.normalized_term

  if (!normalizedTerm) return 0

  let matched = false
  let baseScore = 0

  switch (term.match_mode) {
    case 'exact':
      matched = message === normalizedTerm
      baseScore = 10_000
      break

    case 'whole_word':
      matched = wholeWordMatch(message, normalizedTerm)
      baseScore = 8_000
      break

    case 'prefix':
      matched = message.startsWith(normalizedTerm)
      baseScore = 7_000
      break

    case 'phrase':
    default:
      matched = message.includes(normalizedTerm)
      baseScore = 6_000
      break
  }

  if (!matched) return 0

  const negativeMultiplier = Number(term.is_negative) === 1 ? -1 : 1

  return (
    negativeMultiplier *
    (baseScore + Number(term.weight || 0) + normalizedTerm.length)
  )
}

function parsePayload(payloadJson) {
  if (!payloadJson) return {}

  try {
    const value = JSON.parse(payloadJson)
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function safeActions(payload) {
  const actions = []

  const candidates = [
    ['contact', 'Contact Mark', payload.contactPath],
    ['resume', 'View résumé', payload.resumePath],
    ['booking', 'Book a conversation', payload.bookingUrl],
    ['linkedin', 'Open LinkedIn', payload.linkedinUrl],
    ['github', 'Open GitHub', payload.githubUrl],
    ['project', 'View project', payload.route],
  ]

  for (const [type, label, href] of candidates) {
    if (typeof href === 'string' && href.trim()) {
      actions.push({
        type,
        label,
        href,
      })
    }
  }

  return actions
}

async function releaseContext(db) {
  const row = await db
    .prepare(
      `
        SELECT
          pr.id AS release_id,
          pr.release_no,
          pr.title AS release_title,
          pr.published_at,
          pr.knowledge_count,
          seed.value_text AS seed_version
        FROM system_settings AS active
        JOIN publication_releases AS pr
          ON pr.id = active.value_text
        LEFT JOIN system_settings AS seed
          ON seed.setting_key = 'approved_seed_version'
        WHERE active.setting_key = 'active_release_id'
          AND pr.status = 'published'
        LIMIT 1
      `,
    )
    .first()

  if (!row) {
    throw new Error('No active Ask Mark publication release was found.')
  }

  return {
    id: row.release_id,
    number: Number(row.release_no),
    title: row.release_title,
    publishedAt: row.published_at,
    knowledgeCount: Number(row.knowledge_count),
    seedVersion: row.seed_version,
  }
}

async function activeKnowledge(db) {
  const result = await db
    .prepare(
      `
        SELECT
          knowledge_item_id,
          item_key,
          kind,
          category,
          title,
          content_text,
          payload_json,
          answer_template,
          language,
          release_id
        FROM v_active_knowledge
        ORDER BY sort_order ASC, item_key ASC
      `,
    )
    .all()

  return result.results || []
}

async function activeTerms(db) {
  const result = await db
    .prepare(
      `
        SELECT
          kmt.knowledge_item_id,
          kmt.normalized_term,
          kmt.match_mode,
          kmt.weight,
          kmt.is_negative
        FROM knowledge_match_terms AS kmt
        JOIN v_active_knowledge AS vak
          ON vak.knowledge_item_id = kmt.knowledge_item_id
        WHERE kmt.is_active = 1
        ORDER BY kmt.weight DESC, LENGTH(kmt.normalized_term) DESC
      `,
    )
    .all()

  return result.results || []
}

function publicItem(item) {
  const payload = parsePayload(item.payload_json)
  const actions = safeActions(payload)

  return {
    id: item.knowledge_item_id,
    key: item.item_key,
    kind: item.kind,
    category: item.category,
    title: item.title,
    answer: item.answer_template || item.content_text,
    payload,
    actions,
  }
}

export async function getHealth(db) {
  const release = await releaseContext(db)

  return {
    ok: true,
    service: SERVICE_NAME,
    apiVersion: API_VERSION,
    mode: 'deterministic-d1',
    status: 'healthy',
    release,
  }
}

export async function getBootstrap(db) {
  const [release, rows] = await Promise.all([
    releaseContext(db),
    activeKnowledge(db),
  ])

  const items = rows.map(publicItem)
  const byKey = new Map(items.map((item) => [item.key, item]))
  const categories = [...new Set(items.map((item) => item.category))].sort()
  const projects = items
    .filter((item) => item.kind === 'project')
    .map((item) => ({
      id: item.id,
      key: item.key,
      title: item.title,
      answer: item.answer,
      actions: item.actions,
    }))

  return {
    ok: true,
    service: SERVICE_NAME,
    apiVersion: API_VERSION,
    mode: 'deterministic-d1',
    release,
    assistant: byKey.get('assistant.identity') || null,
    profile: byKey.get('profile.summary') || null,
    starterQuestions: STARTER_QUESTIONS,
    categories,
    projects,
  }
}

export async function queryApprovedKnowledge(
  db,
  rawMessage,
  { contextKey = null, contextKeys = [] } = {},
) {
  const message = normalizeText(rawMessage)
  const [release, rows, terms] = await Promise.all([
    releaseContext(db),
    activeKnowledge(db),
    activeTerms(db),
  ])

  const rowsById = new Map(
    rows.map((row) => [row.knowledge_item_id, row]),
  )

  let winningTerm = null
  let winningScore = 0
  const scoresByItem = new Map()

  for (const term of terms) {
    const row = rowsById.get(term.knowledge_item_id)
    let score = termScore(message, term)

    // A matched privacy or unsupported-claim boundary must outrank ordinary
    // profile and project phrases. This prevents prompts such as
    // "search the public internet for information about Mark" from being
    // captured by the weaker phrase "about Mark".
    if (
      score > 0 &&
      row &&
      (row.kind === 'privacy_boundary' ||
        row.kind === 'unsupported_boundary')
    ) {
      score += 2_500
    }

    if (score > 0) {
      const previous = scoresByItem.get(term.knowledge_item_id)
      if (!previous || score > previous.score) {
        scoresByItem.set(term.knowledge_item_id, {
          score,
          term,
          position: message.indexOf(term.normalized_term),
        })
      }
    }

    if (score > winningScore) {
      winningScore = score
      winningTerm = term
    }
  }

  const boundaryMatch = winningTerm && (() => {
    const row = rowsById.get(winningTerm.knowledge_item_id)
    return row?.kind === 'privacy_boundary' || row?.kind === 'unsupported_boundary'
  })()

  const explicitProjects = rows
    .filter((row) => row.kind === 'project')
    .map((row) => {
      const keyAlias = row.item_key.replace(/^project\./, '').replace(/[_-]/g, ' ')
      const identities = [row.title, keyAlias, keyAlias.replace(/\s/g, '')]
        .map(normalizeText)
        .filter(Boolean)
      const positions = identities
        .filter((identity) => wholeWordMatch(message, identity))
        .map((identity) => message.indexOf(identity))
      return positions.length ? { row, position: Math.min(...positions) } : null
    })
    .filter(Boolean)
    .sort((left, right) => left.position - right.position)

  const normalizedContextKeys = Array.isArray(contextKeys)
    ? contextKeys.slice(0, 4)
    : []
  if (typeof contextKey === 'string') normalizedContextKeys.push(contextKey)
  const contextItems = [...new Set(normalizedContextKeys)]
    .filter((key) => typeof key === 'string' && /^[a-z0-9][a-z0-9._-]{0,95}$/i.test(key))
    .map((key) => rows.find((item) => item.item_key === key && item.kind === 'project'))
    .filter(Boolean)
    .slice(0, 2)

  const refersToPluralContext = /\b(?:these|those|both|they|them)\b|\bwhich of (?:these|those)\b/i.test(message)
  const refersToSingleContext = /\b(?:that project|that one|it|tell me more|more about that|what about that)\b/i.test(message)

  if (!boundaryMatch && explicitProjects.length > 2 && /\b(?:compare|between|which of|these projects)\b/i.test(message)) {
    return {
      ok: true,
      service: SERVICE_NAME,
      apiVersion: API_VERSION,
      mode: 'deterministic-d1',
      matched: false,
      clarificationRequired: true,
      release,
      answer: 'I can compare up to two approved projects at a time. Which two would you like me to compare?',
      item: null,
      items: [],
      actions: FALLBACK_ACTIONS,
    }
  }

  let selectedRows = []
  if (!boundaryMatch && explicitProjects.length >= 2) {
    selectedRows = explicitProjects.slice(0, 2).map(({ row }) => row)
  } else if (!boundaryMatch && explicitProjects.length === 1) {
    selectedRows = [explicitProjects[0].row]
  } else if (!boundaryMatch && explicitProjects.length === 0 && contextItems.length === 0 && (refersToPluralContext || refersToSingleContext)) {
    return {
      ok: true,
      service: SERVICE_NAME,
      apiVersion: API_VERSION,
      mode: 'deterministic-d1',
      matched: false,
      clarificationRequired: true,
      release,
      answer: 'Which approved project are you referring to?',
      item: null,
      items: [],
      actions: [],
    }
  } else if (!boundaryMatch && contextItems.length > 1 && refersToPluralContext) {
    selectedRows = contextItems
  } else if (!boundaryMatch && contextItems.length > 1 && refersToSingleContext) {
    return {
      ok: true,
      service: SERVICE_NAME,
      apiVersion: API_VERSION,
      mode: 'deterministic-d1',
      matched: false,
      clarificationRequired: true,
      release,
      answer: 'Which of the two projects do you mean?',
      item: null,
      items: [],
      actions: [],
    }
  } else if (!boundaryMatch && contextItems.length === 1 && (refersToPluralContext || refersToSingleContext)) {
    selectedRows = contextItems
  }

  if (selectedRows.length > 0) {
    const items = selectedRows.map(publicItem)
    const answer = items.length === 1
      ? items[0].answer
      : items.map((item) => `${item.title}: ${item.answer}`).join('\n\n')
    return {
      ok: true,
      service: SERVICE_NAME,
      apiVersion: API_VERSION,
      mode: 'deterministic-d1',
      matched: true,
      release,
      match: explicitProjects.length ? {
        terms: selectedRows.map((row) => scoresByItem.get(row.knowledge_item_id)?.term.normalized_term).filter(Boolean),
      } : { context: true },
      answer,
      item: items[0],
      items,
      actions: items.flatMap((item) => item.actions),
    }
  }

  if (!winningTerm) {
    const hasUnresolvedReference = refersToPluralContext || refersToSingleContext

    const fallbackResult = {
      ok: true,
      service: SERVICE_NAME,
      apiVersion: API_VERSION,
      mode: 'deterministic-d1',
      matched: false,
      release,
      answer: hasUnresolvedReference
        ? 'Which approved project do you mean?'
        : 'I do not have approved evidence for that question yet. I can help with Mark’s verified background, projects, role fit, résumé, contact details, or booking options.',
      item: null,
      items: [],
      clarificationRequired: hasUnresolvedReference,
      actions: FALLBACK_ACTIONS,
    }
    return fallbackResult
  }

  const row = rowsById.get(winningTerm.knowledge_item_id)

  if (!row) {
    throw new Error('Matched knowledge was not present in the active release.')
  }

  const item = publicItem(row)

  return {
    ok: true,
    service: SERVICE_NAME,
    apiVersion: API_VERSION,
    mode: 'deterministic-d1',
    matched: true,
    release,
    match: {
      term: winningTerm.normalized_term,
      mode: winningTerm.match_mode,
      score: winningScore,
    },
    answer: item.answer,
    item,
    items: [item],
    actions: item.actions.length ? item.actions : FALLBACK_ACTIONS,
  }
}
