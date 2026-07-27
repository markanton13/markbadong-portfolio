import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { rmSync } from 'node:fs'
import path from 'node:path'
import workerModule from '../workers/ask-mark/src/index.js'
import {
  config,
  fail,
  migrate,
  query,
  root,
  worker,
  wranglerCli,
} from './lib/ask-mark-d1.mjs'

const state = path.join(
  worker,
  '.wrangler-intake-api-check',
)

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function expect(condition, message) {
  if (!condition) fail(message)
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port =
        typeof address === 'object' ? address.port : null

      server.close((error) => {
        if (error) reject(error)
        else if (!port) {
          reject(new Error('Could not reserve a local port.'))
        } else {
          resolve(port)
        }
      })
    })
  })
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options)
  const body = await response.json()

  return {
    response,
    body,
  }
}

async function waitForWorker(baseUrl, child, logs) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      fail(
        'Wrangler dev exited before intake became available.',
        logs(),
      )
    }

    try {
      const response = await fetch(
        `${baseUrl}/v1/intake/submissions`,
      )

      if (response.status === 405) return
    } catch {
      // Wrangler is still starting.
    }

    await sleep(200)
  }

  fail(
    'Timed out while waiting for the local intake endpoint.',
    logs(),
  )
}

async function removeDisposableState({ strict = false } = {}) {
  const retryableCodes = new Set([
    'EPERM',
    'EBUSY',
    'ENOTEMPTY',
  ])

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      rmSync(state, {
        recursive: true,
        force: true,
      })

      return true
    } catch (error) {
      const retryable =
        error &&
        typeof error === 'object' &&
        retryableCodes.has(error.code)

      if (!retryable) throw error

      if (attempt < 20) {
        await sleep(250)
        continue
      }

      if (strict) throw error

      console.warn(
        'Disposable intake API state remains locked at ' +
          state,
      )

      return false
    }
  }

  return false
}

async function stopWorkerProcess(child) {
  if (!child || child.exitCode !== null) return

  if (process.platform === 'win32' && child.pid) {
    spawnSync(
      'taskkill',
      ['/pid', String(child.pid), '/T', '/F'],
      {
        stdio: 'ignore',
        windowsHide: true,
      },
    )
  } else {
    child.kill('SIGTERM')
  }

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(5_000),
  ])

  if (child.exitCode === null) {
    child.kill('SIGKILL')
    await sleep(500)
  }
}

const disabledRequest = new Request(
  'https://example.test/v1/intake/submissions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'question',
      language: 'en',
      message: 'This disabled route must remain unavailable.',
    }),
  },
)

const disabledResponse = await workerModule.fetch(
  disabledRequest,
  {
    ASK_MARK_DB: {},
  },
)

assert.equal(disabledResponse.status, 404)

const shortKeyResponse = await workerModule.fetch(
  new Request(
    'https://example.test/v1/intake/submissions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'question',
        language: 'en',
        message: 'A short key must fail closed safely.',
      }),
    },
  ),
  {
    ASK_MARK_DB: {},
    ASK_MARK_INTAKE_MODE: 'local-only',
    ASK_MARK_INTAKE_HASH_KEY: 'too-short',
  },
)

assert.equal(shortKeyResponse.status, 404)

await removeDisposableState({ strict: true })
migrate(state)

const baseline = query(
  state,
  [
    'SELECT',
    '(SELECT COUNT(*) FROM knowledge_items) AS knowledge_count,',
    '(SELECT COUNT(*) FROM publication_releases) AS release_count,',
    '(SELECT COUNT(*) FROM v_active_knowledge) AS active_count;',
  ].join(' '),
)

let workerProcess
let validationSucceeded = false
let stdout = ''
let stderr = ''

try {
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`

  workerProcess = spawn(
    process.execPath,
    [
      wranglerCli,
      'dev',
      '--local',
      '--persist-to',
      state,
      '--config',
      config,
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        CI: '1',
        WRANGLER_SEND_METRICS: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  workerProcess.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })

  workerProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  const logs = () => `${stdout}\n${stderr}`.trim()

  await waitForWorker(baseUrl, workerProcess, logs)

  const submit = ({
    message,
    type = 'question',
    language = 'en',
    requester = 'client-a',
    origin,
  }) =>
    jsonRequest(
      `${baseUrl}/v1/intake/submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ask-Mark-Local-Requester': requester,
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify({
          type,
          language,
          message,
        }),
      },
    )

  const first = await submit({
    message: 'What CRM projects has Mark completed?',
    origin: 'http://localhost:5173',
  })

  expect(first.response.status === 202, 'First intake was not accepted.')
  expect(first.body.ok === true, 'First intake response was not successful.')
  expect(
    first.body.submission?.status === 'pending_review',
    'Accepted intake did not enter pending_review.',
  )
  expect(
    typeof first.body.submission?.id === 'string' &&
      first.body.submission.id.startsWith('submission_'),
    'Accepted intake did not return an opaque submission ID.',
  )
  expect(
    first.response.headers.get('cache-control') === 'no-store',
    'Accepted intake was not marked no-store.',
  )
  expect(
    first.response.headers.get('access-control-allow-origin') ===
      'http://localhost:5173',
    'Approved local origin did not receive CORS.',
  )
  expect(
    !('contentHash' in first.body) &&
      !('bucketHash' in first.body) &&
      !('deduplicationHash' in first.body),
    'Accepted response exposed internal hashes.',
  )

  const duplicate = await submit({
    message: 'What CRM projects has Mark completed?',
  })

  expect(
    duplicate.response.status === 409 &&
      duplicate.body.error?.code === 'duplicate_submission',
    'Duplicate intake was not rejected with 409.',
  )

  const acceptedMessages = [
    {
      message: "Please clarify Mark's GHL experience.",
      type: 'correction',
      language: 'en',
    },
    {
      message: "Helpful ito tungkol sa training work ni Mark.",
      type: 'feedback',
      language: 'taglish',
    },
    {
      message: 'Makakagawa ba si Mark ng client dashboard?',
      type: 'question',
      language: 'tl',
    },
    {
      message: "Please explain Mark's automation skills.",
      type: 'question',
      language: 'en',
    },
  ]

  for (const submission of acceptedMessages) {
    const accepted = await submit(submission)

    expect(
      accepted.response.status === 202,
      'One of the five allowed requests was rejected.',
    )
  }

  const rateLimited = await submit({
    message: 'Does Mark have bookkeeping experience?',
  })

  expect(
    rateLimited.response.status === 429 &&
      rateLimited.body.error?.code === 'rate_limited',
    'Sixth accepted attempt was not rate limited.',
  )
  expect(
    Number(rateLimited.response.headers.get('retry-after')) > 0,
    'Rate-limited response omitted Retry-After.',
  )

  const secondRequester = await submit({
    requester: 'client-b',
    message: 'What CRM projects has Mark completed?',
  })

  expect(
    secondRequester.response.status === 202,
    'A second requester was incorrectly deduplicated.',
  )

  const unsupportedMedia = await fetch(
    `${baseUrl}/v1/intake/submissions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Ask-Mark-Local-Requester': 'client-a',
      },
      body: 'not json',
    },
  )

  expect(
    unsupportedMedia.status === 415,
    'Unsupported media type did not return 415.',
  )

  const duplicateFields = await jsonRequest(
    `${baseUrl}/v1/intake/submissions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ask-Mark-Local-Requester': 'client-a',
      },
      body:
        '{"type":"question","type":"feedback",' +
        '"language":"en",' +
        '"message":"Duplicate fields must be rejected."}',
    },
  )

  expect(
    duplicateFields.response.status === 400 &&
      duplicateFields.body.error?.code === 'duplicate_field',
    'Duplicate JSON fields did not return 400.',
  )

  const oversized = await submit({
    message: 'x'.repeat(5000),
  })

  expect(
    oversized.response.status === 413 &&
      oversized.body.error?.code === 'payload_too_large',
    'Oversized request did not return 413.',
  )

  const invalidUtf8 = await jsonRequest(
    `${baseUrl}/v1/intake/submissions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ask-Mark-Local-Requester': 'client-a',
      },
      body: new Uint8Array([0xff, 0xfe, 0xfd]),
    },
  )

  expect(
    invalidUtf8.response.status === 400 &&
      invalidUtf8.body.error?.code === 'invalid_unicode',
    'Invalid UTF-8 did not return 400.',
  )

  const wrongMethod = await jsonRequest(
    `${baseUrl}/v1/intake/submissions`,
  )

  expect(
    wrongMethod.response.status === 405 &&
      wrongMethod.response.headers.get('allow') ===
        'POST, OPTIONS',
    'GET intake method did not return exact 405 metadata.',
  )

  const unapprovedOrigin = await submit({
    requester: 'client-c',
    message: 'This origin must not receive a CORS grant.',
    origin: 'https://example.com',
  })

  expect(
    unapprovedOrigin.response.status === 202,
    'Unapproved-origin request was not processed server-side.',
  )
  expect(
    unapprovedOrigin.response.headers.get(
      'access-control-allow-origin',
    ) === null,
    'Unapproved origin received a CORS grant.',
  )

  await stopWorkerProcess(workerProcess)
  workerProcess = null
  await sleep(500)

  const result = query(
    state,
    [
      'SELECT',
      '(SELECT COUNT(*) FROM visitor_submissions) AS submission_count,',
      '(SELECT COUNT(*) FROM visitor_submission_events) AS event_count,',
      '(SELECT COUNT(*) FROM visitor_rate_limit_buckets) AS bucket_count,',
      '(SELECT MAX(request_count) FROM visitor_rate_limit_buckets)',
      'AS maximum_request_count,',
      '(SELECT COUNT(*) FROM visitor_submissions',
      "WHERE status = 'pending_review') AS pending_count,",
      '(SELECT COUNT(*) FROM visitor_submissions',
      'WHERE expires_at <= created_at) AS invalid_expiry_count,',
      '(SELECT COUNT(*) FROM visitor_submissions',
      'WHERE length(content_hash) <> 64',
      'OR length(deduplication_hash) <> 64)',
      'AS invalid_submission_hash_count,',
      '(SELECT COUNT(*) FROM visitor_rate_limit_buckets',
      'WHERE length(bucket_hash) <> 64)',
      'AS invalid_bucket_hash_count,',
      '(SELECT COUNT(*) FROM knowledge_items) AS knowledge_count,',
      '(SELECT COUNT(*) FROM publication_releases) AS release_count,',
      '(SELECT COUNT(*) FROM v_active_knowledge) AS active_count,',
      '(SELECT COUNT(*) FROM pragma_foreign_key_check)',
      'AS foreign_key_issue_count;',
    ].join(' '),
  )

  expect(
    Number(result.submission_count) === 7,
    'Expected seven accepted submissions.',
  )
  expect(
    Number(result.event_count) === 14,
    'Expected two lifecycle events per accepted submission.',
  )
  expect(
    Number(result.bucket_count) === 3,
    'Expected three local requester buckets.',
  )
  expect(
    Number(result.maximum_request_count) === 5,
    'Duplicate or rate-limited attempts changed the capped bucket.',
  )
  expect(
    Number(result.pending_count) === 7,
    'Accepted submissions did not remain pending_review.',
  )
  expect(
    Number(result.invalid_expiry_count) === 0,
    'A submission has invalid expiry metadata.',
  )
  expect(
    Number(result.invalid_submission_hash_count) === 0 &&
      Number(result.invalid_bucket_hash_count) === 0,
    'Stored hashes are malformed.',
  )
  expect(
    Number(result.knowledge_count) ===
      Number(baseline.knowledge_count) &&
      Number(result.release_count) ===
        Number(baseline.release_count) &&
      Number(result.active_count) ===
        Number(baseline.active_count),
    'Intake changed knowledge or publication state.',
  )
  expect(
    Number(result.foreign_key_issue_count) === 0,
    'Intake API rows failed foreign-key integrity.',
  )

  validationSucceeded = true

  console.log(
    'Ask Mark local intake API checks passed: fail-closed mode guard, ' +
      '202 acceptance, opaque responses, validation, exact methods, CORS, ' +
      'per-window duplicate suppression, five-attempt limiting, ' +
      'requester isolation, lifecycle rows, expiry metadata, and zero ' +
      'knowledge/publication coupling.',
  )
} finally {
  await stopWorkerProcess(workerProcess)

  if (validationSucceeded) {
    await removeDisposableState()
  } else {
    console.error(
      `Disposable intake API state retained at ${state}`,
    )

    if (stdout || stderr) {
      console.error(`${stdout}\n${stderr}`.trim())
    }
  }
}
