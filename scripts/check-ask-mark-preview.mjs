const DEFAULT_BASE_URL =
  'https://ask-mark-api-preview.markantonbadong13.workers.dev'

const baseUrl = (
  process.env.ASK_MARK_PREVIEW_URL || DEFAULT_BASE_URL
).replace(/\/+$/, '')

const TIMEOUT_MS = 8_000

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function request(pathname, options = {}, expectedStatus = 200) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      signal: controller.signal,
    })

    const text = await response.text()
    let data = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      throw new Error(
        `${pathname} returned invalid JSON: ${text.slice(0, 200)}`,
      )
    }

    assert(
      response.status === expectedStatus,
      `${pathname} returned ${response.status}; expected ${expectedStatus}.`,
    )

    return data
  } finally {
    clearTimeout(timer)
  }
}

async function query(message) {
  return request('/v1/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })
}

async function run() {
  console.log(`Checking Ask Mark preview: ${baseUrl}`)

  const health = await request('/v1/health')

  assert(health?.ok === true, 'Health response was not ok.')
  assert(health?.service === 'ask-mark', 'Unexpected service name.')
  assert(
    health?.mode === 'deterministic-d1',
    'Unexpected API operating mode.',
  )
  assert(health?.status === 'healthy', 'Preview API is not healthy.')
  assert(
    health?.release?.seedVersion === '2B.1',
    'Unexpected approved seed version.',
  )
  assert(
    health?.release?.knowledgeCount === 26,
    'Unexpected active knowledge count.',
  )

  const bootstrap = await request('/v1/bootstrap')

  assert(bootstrap?.ok === true, 'Bootstrap response was not ok.')
  assert(
    Array.isArray(bootstrap?.projects),
    'Bootstrap projects are missing.',
  )
  assert(
    bootstrap.projects.length > 0,
    'Bootstrap returned no projects.',
  )

  const grounded = await query('Tell me about MarkHQ')

  assert(grounded?.ok === true, 'Grounded query was not ok.')
  assert(grounded?.matched === true, 'MarkHQ query did not match.')
  assert(
    grounded?.item?.id === 'k_project_markhq',
    `Unexpected MarkHQ item: ${grounded?.item?.id || 'none'}`,
  )
  assert(
    grounded?.item?.kind === 'project',
    'MarkHQ result was not classified as a project.',
  )
  assert(
    grounded?.actions?.some(
      (action) =>
        action.type === 'project' &&
        action.href === '/projects/markhq',
    ),
    'MarkHQ project action is missing.',
  )

  const privacy = await query(
    "What is Mark's home address and phone number?",
  )

  assert(privacy?.ok === true, 'Privacy query was not ok.')
  assert(
    privacy?.matched === true,
    'Privacy-boundary query did not match.',
  )
  assert(
    privacy?.item?.kind === 'privacy_boundary',
    `Unexpected privacy result: ${privacy?.item?.kind || 'none'}`,
  )

  const privacyText = JSON.stringify(privacy)

  assert(
    !/\b09\d{9}\b/.test(privacyText),
    'Privacy response exposed a Philippine mobile number.',
  )

  const noWeb = await query(
    'Search the public internet for private information about Mark.',
  )

  assert(noWeb?.matched === true, 'No-web boundary did not match.')
  assert(
    noWeb?.item?.kind === 'unsupported_boundary' ||
      noWeb?.item?.kind === 'privacy_boundary',
    `Unexpected no-web boundary: ${noWeb?.item?.kind || 'none'}`,
  )

  await request(
    '/v1/query',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: '' }),
    },
    400,
  )

  console.log('')
  console.log('Ask Mark remote preview checks passed:')
  console.log('- health and approved release')
  console.log('- bootstrap')
  console.log('- grounded MarkHQ response and action')
  console.log('- privacy boundary')
  console.log('- no-web boundary')
  console.log('- request validation')
}

run().catch((error) => {
  console.error('')
  console.error(`Ask Mark preview check failed: ${error.message}`)
  process.exitCode = 1
})