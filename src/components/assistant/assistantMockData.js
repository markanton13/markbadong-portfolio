import {
  assistantLinks,
  profileKnowledge,
  projectKnowledge,
  restrictedKnowledge,
  roleKnowledge,
} from './assistantKnowledge.js'

const action = (label, href, type = 'internal_link', external = false) => ({
  label,
  href,
  type,
  external,
})

const source = (label, href) => ({ label, href })

const resumeAndContactActions = () => [
  action('View résumé', assistantLinks.resume, 'resume', true),
  action('Contact Mark', assistantLinks.contact, 'contact'),
]

const standardRoleEnding =
  'For the most current and role-specific confirmation, review Mark’s résumé or contact him directly.'

export const assistantPrompts = {
  roleFit: {
    id: 'role-fit',
    label: 'Which roles would Mark be a strong fit for?',
    question: 'Which roles would Mark be a strong fit for?',
  },
  crmExperience: {
    id: 'crm-experience',
    label: 'Does Mark have CRM or GHL experience?',
    question: 'Does Mark have CRM or GoHighLevel experience?',
  },
  aiUsage: {
    id: 'ai-usage',
    label: 'How does Mark use AI professionally?',
    question: 'How does Mark use AI professionally?',
  },
  projectFirst: {
    id: 'project-first',
    label: 'Which project should I view first?',
    question: 'Which project should I view first?',
  },
  websites: {
    id: 'websites',
    label: 'Can Mark build websites and landing pages?',
    question: 'Can Mark build websites and landing pages?',
  },
  automation: {
    id: 'automation',
    label: 'What automation experience does Mark have?',
    question: 'What automation experience does Mark have?',
  },
  operations: {
    id: 'operations',
    label: 'Which project best shows operations skills?',
    question: 'Which project best shows Mark’s operations skills?',
  },
  contact: {
    id: 'contact',
    label: 'How can I contact or book a call with Mark?',
    question: 'How can I contact or book a call with Mark?',
  },
  personalVABotProblem: {
    id: 'personalvabot-problem',
    label: 'What problem does PersonalVABot solve?',
    question: 'What problem does PersonalVABot solve?',
  },
  personalVABotSkills: {
    id: 'personalvabot-skills',
    label: 'What skills are demonstrated here?',
    question: 'What skills did Mark demonstrate through PersonalVABot?',
  },
  personalVABotPlatform: {
    id: 'personalvabot-platform',
    label: 'Is this a desktop or web app?',
    question: 'Is PersonalVABot a desktop or web app?',
  },
  markHQWorkflow: {
    id: 'markhq-workflow',
    label: 'How does the Discord workflow operate?',
    question: 'How does the MarkHQ Discord workflow operate?',
  },
  markHQAutomation: {
    id: 'markhq-automation',
    label: 'What does this show about automation?',
    question: 'What does MarkHQ show about Mark’s automation skills?',
  },
  markHQDeployment: {
    id: 'markhq-deployment',
    label: 'How was MarkHQ deployed?',
    question: 'How was MarkHQ deployed?',
  },
  funnelIndustries: {
    id: 'funnel-industries',
    label: 'Which industries are included?',
    question: 'Which industries are included in the Funnel Lab?',
  },
  funnelFit: {
    id: 'funnel-fit',
    label: 'Which funnel is relevant to my business?',
    question: 'Which Funnel Lab demo may be relevant to my business?',
  },
  funnelSkills: {
    id: 'funnel-skills',
    label: 'What design skills are shown here?',
    question: 'What design skills are demonstrated by the Funnel Lab?',
  },
  leaveFlow: {
    id: 'leaveflow',
    label: 'What does LeaveFlow demonstrate?',
    question: 'What does LeaveFlow demonstrate?',
  },
  learningLibrary: {
    id: 'learning-library',
    label: 'How does the Learning Library work?',
    question: 'How does the Learning Library work?',
  },
  applyLang: {
    id: 'applylang',
    label: 'What problem does ApplyLang solve?',
    question: 'What problem does ApplyLang solve?',
  },
}

const defaultPromptIds = ['roleFit', 'crmExperience', 'aiUsage', 'projectFirst']

const routePromptIds = {
  '/projects/personalvabot': [
    'personalVABotProblem',
    'personalVABotSkills',
    'personalVABotPlatform',
    'contact',
  ],
  '/projects/markhq': [
    'markHQWorkflow',
    'markHQAutomation',
    'markHQDeployment',
    'contact',
  ],
  '/projects/funnel-lab': [
    'funnelIndustries',
    'funnelFit',
    'funnelSkills',
    'contact',
  ],
  '/projects/leaveflow': ['leaveFlow', 'websites', 'operations', 'contact'],
  '/projects/learning-library': [
    'learningLibrary',
    'automation',
    'websites',
    'contact',
  ],
  '/projects/applylang': ['applyLang', 'automation', 'operations', 'contact'],
}

const normalizedPath = (pathname) => pathname.replace(/\/+$/, '') || '/'

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compact(value) {
  return normalize(value).replace(/\s/g, '')
}

function getEditDistance(left, right) {
  const rows = right.length + 1
  const columns = left.length + 1
  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0))

  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column
  }

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[column - 1] === right[row - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
    }
  }

  return matrix[rows - 1][columns - 1]
}

function getSimilarity(left, right) {
  const longest = Math.max(left.length, right.length)
  if (longest === 0) return 1
  return 1 - getEditDistance(left, right) / longest
}

function buildCandidates(question) {
  const words = normalize(question).split(' ').filter(Boolean)
  const candidates = new Set(words)

  for (let size = 2; size <= 5; size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      candidates.add(words.slice(index, index + size).join(''))
    }
  }

  return [...candidates]
}

function detectEntity(question, entities, threshold = 0.75) {
  const normalizedQuestion = normalize(question)
  const compactQuestion = compact(question)
  const candidates = buildCandidates(question)
  let best = null

  entities.forEach((entity) => {
    entity.aliases.forEach((alias) => {
      const normalizedAlias = normalize(alias)
      const compactAlias = compact(alias)

      const isSingleWordAlias = !normalizedAlias.includes(' ')
      const questionWords = normalizedQuestion.split(' ')

      const hasExactAliasMatch = isSingleWordAlias
        ? questionWords.includes(normalizedAlias)
        : normalizedQuestion.includes(normalizedAlias) ||
          compactQuestion.includes(compactAlias)

      if (hasExactAliasMatch) {
        const match = {
          entity,
          score: 1,
          exact: true,
          specificity: compactAlias.length,
        }

        if (
          !best ||
          match.score > best.score ||
          (match.score === best.score &&
            match.specificity > (best.specificity || 0))
        ) {
          best = match
        }
        return
      }

      candidates.forEach((candidate) => {
        if (candidate.length < 4 || compactAlias.length < 4) return

        const lengthRatio =
          Math.min(candidate.length, compactAlias.length) /
          Math.max(candidate.length, compactAlias.length)

        if (lengthRatio < 0.8) return

        const score = getSimilarity(candidate, compactAlias)
        const match = {
          entity,
          score,
          exact: false,
          specificity: compactAlias.length,
        }

        if (
          !best ||
          match.score > best.score ||
          (match.score === best.score &&
            match.specificity > (best.specificity || 0))
        ) {
          best = match
        }
      })
    })
  })

  if (!best || (!best.exact && best.score < threshold)) return null
  return best
}

function projectSource(project) {
  return source(
    project.sourcePath === '/#work'
      ? 'Portfolio work section'
      : `${project.label} case study`,
    project.sourcePath,
  )
}

function projectActions(project) {
  const actions = [action('Contact Mark about this', assistantLinks.contact, 'contact')]

  if (project.githubUrl) {
    actions.unshift(
      action('Open GitHub proof', project.githubUrl, 'external_link', true),
    )
  }

  if (project.liveUrl) {
    actions.unshift(
      action('Open live project', project.liveUrl, 'external_link', true),
    )
  }

  return actions
}

function buildProjectResponse(project) {
  return {
    category: 'project',
    context: { type: 'project', id: project.id, label: project.label },
    answer: `${project.summary}\n\n${project.status}`,
    sources: [projectSource(project)],
    actions: projectActions(project),
  }
}

function buildProjectClarification(project) {
  return {
    category: 'clarification',
    context: {
      type: 'clarification',
      entityType: 'project',
      id: project.id,
      label: project.label,
    },
    answer: `I think you may mean ${project.label}. Is that the project you’re asking about?`,
    sources: [projectSource(project)],
    actions: [],
    followUps: [
      {
        label: `Yes — tell me about ${project.label}`,
        question: `Tell me about ${project.label}.`,
      },
    ],
  }
}

function buildRoleResponse(role) {
  const parts = [role.lead, role.details]

  if (role.caution) {
    parts.push(role.caution)
  }

  parts.push(standardRoleEnding)

  return {
    category: 'role_experience',
    context: { type: 'role', id: role.id, label: role.label },
    answer: parts.join('\n\n'),
    sources: role.sources.map((item) => source(item.label, item.href)),
    actions: resumeAndContactActions(),
  }
}

function buildRoleClarification(role) {
  return {
    category: 'clarification',
    context: {
      type: 'clarification',
      entityType: 'role',
      id: role.id,
      label: role.label,
    },
    answer: `I think you may be asking about Mark’s experience in ${role.label}. Is that correct?`,
    sources: [],
    actions: [],
    followUps: [
      {
        label: `Yes — explain his ${role.label} experience`,
        question: `Tell me about Mark’s experience in ${role.label}.`,
      },
    ],
  }
}

function findProjectById(id) {
  return projectKnowledge.find((project) => project.id === id) || null
}

const APPROVED_D1_PROJECT_IDS = new Set([
  'personalvabot',
  'markhq',
  'applylang',
  'learning-library',
  'funnel-lab',
  'leaveflow',
])

const APPROVED_PROJECT_KEYS = Object.freeze({
  personalvabot: 'project.personalvabot',
  markhq: 'project.markhq',
  applylang: 'project.applylang',
  'learning-library': 'project.learning_library',
  'funnel-lab': 'project.funnel_lab',
  leaveflow: 'project.leaveflow',
})

function explicitApprovedProjectReferences(question) {
  const normalized = normalize(question)
  const matches = projectKnowledge
    .filter((project) => APPROVED_D1_PROJECT_IDS.has(project.id))
    .map((project) => {
      const positions = project.aliases
        .map((alias) => normalized.indexOf(normalize(alias)))
        .filter((position) => position >= 0)
      return positions.length ? { project, position: Math.min(...positions) } : null
    })
    .filter(Boolean)
    .sort((left, right) => left.position - right.position)
  return matches.slice(0, 3).map(({ project }) => project)
}

function buildMultiProjectResponse(projects) {
  const selected = projects.slice(0, 2)
  return {
    category: 'project',
    context: {
      type: 'projects',
      projects: selected.map((project) => ({
        id: project.id,
        label: project.label,
        key: APPROVED_PROJECT_KEYS[project.id],
      })),
    },
    answer: selected
      .map((project) => `${project.label}: ${project.summary}`)
      .join('\n\n'),
    sources: selected.map(projectSource),
    actions: selected.flatMap(projectActions),
    knowledgeKeys: selected.map((project) => APPROVED_PROJECT_KEYS[project.id]),
  }
}

function findRoleById(id) {
  return roleKnowledge.find((role) => role.id === id) || null
}

function buildProfileResponse(key, extraActions = []) {
  const record = profileKnowledge[key]
  const parts = [record.summary]

  if (record.direction) parts.push(record.direction)
  if (record.disclosure) parts.push(record.disclosure)
  if (record.boundaries) parts.push(record.boundaries)

  return {
    category: key,
    context: { type: 'topic', id: key, label: record.title },
    answer: parts.join('\n\n'),
    sources: [],
    actions: extraActions,
  }
}

const comparativeQuestionPattern = /^which\s+(?:one|project)\s+(?:focus(?:es|ed)?\s+more\s+on|is\s+more\s+focused\s+on|is\s+more\s+about|better\s+matches?\s+for|better\s+fits?)\s+(.+?)\s*[?.!]*$/i
const comparativeStopWords = new Set([
  'about', 'and', 'are', 'for', 'from', 'into', 'more', 'one', 'project',
  'that', 'the', 'their', 'them', 'they', 'this', 'which', 'with',
])

function comparativeTerms(value) {
  return normalize(value)
    .split(' ')
    .filter((term) => term.length >= 3 && !comparativeStopWords.has(term))
    .map((term) => term.endsWith('ies')
      ? `${term.slice(0, -3)}y`
      : term.length > 4 && term.endsWith('s') ? term.slice(0, -1) : term)
}

function scoreProjectForCriterion(project, criterionTerms) {
  const descriptionTerms = new Set(comparativeTerms(`${project.summary} ${project.status}`))
  return criterionTerms.reduce((score, term) => score + (descriptionTerms.has(term) ? 1 : 0), 0)
}

function buildComparativeProjectFollowUp(question, projects, context) {
  const match = question.match(comparativeQuestionPattern)
  if (!match || projects.length !== 2) return null

  const criterion = match[1].trim().replace(/[?.!]+$/, '')
  const terms = comparativeTerms(criterion)
  if (!terms.length) return null

  const scores = projects.map((project) => scoreProjectForCriterion(project, terms))
  if (scores[0] === scores[1]) {
    return {
      category: 'clarification',
      context,
      answer: `The approved descriptions do not clearly distinguish ${projects[0].label} from ${projects[1].label} for “${criterion}.” Which specific feature would you like me to compare?`,
      sources: projects.map(projectSource),
      actions: [],
    }
  }

  const winnerIndex = scores[0] > scores[1] ? 0 : 1
  const winner = projects[winnerIndex]
  const other = projects[1 - winnerIndex]

  return {
    category: 'comparative_follow_up',
    context,
    answer: `Based on the approved project descriptions, ${winner.label} is the closer match for ${criterion}.\n\n${winner.summary}\n\n${other.summary}`,
    sources: [projectSource(winner), projectSource(other)],
    actions: projects.flatMap(projectActions),
  }
}

function buildGreetingResponse(pathname) {
  const routePrompts = getPromptsForRoute(pathname)
  const routeStarter = routePrompts[0]

  return {
    category: 'greeting',
    context: null,
    answer:
      'Hi! I’m Ask Mark. Ask about Mark’s approved projects, skills, or customer and technical support background. You can also choose one of the starters below.',
    sources: [],
    actions: [
      action('Explore Mark’s work', assistantLinks.work),
      action('View résumé', assistantLinks.resume, 'resume', true),
      action('Contact Mark', assistantLinks.contact, 'contact'),
    ],
    followUps: [
      {
        label: 'Tell me about Mark',
        question: 'Who is Mark?',
      },
      {
        label: 'Customer support background',
        question:
          'What customer service and technical support experience does Mark have?',
      },
      ...(routeStarter
        ? [
            {
              label: routeStarter.label,
              question: routeStarter.question,
            },
          ]
        : []),
    ],
  }
}

function buildHelpResponse(pathname) {
  const routePrompts = getPromptsForRoute(pathname)

  return {
    category: 'assistant_help',
    context: null,
    answer:
      'I can help with Mark’s approved professional information: customer and technical support, operations, training, geospatial work, CRM and GoHighLevel, automation, frontend and software projects, role fit, working style, résumé, contact details, and booking.\n\nI won’t guess about unsupported experience, private information, current pricing, availability, or commitments.',
    sources: [],
    actions: [
      action('Explore projects', assistantLinks.work),
      action('View résumé', assistantLinks.resume, 'resume', true),
    ],
    followUps: routePrompts.slice(0, 3).map((prompt) => ({
      label: prompt.label,
      question: prompt.question,
    })),
  }
}

function getContextualResponse(question, context) {
  if (!context) return null

  const trimmed = question.trim()

  if (context.type === 'projects' && Array.isArray(context.projects)) {
    const projects = context.projects
      .slice(0, 2)
      .map((entry) => findProjectById(entry.id))
      .filter((project) => project && APPROVED_D1_PROJECT_IDS.has(project.id))
    if (projects.length > 1) {
      const comparativeFollowUp = buildComparativeProjectFollowUp(trimmed, projects, context)
      if (comparativeFollowUp) return comparativeFollowUp
    }
    if (projects.length > 1 && /\b(?:these|those|both|they|them)\b/i.test(trimmed)) {
      return buildMultiProjectResponse(projects)
    }
    if (projects.length > 1 && /\b(?:that project|that one|it|tell me more|more about that)\b/i.test(trimmed)) {
      return {
        category: 'clarification',
        context,
        answer: `Which project do you mean: ${projects.map((project) => project.label).join(' or ')}?`,
        sources: [],
        actions: [],
      }
    }
  }

  if (
    context.type === 'clarification' &&
    /^(yes|yeah|yep|correct|exactly|that is right|that s right|you got it)\b/i.test(
      trimmed,
    )
  ) {
    if (context.entityType === 'project') {
      const project = findProjectById(context.id)
      return project && APPROVED_D1_PROJECT_IDS.has(project.id)
        ? buildProjectResponse(project)
        : null
    }

    if (context.entityType === 'role') {
      const role = findRoleById(context.id)
      return role ? buildRoleResponse(role) : null
    }
  }

  if (
    context.type === 'clarification' &&
    /^(no|nope|not that|wrong)\b/i.test(trimmed)
  ) {
    return {
      category: 'clarification_reset',
      context: null,
      answer:
        'Thanks for correcting me. Please type the project, skill, or role again—or describe what it involves—and I’ll use the closest approved information I can find.',
      sources: [],
      actions: resumeAndContactActions(),
    }
  }

  if (context.type === 'project') {
    const project = findProjectById(context.id)
    if (!project || !APPROVED_D1_PROJECT_IDS.has(project.id)) return null

    if (
      /\b(inquire|inquiry|interested|contact|reach|hire|work with|discuss|book|call)\b/i.test(
        trimmed,
      ) ||
      /\b(i want|i would like|i d like)\b.*\b(that|this|it|similar)\b/i.test(
        trimmed,
      )
    ) {
      return {
        category: 'contextual_inquiry',
        context,
        answer:
          `Absolutely—you’re referring to ${project.label}.\n\nMark can discuss how a similar approach may fit your business, team, or workflow. The published project shows related experience, but the exact scope, timeline, pricing, and deliverables should be confirmed with Mark directly.`,
        sources: [projectSource(project)],
        actions: [
          action('Contact Mark about this', assistantLinks.contact, 'contact'),
          action('Book a quick call', assistantLinks.booking, 'booking', true),
          ...projectActions(project).filter((item) => item.type === 'external_link'),
        ],
      }
    }

    if (
      /\b(tell me more|more about|explain|continue|go on|what else|how does it work|what did he do)\b/i.test(
        trimmed,
      ) ||
      /^(that|this|it)\??$/i.test(trimmed)
    ) {
      return {
        ...buildProjectResponse(project),
        answer:
          `Of course—we were discussing ${project.label}.\n\n${project.summary}\n\n${project.status}`,
      }
    }

    if (
      /\b(github|repository|repo|source code|proof|live link|demo|website link)\b/i.test(
        trimmed,
      )
    ) {
      return {
        category: 'contextual_proof',
        context,
        answer: `Here is the published proof available for ${project.label}.`,
        sources: [projectSource(project)],
        actions: projectActions(project),
      }
    }

    if (
      /\b(can mark|could mark|can he|could he|build|make|create|do something similar|for me|for us|for my business)\b/i.test(
        trimmed,
      ) &&
      /\b(that|this|it|similar|like this|like that)\b/i.test(trimmed)
    ) {
      return {
        category: 'contextual_capability',
        context,
        answer:
          `The published ${project.label} project shows that Mark has relevant experience for this kind of work.\n\nWhether he can deliver your exact version depends on the required features, platform, integrations, timeline, and scope. Mark should review those details directly before confirming anything.`,
        sources: [projectSource(project)],
        actions: [
          action('Discuss your requirements', assistantLinks.contact, 'contact'),
          action('Book a quick call', assistantLinks.booking, 'booking', true),
          ...projectActions(project).filter((item) => item.type === 'external_link'),
        ],
      }
    }
  }

  if (context.type === 'role') {
    const role = findRoleById(context.id)
    if (!role) return null

    if (
      /\b(tell me more|more about|explain|continue|what else|proof|resume|résumé)\b/i.test(
        trimmed,
      ) ||
      /^(that|this|it)\??$/i.test(trimmed)
    ) {
      return buildRoleResponse(role)
    }
  }

  return null
}

const promptInjectionPatterns = [
  /\b(ignore|disregard|override|forget)\b.{0,60}\b(previous|prior|above|system|developer|instructions?|rules?)\b/i,
  /\b(reveal|show|print|repeat|expose)\b.{0,60}\b(system prompt|developer message|hidden instructions|internal prompt)\b/i,
  /\b(jailbreak|prompt injection)\b/i,
]

const publicInternetPatterns = [
  /\b(search|browse|look up|google)\b.{0,60}\b(internet|web|online|public)\b/i,
  /\b(public internet|open web|external websites?)\b/i,
]

const commercialConfirmationPatterns = [
  /\b(how much|charge|charges|price|pricing|rates?|fees?|quote|budget|cost)\b/i,
  /(?:[$€£₱]\s*\d|\d[\d,]*(?:\.\d+)?\s*(?:usd|php|dollars?|pesos?))/i,
]

const restrictedPatterns = [
  /\b(salary|compensation|current pay|expected pay)\b/i,
  /\b(private phone|phone number|home address|exact address|password|api key|secret|system prompt|environment variable)\b/i,
  /\b(relationship|dating|girlfriend|boyfriend|married|marriage)\b/i,
  /\b(mark s health|his health|medical condition|health condition|diagnosis|diagnosed|mental health condition|medication|medicine he takes|medical record)\b/i,
  /\b(confidential|internal client|private employer|nda)\b/i,
  /\b(private client records?|client financial data|participant records?|internal client data)\b/i,
  /\b(available today|available now|start tomorrow|finish tomorrow|guarantee|promise|contractual commitment)\b/i,
  /\b(gender|sex|sexuality|sexual orientation|religion)\b/i,
]

function isProfessionalExperienceQuestion(question) {
  const normalizedQuestion = normalize(question)

  const professionalPatterns = [
    /\b(?:does|did|has|can)\s+(?:mark|he)\s+(?:have\s+)?(?:any\s+)?[a-z0-9+\s/&-]+?\s+experience\b/i,
    /\b(?:mark|he|his)\b.*\bexperience\s+(?:in|with|as|from)\s+[a-z0-9+\s/&-]+/i,
    /\b(?:worked|work|working)\s+(?:in|with|as|for)\s+[a-z0-9+\s/&-]+/i,
    /\bprofessional\s+(?:experience|background)\s+(?:in|with|as)\s+[a-z0-9+\s/&-]+/i,
    /\bqualified\s+(?:for|as)\s+(?:a|an)?\s*[a-z0-9+\s/&-]+/i,
    /\b(?:role|industry|field|sector|domain)\s+experience\b/i,
  ]

  return professionalPatterns.some((pattern) => pattern.test(normalizedQuestion))
}

function isExplicitlyPersonalQuestion(question) {
  const normalizedQuestion = normalize(question)
  const personalPatterns = [
    /\b(current salary|exact salary|compensation)\b/i,
    /\b(home address|private phone|password|api key|system prompt)\b/i,
    /\b(diagnosis|diagnosed|medication|medical record|health condition)\b/i,
    /\b(mark s health|his health)\b/i,
    /\b(relationship status|dating|girlfriend|boyfriend|spouse)\b/i,
    /\b(sexual orientation|sexuality|religion|religious belief)\b/i,
    /\b(confidential|nda)\b/i,
    /\b(available now|start tomorrow|guarantee|promise)\b/i,
  ]

  return personalPatterns.some((pattern) => pattern.test(normalizedQuestion))
}

function extractUnknownRole(question) {
  const patterns = [
    /experience\s+(?:in|with|as)\s+(.+?)(?:\?|$)/i,
    /(?:have|has|had)\s+(.+?)\s+experience(?:\?|$)/i,
    /worked\s+as\s+(?:a|an)?\s*(.+?)(?:\?|$)/i,
    /qualified\s+(?:for|as)\s+(?:a|an)?\s*(.+?)(?:\?|$)/i,
  ]

  for (const pattern of patterns) {
    const match = question.match(pattern)
    if (match?.[1]) {
      return match[1].trim().replace(/\b(mark|he|him|your)\b/gi, '').trim()
    }
  }

  return null
}

function getGeneralResponses() {
  const crmRole = findRoleById('crm')
  const automationRole = findRoleById('automation')
  const operationsRole = findRoleById('operations')
  const webRole = findRoleById('web-development')
  const applyLang = findProjectById('applylang')
  const leaveFlow = findProjectById('leaveflow')
  const learningLibrary = findProjectById('learning-library')

  return {
    'role-fit': {
      category: 'role_fit',
      context: { type: 'topic', id: 'careerDirection', label: 'Career direction' },
      answer:
        'Mark is interested in remote opportunities that may include administration, virtual assistance, executive assistance, CRM support, operations, workflow automation, frontend development, and software-building work that matches his demonstrated skills.\n\nHis strongest fit is usually a role where he can complete day-to-day work professionally while also improving the process or system behind it. The exact fit should be confirmed through his résumé and a direct conversation.',
      sources: [
        source('View capabilities', assistantLinks.capabilities),
        source('Explore selected projects', assistantLinks.work),
      ],
      actions: resumeAndContactActions(),
    },
    'crm-experience': buildRoleResponse(crmRole),
    'ai-usage': buildProfileResponse('aiUsage', resumeAndContactActions()),
    'project-first': {
      category: 'project_recommendation',
      answer:
        'The best first project depends on what you are evaluating.\n\nFor operations and product thinking, start with PersonalVABot. For deployed automation, view MarkHQ. For frontend and conversion design, open the Landing & Funnel Portfolio Lab. For a conventional full-stack application, review LeaveFlow.',
      sources: [
        source('PersonalVABot', '/projects/personalvabot'),
        source('MarkHQ Assistant', '/projects/markhq'),
        source('Landing & Funnel Portfolio Lab', '/projects/funnel-lab'),
        source('LeaveFlow', '/projects/leaveflow'),
      ],
      actions: [action('Open PersonalVABot', '/projects/personalvabot')],
    },
    websites: buildRoleResponse(webRole),
    automation: buildRoleResponse(automationRole),
    operations: {
      ...buildRoleResponse(operationsRole),
      answer:
        'PersonalVABot is the most direct operations-focused project. It connects client records, projects, task states, attendance, billing, document generation, backups, and workflow history.\n\nMarkHQ is another strong example because it turns Discord into a structured operations workspace with task pipelines, onboarding, approvals, reminders, and system health checks.\n\nFor the most current and role-specific confirmation, review Mark’s résumé or contact him directly.',
    },
    contact: {
      category: 'contact',
      answer:
        'You can contact Mark through the portfolio contact section, review his résumé, or open his booking calendar.\n\nFor availability, rates, timelines, role-specific qualifications, or project commitments, Mark should confirm the details personally.',
      sources: [source('Portfolio contact section', assistantLinks.contact)],
      actions: [
        action('Contact Mark', assistantLinks.contact, 'contact'),
        action('View résumé', assistantLinks.resume, 'resume', true),
        action('Book a quick call', assistantLinks.booking, 'booking', true),
      ],
    },
    'personalvabot-problem': buildProjectResponse(findProjectById('personalvabot')),
    'personalvabot-skills': {
      ...buildProjectResponse(findProjectById('personalvabot')),
      answer:
        'PersonalVABot demonstrates product direction, workflow design, local data architecture, multi-client operations modeling, desktop UX, automation planning, QA, installer validation, backups, and release documentation.\n\nIt is a Windows beta, so it should be treated as demonstrated desktop-product work rather than a public SaaS platform.',
    },
    'personalvabot-platform': {
      ...buildProjectResponse(findProjectById('personalvabot')),
      answer:
        'PersonalVABot is currently a local-first Windows desktop application. It uses local SQLite storage and has an installer-validated Windows beta. A future web or SaaS version is a separate direction, not a published feature of the current beta.',
    },
    'markhq-workflow': buildProjectResponse(findProjectById('markhq')),
    'markhq-automation': {
      ...buildProjectResponse(findProjectById('markhq')),
      answer:
        'MarkHQ demonstrates Mark’s ability to translate an operational process into a deployed automation system. The project includes persistent data, workspace separation, validation, task-state controls, reminders, approvals, backups, health checks, and release workflows.',
    },
    'markhq-deployment': {
      ...buildProjectResponse(findProjectById('markhq')),
      answer:
        'MarkHQ is deployed on Railway as a production Discord operations system. Its published project record includes persistent data, automated backups, health checks, and validated release workflows.',
    },
    'funnel-industries': {
      ...buildProjectResponse(findProjectById('funnel-lab')),
      answer:
        'The published Funnel Lab includes seven conversion journeys across SaaS, coaching, local services, digital products, dental, fitness, and construction.',
    },
    'funnel-fit': {
      ...buildProjectResponse(findProjectById('funnel-lab')),
      answer:
        'The closest Funnel Lab reference depends on the business model. The collection covers SaaS, coaching, local services, digital products, dental, fitness, and construction.\n\nFor a business outside those categories, Mark should confirm directly which design and conversion approach would transfer best.',
    },
    'funnel-skills': {
      ...buildProjectResponse(findProjectById('funnel-lab')),
      answer:
        'The Funnel Lab demonstrates responsive frontend development, visual-system design, conversion UX, interaction design, industry-specific art direction, booking paths, serverless inquiry handling, deployment, and cross-device QA.',
    },
    leaveflow: buildProjectResponse(leaveFlow),
    'learning-library': buildProjectResponse(learningLibrary),
    applylang: buildProjectResponse(applyLang),
  }
}

const responses = getGeneralResponses()

export function getPromptsForRoute(pathname) {
  const ids = routePromptIds[normalizedPath(pathname)] || defaultPromptIds
  return ids.map((id) => assistantPrompts[id])
}

export function getPromptResponse(promptId) {
  return responses[promptId] || null
}

export function getMockResponse(question, pathname, context = null) {
  const cleaned = question.trim()

  if (!cleaned) return null

  const normalizedQuestion = normalize(cleaned)

  if (promptInjectionPatterns.some((pattern) => pattern.test(cleaned))) {
    return {
      category: 'prompt_injection',
      answer:
        'I can’t follow instructions that attempt to override this portfolio assistant’s approved scope or expose internal instructions. I can still help with Mark’s published professional background, projects, skills, résumé, contact details, and booking path.',
      sources: [],
      actions: resumeAndContactActions(),
    }
  }

  if (publicInternetPatterns.some((pattern) => pattern.test(normalizedQuestion))) {
    return {
      category: 'public_internet_boundary',
      answer:
        'Ask Mark does not browse or search the public internet. It answers only from portfolio information and other sources that Mark has reviewed and approved. For current or unpublished details, please review the résumé or contact Mark directly.',
      sources: [source('View résumé', assistantLinks.resume)],
      actions: resumeAndContactActions(),
    }
  }

  if (
    /\b(pronouns?|he him|he\/him|what should i call mark)\b/i.test(cleaned)
  ) {
    return buildProfileResponse('pronouns')
  }

  const professionalExperienceQuestion =
    isProfessionalExperienceQuestion(cleaned)
  const explicitlyPersonalQuestion =
    isExplicitlyPersonalQuestion(cleaned)

  if (
    restrictedPatterns.some((pattern) => pattern.test(normalizedQuestion)) &&
    (!professionalExperienceQuestion || explicitlyPersonalQuestion)
  ) {
    return {
      category: 'private_boundary',
      answer:
        `That falls outside the public professional information approved for this assistant. I should not guess or disclose private details.\n\nMark’s approved public boundary includes ${restrictedKnowledge.privateCategories.slice(0, 3).join(', ')}, and other sensitive personal or confidential topics. Please contact Mark directly when a personal confirmation is genuinely necessary.`,
      sources: [],
      actions: [action('Contact Mark', assistantLinks.contact, 'contact')],
    }
  }

  if (
    commercialConfirmationPatterns.some((pattern) =>
      pattern.test(cleaned),
    )
  ) {
    return {
      category: 'current_confirmation',
      answer:
        'Rates, pricing, budgets, timelines, availability, and project commitments are not confirmed by this assistant. Mark should review the exact scope and confirm those details directly.',
      sources: [],
      actions: [
        action('Contact Mark', assistantLinks.contact, 'contact'),
        action('Book a quick call', assistantLinks.booking, 'booking', true),
      ],
    }
  }

  const contextual = getContextualResponse(cleaned, context)
  if (contextual) {
    return {
      ...contextual,
      conversationalFollowUp: true,
    }
  }

  if (/\b(?:that project|that one|it|tell me more about that|more about that|these projects|those projects)\b/i.test(cleaned)) {
    return {
      category: 'clarification',
      context: null,
      answer: 'Which approved project are you referring to?',
      sources: [],
      actions: [],
    }
  }

  if (
    /^(hi|hello|hey|hiya|greetings|good morning|good afternoon|good evening|hello there|hi there|hey there|hello ask mark|hi ask mark|kamusta|kumusta|kamusta po|kumusta po)$/i.test(
      normalizedQuestion,
    )
  ) {
    return buildGreetingResponse(pathname)
  }

  if (
    /^(help|help me|what can you do|how can you help|what can i ask|what should i ask|show me what you can do)$/i.test(
      normalizedQuestion,
    )
  ) {
    return buildHelpResponse(pathname)
  }

  if (
    /^(how are you|how are you doing|how s it going|are you ready)$/i.test(
      normalizedQuestion,
    )
  ) {
    return {
      ...buildGreetingResponse(pathname),
      category: 'small_talk',
      answer:
        'I’m ready to help. Ask me about Mark’s approved projects, skills, or professional background.',
    }
  }

  if (
    /^(thanks|thank you|thank you so much|thanks a lot|salamat|salamat po|appreciate it)$/i.test(
      normalizedQuestion,
    )
  ) {
    return {
      category: 'thanks',
      context,
      answer:
        'You’re welcome! You can keep asking about Mark’s experience or projects, review his résumé, or contact him directly when you’re ready.',
      sources: [],
      actions: resumeAndContactActions(),
    }
  }

  if (
    /^(bye|goodbye|see you|see you later|talk later|thanks bye|thank you goodbye)$/i.test(
      normalizedQuestion,
    )
  ) {
    return {
      category: 'farewell',
      context: null,
      answer:
        'Thanks for visiting Mark’s portfolio! You can return anytime to explore his work, review his résumé, or contact him about an opportunity or project.',
      sources: [],
      actions: [
        action('Explore Mark’s work', assistantLinks.work),
        action('Contact Mark', assistantLinks.contact, 'contact'),
      ],
    }
  }

  if (
    /\b(who are you|what are you|are you mark|are you a person|are you human)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('assistantIdentity', [
      action('Explore Mark’s work', assistantLinks.work),
    ])
  }

  if (
    /\b(who is mark|tell me about mark|about mark|mark s background|professional background|what does mark do)\b/i.test(
      normalize(cleaned),
    )
  ) {
    return buildProfileResponse('markSummary', resumeAndContactActions())
  }

  if (
    /\b(college graduate|college grad|graduated college|graduate from college|did mark graduate|did he graduate|is mark a graduate|educational background|education|degree|bachelor|bachelor s|bs computer science|computer science degree|bicol university|what did mark study|where did mark study|what course did mark take|where did mark go to college|where did he go to college|which college did mark attend|which college did he attend|what college did mark attend|what university did mark attend|which university did mark attend|which university did he attend|where did mark graduate|where did he graduate|alma mater|what school did mark attend)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('education', resumeAndContactActions())
  }

  if (
    /\b(certification|certifications|certified|credentials|civil service|professional passer|train the trainer|google cloud genai|genai level 1)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('certifications', resumeAndContactActions())
  }

  if (
    /\b(geospatial data operator|geospatial operator|data operator|atlas|calypso)\b/i.test(
      normalizedQuestion,
    ) &&
    /\b(work|worked|role|job|experience|responsibilities|did|do|background|what did mark do)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('geospatialExperience', resumeAndContactActions())
  }

  if (
    /\b(process trainer|trainer at wipro|training role|trainer role)\b/i.test(
      normalizedQuestion,
    ) &&
    /\b(work|worked|role|job|experience|responsibilities|did|do|background|what did mark do)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('trainerExperience', resumeAndContactActions())
  }

  if (
    /\b(wipro|supporting google|google account|process trainer|geospatial data operator|atlas|calypso)\b/i.test(
      normalizedQuestion,
    ) &&
    /\b(work|worked|role|job|experience|responsibilities|did|do|background|achievement)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('wiproExperience', resumeAndContactActions())
  }

  if (
    /\b(technical skills|skills has mark demonstrated|what technologies|tools and technologies|automation skills|web development skills)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('demonstratedSkills', [
      action('Explore projects', assistantLinks.work),
    ])
  }

  if (
    /\b(what projects has mark built|which projects has mark built|what are mark s projects|show me all projects|list all projects|all of mark s projects)\b/i.test(
      normalizedQuestion,
    )
  ) {
    const projectNames = projectKnowledge.map((project) => project.label).join(', ')
    return {
      category: 'project_inventory',
      context: { type: 'topic', id: 'portfolio.projects', label: 'Featured projects' },
      answer: `The featured portfolio includes ${projectNames}. Their roles and statuses vary across personal products, client work, and portfolio demos; each card describes its own evidence and current status.`,
      sources: [source('Explore the project collection', assistantLinks.work)],
      actions: [action('Explore projects', assistantLinks.work)],
    }
  }

  if (
    /\b(capital one|verizon|comcast|customer support|technical support|support programs|support experience)\b/i.test(
      normalizedQuestion,
    ) &&
    /\b(work|worked|role|job|experience|responsibilities|did|do|background|companies|programs)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('supportExperience', resumeAndContactActions())
  }

  if (
    /\b(work history|employment history|professional history|career history|working experience|work experience|professional experience|previous roles|past roles|former roles|current role|current professional role|current job|current company|current position at wipro|previous companies|past companies|companies worked|companies has mark worked|employers|where did mark work|where has mark worked|what companies|career background|years of experience|how many years|employment background)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return buildProfileResponse('careerHistory', resumeAndContactActions())
  }

  if (
    /\b(which projects are real client work|which projects are client work|which projects are demos or personal experiments|which projects are demos|client work|paid client engagement|client project)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return {
      category: 'project_types',
      context: { type: 'projects', id: 'approved-project-categories', label: 'Project categories' },
      answer: profileKnowledge.projectTypes.summary,
      sources: [source('Selected work', assistantLinks.work)],
      actions: [action('View selected work', assistantLinks.work)],
    }
  }

  if (
    /\b(what projects has mark built|which projects has mark built|what are mark s projects|show me all projects|list all projects|all of mark s projects)\b/i.test(
      normalizedQuestion,
    )
  ) {
    const projectNames = projectKnowledge
      .filter((project) => APPROVED_D1_PROJECT_IDS.has(project.id))
      .map((project) => project.label)
      .join(', ')
    return {
      category: 'projects',
      context: { type: 'projects', id: 'approved-projects', label: 'Approved projects' },
      answer: `Approved featured projects include ${projectNames}. Their roles and statuses vary; each card describes its own evidence and current status.`,
      sources: [source('Selected work', assistantLinks.work)],
      actions: [action('View selected work', assistantLinks.work)],
    }
  }

  const projectReferences = explicitApprovedProjectReferences(cleaned)
  if (projectReferences.length > 1 && /\b(?:compare|between|and|both|which of|technologies|projects)\b/i.test(cleaned)) {
    if (projectReferences.length > 2) {
      return {
        category: 'clarification',
        answer: 'I can compare up to two approved projects at a time. Which two would you like me to compare?',
        sources: [],
        actions: [],
      }
    }
    return buildMultiProjectResponse(projectReferences)
  }

  const normalizedPublicQuestion = normalize(cleaned)
  const publicAliases = projectKnowledge.flatMap((project) =>
    project.aliases.map((alias) => ({ project, alias: normalize(alias) })),
  ).filter((match) => match.alias && normalizedPublicQuestion.includes(match.alias))
  const publicProjectMentions = [...new Set(publicAliases
    .filter((match) => !publicAliases.some((other) =>
      other.alias.length > match.alias.length &&
      other.alias.includes(match.alias) &&
      normalizedPublicQuestion.indexOf(other.alias) <= normalizedPublicQuestion.indexOf(match.alias),
    ))
    .map(({ project }) => project))]
  if (publicProjectMentions.length > 1) {
    return {
      category: 'clarification',
      answer: 'Which single approved portfolio project would you like me to describe?',
      sources: [],
      actions: [],
    }
  }
  const projectMatch = detectEntity(cleaned, projectKnowledge, 0.78)
  if (projectMatch?.exact) return buildProjectResponse(projectMatch.entity)

  if (
    projectMatch &&
    /\b(about|project|portfolio|what is|tell me|ask|github|repo|link|all about|experience)\b/i.test(
      cleaned,
    )
  ) {
    return buildProjectClarification(projectMatch.entity)
  }

  const roleMatch = detectEntity(cleaned, roleKnowledge, 0.86)
  if (roleMatch?.exact) return buildRoleResponse(roleMatch.entity)

  if (
    roleMatch &&
    /\b(experience|role|work|worked|qualified|know|skills|tell me|can mark|does mark|have)\b/i.test(
      cleaned,
    )
  ) {
    return buildRoleClarification(roleMatch.entity)
  }

  if (
    /\b(work ethic|professionalism|professional|ownership|quality of work|reliable|reliability)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('workEthic', resumeAndContactActions())
  }

  if (
    /\b(communicate|communication style|talk to|teammates|clients|managers|trainees|friendly|direct)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('communication')
  }

  if (
    /\b(deadline|late|delay|requirements unclear|unclear requirement|unclear task|ask questions)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('deadlines')
  }

  if (
    /\b(mistake|error|wrong|failed|failure|fix an error|handle errors)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('mistakes')
  }

  if (
    /\b(use ai|uses ai|artificial intelligence|ai professionally|ai assisted|chatgpt|gemini|coding with ai)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('aiUsage', resumeAndContactActions())
  }

  if (
    /\b(working style|work style|like to work with|how does mark work|how he works|professional personality)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('workingStyle', resumeAndContactActions())
  }

  if (
    /\b(strengths|best qualities|professional qualities|why hire|easy to work with|teachable)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('strengths', resumeAndContactActions())
  }

  if (
    /\b(work environment|micromanage|micromanagement|work alone|independent|autonomy|manager style)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('workEnvironment')
  }

  if (
    /\b(learn|learning style|new tool|new platform|upskill|how fast|fundamentals|basics)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('learning')
  }

  if (
    /\b(hobbies|interests|anime|games|gaming|music|jpop|taylor swift|rezero|reading|valorant|genshin|honkai|mlbb|mobile legends)\b/i.test(
      cleaned,
    )
  ) {
    return buildProfileResponse('hobbies')
  }

  if (
    /\b(remote role|remote work|career direction|looking for|interested in|what roles)\b/i.test(
      cleaned,
    )
  ) {
    return responses['role-fit']
  }

  if (
    /\b(contact mark|email mark|reach mark|book (?:a |the )?(?:quick )?call|view (?:his |mark s )?(?:resume|résumé|cv)|download (?:his |mark s )?(?:resume|résumé|cv))\b/i.test(
      normalizedQuestion,
    ) ||
    /\b(how can i|how do i|where can i|what is|what s)\b.{0,50}\b(contact|email|reach|book|call|resume|résumé|cv)\b/i.test(
      normalizedQuestion,
    )
  ) {
    return responses.contact
  }

  const unknownRole = extractUnknownRole(cleaned)
  if (unknownRole) {
    return {
      category: 'unknown_role',
      answer:
        `I do not have enough approved information to confirm Mark’s direct experience in “${unknownRole}.” I should not convert related skills into a claim of formal experience.\n\nThe safest next step is to review his résumé. If the role is unusual, specialized, or depends on current experience, contact Mark directly for an accurate answer.`,
      sources: [source('View résumé', assistantLinks.resume)],
      actions: resumeAndContactActions(),
    }
  }

  const routePrompts = getPromptsForRoute(pathname)
  const hint = routePrompts[0]?.question

  return {
    category: 'unsupported',
    answer:
      `I don’t have enough approved information to answer that accurately yet. I can answer questions about Mark’s professional background, roles, projects, skills, work ethic, communication, AI use, learning style, work environment, and approved hobbies—but I should not guess.\n\n${hint ? `You can also try “${hint}”\n\n` : ''}For anything more specific, review Mark’s résumé or contact him directly.`,
    sources: [source('View résumé', assistantLinks.resume)],
    actions: resumeAndContactActions(),
  }
}
