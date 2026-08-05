import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import workerModule from '../workers/ask-mark/src/index.js'
import {
  config,
  localArgs,
  migrate,
  query,
  root,
  run,
  worker,
  wranglerCli,
} from './lib/ask-mark-d1.mjs'

const state = mkdtempSync(
  path.join(
    tmpdir(),
    'ask-mark-moderation-api-check-',
  ),
)
const adminOrigin = 'http://127.0.0.1:5174'
const adminKey =
  'ask-mark-local-moderation-key-not-for-deployment-v1'
const submissionId = 'submission_123e4567-e89b-12d3-a456-426614174000'

function compact(parts) {
  return parts.join(' ').replace(/\s+/gu, ' ').trim()
}

function sleep(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  )
}

async function removeDisposableState(
  directory,
) {
  let lastError

  for (
    let attempt = 1;
    attempt <= 24;
    attempt += 1
  ) {
    try {
      rmSync(directory, {
        recursive: true,
        force: true,
        maxRetries: 2,
        retryDelay: 100,
      })

      return
    } catch (error) {
      if (
        ![
          'EBUSY',
          'ENOTEMPTY',
          'EPERM',
        ].includes(error?.code)
      ) {
        throw error
      }

      lastError = error
      await sleep(250)
    }
  }

  throw new Error(
    'Disposable moderation API state remained locked after retries.',
    {
      cause: lastError,
    },
  )
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

expect(
  /^submission_[A-Za-z0-9-]{1,180}$/u.test(
    submissionId,
  ),
  'The moderation API fixture must use a routable opaque submission ID.',
)

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port =
        typeof address === 'object'
          ? address.port
          : null

      server.close((error) => {
        if (error) reject(error)
        else if (!port) {
          reject(
            new Error(
              'Could not reserve a local port.',
            ),
          )
        } else {
          resolve(port)
        }
      })
    })
  })
}

async function stopWorker(child) {
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
    new Promise((resolve) =>
      child.once('exit', resolve),
    ),
    sleep(5_000),
  ])

  if (child.exitCode === null) {
    child.kill('SIGKILL')
    await sleep(500)
  }

  await sleep(
    process.platform === 'win32'
      ? 750
      : 100,
  )
}

async function waitForWorker(
  baseUrl,
  child,
  logs,
) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        'Wrangler exited before moderation became available.\n' +
          logs(),
      )
    }

    try {
      const response = await fetch(
        `${baseUrl}/v1/admin/intake/submissions`,
        {
          headers: {
            Origin: adminOrigin,
          },
        },
      )

      if (response.status === 401) return
    } catch {
      // Wrangler is still starting.
    }

    await sleep(200)
  }

  throw new Error(
    'Timed out while waiting for the local moderation auth boundary.\n' +
      logs(),
  )
}

function execute(sql) {
  run([
    'd1',
    'execute',
    ...localArgs(state),
    '--command',
    sql.replace(/\s+/gu, ' ').trim(),
    '--yes',
  ])
}

async function jsonRequest(
  url,
  {
    method = 'GET',
    key = adminKey,
    origin = adminOrigin,
    body,
    headers = {},
  } = {},
) {
  const response = await fetch(url, {
    method,
    headers: {
      Origin: origin,
      ...(key === null
        ? {}
        : {
            'X-Ask-Mark-Local-Admin-Key':
              key,
          }),
      ...(body === undefined
        ? {}
        : {
            'Content-Type':
              'application/json',
          }),
      ...headers,
    },
    ...(body === undefined
      ? {}
      : {
          body:
            typeof body === 'string'
              ? body
              : JSON.stringify(body),
        }),
  })

  const parsed = await response.json()

  return {
    response,
    body: parsed,
  }
}

const disabled = await workerModule.fetch(
  new Request(
    'https://example.test/v1/admin/intake/submissions',
    {
      headers: {
        Origin: adminOrigin,
      },
    },
  ),
  {
    ASK_MARK_DB: {},
  },
)

assert.equal(disabled.status, 404)
assert.equal(
  (await disabled.json()).error.code,
  'not_found',
)

const localConfig = readFileSync(
  config,
  'utf8',
)
const previewConfig = readFileSync(
  path.join(worker, 'wrangler.preview.jsonc'),
  'utf8',
)
const productionConfig = readFileSync(
  path.join(
    worker,
    'wrangler.production.jsonc',
  ),
  'utf8',
)

for (const required of [
  '"ASK_MARK_MODERATION_MODE": "local-only"',
  '"ASK_MARK_MODERATION_KEY":',
]) {
  assert.equal(localConfig.includes(required), true)
}

for (const remoteConfig of [
  previewConfig,
  productionConfig,
]) {
  assert.equal(
    remoteConfig.includes('ASK_MARK_MODERATION_MODE'),
    false,
  )
  assert.equal(
    remoteConfig.includes('ASK_MARK_MODERATION_KEY'),
    false,
  )
}

let workerProcess
let validationSucceeded = false
let stdout = ''
let stderr = ''

try {
  migrate(state)

  const hashA = 'a'.repeat(64)
  const hashB = 'b'.repeat(64)

  execute(
    compact([
      'PRAGMA foreign_keys = ON;',
      'INSERT INTO visitor_submissions (',
      'id, submission_type, language, content_text,',
      'content_hash, deduplication_hash, status,',
      'created_at, updated_at, expires_at',
      ') VALUES (',
      `'${submissionId}',`,
      "'question',",
      "'taglish',",
      "'<img src=x onerror=alert(1)> May GHL experience ba si Mark?',",
      `'${hashA}',`,
      `'${hashB}',`,
      "'pending_review',",
      "'2026-08-04T00:00:00.000Z',",
      "'2026-08-04T00:00:00.000Z',",
      "'2026-11-02T00:00:00.000Z'",
      ');',
      'INSERT INTO visitor_submission_events (',
      'id, submission_id, event_type, previous_status,',
      'resulting_status, reason_code, actor_type,',
      'actor_id, created_at',
      ') VALUES',
      '(',
      "'event_api_received',",
      `'${submissionId}',`,
      "'received',",
      'NULL,',
      "'received',",
      'NULL,',
      "'system',",
      'NULL,',
      "'2026-08-04T00:00:00.000Z'",
      '),',
      '(',
      "'event_api_queued',",
      `'${submissionId}',`,
      "'queued_for_review',",
      "'received',",
      "'pending_review',",
      'NULL,',
      "'system',",
      'NULL,',
      "'2026-08-04T00:00:00.000Z'",
      ');',
    ]),
  )

  const baseline = query(
    state,
    compact([
      'SELECT',
      '(SELECT COUNT(*) FROM source_records) AS source_count,',
      '(SELECT COUNT(*) FROM knowledge_items) AS knowledge_count,',
      '(SELECT COUNT(*) FROM publication_releases) AS release_count,',
      '(',
      'SELECT COUNT(*) FROM publication_release_items',
      ') AS release_item_count,',
      '(SELECT COUNT(*) FROM v_active_knowledge) AS active_count;',
    ]),
  )

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

  const logs = () =>
    `${stdout}\n${stderr}`.trim()

  await waitForWorker(
    baseUrl,
    workerProcess,
    logs,
  )

  const queueUrl =
    `${baseUrl}/v1/admin/intake/submissions`
  const detailUrl = `${queueUrl}/${submissionId}`
  const actionUrl = `${detailUrl}/actions`

  const preflight = await fetch(queueUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: adminOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers':
        'X-Ask-Mark-Local-Admin-Key',
    },
  })

  expect(
    preflight.status === 204,
    'Allowed moderation preflight failed.',
  )
  expect(
    preflight.headers.get(
      'access-control-allow-origin',
    ) === adminOrigin,
    'Allowed moderation preflight omitted origin.',
  )
  expect(
    preflight.headers
      .get('access-control-allow-headers')
      ?.toLowerCase()
      .includes(
        'x-ask-mark-local-admin-key',
      ),
    'Moderation preflight omitted admin header.',
  )

  const missingKey = await jsonRequest(
    queueUrl,
    {
      key: null,
    },
  )
  expect(
    missingKey.response.status === 401 &&
      missingKey.body.error?.code ===
        'admin_auth_required',
    'Missing moderation key did not return 401.',
  )

  const invalidKey = await jsonRequest(
    queueUrl,
    {
      key: 'x'.repeat(48),
    },
  )
  expect(
    invalidKey.response.status === 403 &&
      invalidKey.body.error?.code ===
        'admin_auth_invalid',
    'Invalid moderation key did not return 403.',
  )

  const invalidOrigin = await jsonRequest(
    queueUrl,
    {
      origin: 'https://evil.example',
    },
  )
  expect(
    invalidOrigin.response.status === 403 &&
      invalidOrigin.body.error?.code ===
        'admin_origin_forbidden',
    'Unapproved moderation origin was not rejected.',
  )
  expect(
    invalidOrigin.response.headers.get(
      'access-control-allow-origin',
    ) === null,
    'Unapproved origin received CORS permission.',
  )

  const queue = await jsonRequest(queueUrl)

  expect(
    queue.response.status === 200 &&
      queue.body.ok === true,
    'Moderation queue did not load.',
  )
  expect(
    queue.body.submissions?.length === 1,
    'Moderation queue did not return one pending item.',
  )
  expect(
    queue.response.headers.get(
      'cache-control',
    ) === 'no-store',
    'Moderation queue was not marked no-store.',
  )
  expect(
    queue.response.headers.get(
      'access-control-allow-origin',
    ) === adminOrigin,
    'Moderation queue omitted approved CORS origin.',
  )
  expect(
    queue.response.headers.get(
      'access-control-allow-credentials',
    ) === null,
    'Moderation response enabled credentialed CORS.',
  )

  const queueText = JSON.stringify(queue.body)
  for (const prohibited of [
    'content_hash',
    'contentHash',
    'deduplication',
    'bucketHash',
    adminKey,
  ]) {
    expect(
      !queueText.includes(prohibited),
      `Queue leaked prohibited value: ${prohibited}`,
    )
  }

  const queueItem = queue.body.submissions[0]
  assert.deepEqual(
    Object.keys(queueItem).sort(),
    [
      'createdAt',
      'expiresAt',
      'id',
      'language',
      'messagePreview',
      'status',
      'type',
      'updatedAt',
    ].sort(),
  )

  const filtered = await jsonRequest(
    `${queueUrl}?status=pending_review&type=question&language=taglish&limit=1`,
  )
  expect(
    filtered.response.status === 200 &&
      filtered.body.submissions.length === 1,
    'Valid moderation filters failed.',
  )

  const unknownQuery = await jsonRequest(
    `${queueUrl}?search=secret`,
  )
  expect(
    unknownQuery.response.status === 400 &&
      unknownQuery.body.error?.code ===
        'unknown_query_parameter',
    'Unknown moderation query field was accepted.',
  )

  const detail = await jsonRequest(detailUrl)

  expect(
    detail.response.status === 200 &&
      detail.body.submission?.id ===
        submissionId,
    'Moderation detail did not load.',
  )
  expect(
    detail.body.submission.message ===
      '<img src=x onerror=alert(1)> May GHL experience ba si Mark?',
    'Visitor plain text was changed or executed.',
  )
  expect(
    detail.body.submission.actions.length === 0 &&
      detail.body.submission.events.length === 2,
    'Initial moderation history is incorrect.',
  )

  const detailText = JSON.stringify(detail.body)
  for (const prohibited of [
    'content_hash',
    'deduplication_hash',
    'bucket_hash',
    adminKey,
  ]) {
    expect(
      !detailText.includes(prohibited),
      `Detail leaked prohibited value: ${prohibited}`,
    )
  }

  const unknownDetail = await jsonRequest(
    `${queueUrl}/submission_unknown-001`,
  )
  expect(
    unknownDetail.response.status === 404 &&
      unknownDetail.body.error?.code ===
        'not_found',
    'Unknown moderation item did not return 404.',
  )

  const invalidBody = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'approve',
        expectedStatus: 'pending_review',
        expectedUpdatedAt:
          detail.body.submission.updatedAt,
        reasonCode: 'useful_question',
        publish: true,
      },
    },
  )
  expect(
    invalidBody.response.status === 400 &&
      invalidBody.body.error?.code ===
        'unknown_field',
    'Publication-like unknown action field was accepted.',
  )

  const invalidReason = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'approve',
        expectedStatus: 'pending_review',
        expectedUpdatedAt:
          detail.body.submission.updatedAt,
        reasonCode: 'resolved',
      },
    },
  )
  expect(
    invalidReason.response.status === 400 &&
      invalidReason.body.error?.code ===
        'invalid_reason_code',
    'Invalid action-specific reason was accepted.',
  )

  const approve = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'approve',
        expectedStatus: 'pending_review',
        expectedUpdatedAt:
          detail.body.submission.updatedAt,
        reasonCode: 'useful_question',
        note:
          'Verify against approved sources before later curation.',
      },
    },
  )

  expect(
    approve.response.status === 200 &&
      approve.body.submission?.status ===
        'approved',
    'Valid approval failed.',
  )
  expect(
    typeof approve.body.action?.id === 'string' &&
      approve.body.action.id.startsWith(
        'action_',
      ),
    'Approval omitted opaque action ID.',
  )

  const stale = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'archive',
        expectedStatus: 'pending_review',
        expectedUpdatedAt:
          detail.body.submission.updatedAt,
        reasonCode: 'resolved',
      },
    },
  )
  expect(
    stale.response.status === 409 &&
      stale.body.error?.code ===
        'stale_submission',
    'Stale moderation action did not return 409.',
  )

  const invalidTransition = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'approve',
        expectedStatus: 'approved',
        expectedUpdatedAt:
          approve.body.submission.updatedAt,
        reasonCode: 'useful_question',
      },
    },
  )
  expect(
    invalidTransition.response.status === 409 &&
      invalidTransition.body.error?.code ===
        'invalid_moderation_transition',
    'Invalid moderation transition did not return 409.',
  )

  const archive = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'archive',
        expectedStatus: 'approved',
        expectedUpdatedAt:
          approve.body.submission.updatedAt,
        reasonCode: 'resolved',
      },
    },
  )
  expect(
    archive.response.status === 200 &&
      archive.body.submission?.status ===
        'archived',
    'Valid archive failed.',
  )

  const reopen = await jsonRequest(
    actionUrl,
    {
      method: 'POST',
      body: {
        action: 'reopen',
        expectedStatus: 'archived',
        expectedUpdatedAt:
          archive.body.submission.updatedAt,
        reasonCode: 'needs_reconsideration',
      },
    },
  )
  expect(
    reopen.response.status === 200 &&
      reopen.body.submission?.status ===
        'pending_review',
    'Valid reopen failed.',
  )

  const postQueue = await jsonRequest(
    queueUrl,
    {
      method: 'POST',
      body: {
        action: 'approve',
      },
    },
  )
  expect(
    postQueue.response.status === 405,
    'POST queue route did not return 405.',
  )

  const getAction = await jsonRequest(actionUrl)
  expect(
    getAction.response.status === 405,
    'GET action route did not return 405.',
  )

  const finalDetail = await jsonRequest(detailUrl)
  expect(
    finalDetail.body.submission.actions.length === 3,
    'Final detail did not expose three private actions.',
  )
  expect(
    finalDetail.body.submission.events.length === 5,
    'Final detail did not expose the complete event history.',
  )
  expect(
    finalDetail.body.submission.status ===
      'pending_review',
    'Final reopened status is incorrect.',
  )

  const after = query(
    state,
    compact([
      'SELECT',
      '(SELECT COUNT(*) FROM source_records) AS source_count,',
      '(SELECT COUNT(*) FROM knowledge_items) AS knowledge_count,',
      '(SELECT COUNT(*) FROM publication_releases) AS release_count,',
      '(',
      'SELECT COUNT(*) FROM publication_release_items',
      ') AS release_item_count,',
      '(SELECT COUNT(*) FROM v_active_knowledge) AS active_count,',
      '(',
      'SELECT COUNT(*)',
      'FROM visitor_submission_moderation_actions',
      ') AS action_count,',
      '(',
      'SELECT COUNT(*)',
      'FROM visitor_submission_events',
      "WHERE actor_type = 'admin'",
      ') AS admin_event_count,',
      '(',
      'SELECT status FROM visitor_submissions',
      `WHERE id = '${submissionId}'`,
      ') AS final_status;',
    ]),
  )

  for (const field of [
    'source_count',
    'knowledge_count',
    'release_count',
    'release_item_count',
    'active_count',
  ]) {
    assert.equal(
      Number(after[field]),
      Number(baseline[field]),
      `Moderation changed publication firewall field ${field}.`,
    )
  }

  assert.equal(Number(after.action_count), 3)
  assert.equal(Number(after.admin_event_count), 3)
  assert.equal(after.final_status, 'pending_review')

  const allLogs = logs()
  expect(
    !allLogs.includes(adminKey),
    'Worker logs leaked the local moderation key.',
  )

  validationSucceeded = true

  console.log(
    [
      'Ask Mark moderation API checks passed:',
      'disabled-mode 404, strict local origin and key authentication,',
      'redacted queue/detail reads, filter validation,',
      'approve/archive/reopen actions, stale and invalid-transition 409s,',
      'immutable private history, no secret leakage,',
      'and unchanged source, knowledge, release, and active-view data.',
    ].join(' '),
  )
} finally {
  await stopWorker(workerProcess)

  if (!validationSucceeded) {
    console.error(
      `${stdout}\n${stderr}`.trim(),
    )
  }

  try {
    await removeDisposableState(state)
  } catch (cleanupError) {
    console.error(
      cleanupError,
    )

    if (validationSucceeded) {
      throw cleanupError
    }
  }
}
