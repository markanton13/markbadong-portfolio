import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { rmSync } from 'node:fs'
import path from 'node:path'
import {
  config,
  fail,
  migrate,
  root,
  worker,
  wranglerCli,
} from './lib/ask-mark-d1.mjs'
import { importSeed } from './import-ask-mark-seed.mjs'

const state = path.join(worker, '.wrangler-api-check')

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' ? address.port : null

      server.close((error) => {
        if (error) reject(error)
        else if (!port) reject(new Error('Could not reserve a local port.'))
        else resolve(port)
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

function expect(condition, message) {
  if (!condition) fail(message)
}

async function waitForWorker(baseUrl, child, logs) {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      fail('Wrangler dev exited before the API became available.', logs())
    }

    try {
      const response = await fetch(`${baseUrl}/v1/health`)

      if (response.ok) return
    } catch {
      // Wrangler is still starting.
    }

    await sleep(200)
  }

  fail('Timed out while waiting for the local Ask Mark Worker.', logs())
}

async function removeDisposableState({ strict = false } = {}) {
  const retryableCodes = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY'])
  const maximumAttempts = 20

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
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

      if (attempt < maximumAttempts) {
        await sleep(250)
        continue
      }

      if (strict) throw error

      console.warn(
        `Disposable API state is still locked by Windows and was retained at ${state}`,
      )

      return false
    }
  }

  return false
}
async function stopWorkerProcess(child) {
  if (!child || child.exitCode !== null) return

  if (process.platform === 'win32' && child.pid) {
    // Wrangler starts workerd as a child process. Terminate the complete tree
    // so Windows releases local D1 file handles before cleanup.
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

await removeDisposableState({ strict: true })

let workerProcess
let validationSucceeded = false
let stdout = ''
let stderr = ''

try {
  migrate(state)
  importSeed({ state })

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

  const health = await jsonRequest(`${baseUrl}/v1/health`)
  expect(health.response.status === 200, 'Health endpoint did not return 200.')
  expect(health.body.status === 'healthy', 'Health status was not healthy.')
  expect(
    health.body.release?.knowledgeCount === 26,
    'Health endpoint reported the wrong knowledge count.',
  )

  const bootstrap = await jsonRequest(`${baseUrl}/v1/bootstrap`)
  expect(
    bootstrap.response.status === 200,
    'Bootstrap endpoint did not return 200.',
  )
  expect(
    bootstrap.body.assistant?.key === 'assistant.identity',
    'Bootstrap did not include the approved assistant identity.',
  )
  expect(
    bootstrap.body.projects?.length === 6,
    'Bootstrap did not include the six seeded projects.',
  )

  const ask = async (message) =>
    jsonRequest(`${baseUrl}/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })

  const profile = await ask('Who is Mark?')
  expect(profile.body.matched === true, 'Profile question did not match.')
  expect(
    profile.body.item?.key === 'profile.summary',
    'Profile question matched the wrong knowledge item.',
  )

  const support = await ask(
    'What customer support experience does Mark have?',
  )
  expect(
    support.body.item?.key === 'experience.support',
    'Support question matched the wrong knowledge item.',
  )

  const privateQuestion = await ask('How is Mark’s health?')
  expect(
    privateQuestion.body.item?.key === 'boundary.private',
    'Private health question did not route to the privacy boundary.',
  )

  const webQuestion = await ask(
    'Search the public internet for information about Mark.',
  )
  expect(
    webQuestion.body.item?.key === 'boundary.no_web',
    'Public-web request did not route to the no-web boundary.',
  )

  const unsupported = await ask(
    'Does Mark have database administrator employment?',
  )
  expect(
    unsupported.body.matched === false,
    'Unsupported role question should not guess a nearby role.',
  )

  const missingMessage = await jsonRequest(`${baseUrl}/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: '' }),
  })
  expect(
    missingMessage.response.status === 400,
    'Empty message did not return 400.',
  )

  const wrongMethod = await jsonRequest(`${baseUrl}/v1/query`)
  expect(
    wrongMethod.response.status === 405,
    'GET /v1/query did not return 405.',
  )

  const cors = await fetch(`${baseUrl}/v1/bootstrap`, {
    headers: {
      Origin: 'http://localhost:5173',
    },
  })
  expect(
    cors.headers.get('access-control-allow-origin') ===
      'http://localhost:5173',
    'Approved local origin did not receive a CORS header.',
  )

  validationSucceeded = true

  console.log(
    'Ask Mark API checks passed: health, bootstrap, grounded query, ' +
      'privacy, no-web, unsupported-role, validation, method, and CORS.',
  )
} finally {
  await stopWorkerProcess(workerProcess)

  if (validationSucceeded) {
    // Windows may retain a released file handle briefly after workerd exits.
    await removeDisposableState()
  } else {
    console.error(`Disposable API state retained at ${state}`)

    if (stdout || stderr) {
      console.error(`${stdout}\n${stderr}`.trim())
    }
  }
}
