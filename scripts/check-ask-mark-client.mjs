import assert from 'node:assert/strict'
import {
  getAskMarkResponse,
  resolveAskMarkApiConfig,
} from '../src/components/assistant/askMarkApiClient.js'

const localEnvironment = {
  DEV: true,
  VITE_ASK_MARK_API_BASE_URL: 'http://127.0.0.1:8787/',
}

const remotePreviewBaseUrl =
  'https://ask-mark-api-preview.markantonbadong13.workers.dev'

const previewDevelopmentEnvironment = {
  DEV: true,
  MODE: 'askmark-preview',
  VITE_ASK_MARK_API_MODE: 'remote-preview',
  VITE_ASK_MARK_API_BASE_URL: `${remotePreviewBaseUrl}/`,
  VITE_ASK_MARK_API_ALLOWED_HOST:
    'ask-mark-api-preview.markantonbadong13.workers.dev',
}

const previewBuildEnvironment = {
  DEV: false,
  MODE: 'askmark-preview',
  VITE_ASK_MARK_API_MODE: 'remote-preview',
  VITE_ASK_MARK_API_BASE_URL: remotePreviewBaseUrl,
  VITE_ASK_MARK_API_ALLOWED_HOST:
    'ask-mark-api-preview.markantonbadong13.workers.dev',
}

const localConfig = resolveAskMarkApiConfig(localEnvironment)

assert.equal(localConfig.enabled, true)
assert.equal(localConfig.baseUrl, 'http://127.0.0.1:8787')

assert.equal(
  resolveAskMarkApiConfig({
    DEV: false,
    VITE_ASK_MARK_API_BASE_URL:
      'http://127.0.0.1:8787',
  }).enabled,
  false,
)

const previewDevelopmentConfig = resolveAskMarkApiConfig(
  previewDevelopmentEnvironment,
)
const previewBuildConfig = resolveAskMarkApiConfig(
  previewBuildEnvironment,
)

assert.equal(previewDevelopmentConfig.enabled, true)
assert.equal(previewDevelopmentConfig.baseUrl, remotePreviewBaseUrl)
assert.equal(previewBuildConfig.enabled, true)
assert.equal(previewBuildConfig.baseUrl, remotePreviewBaseUrl)

assert.equal(
  resolveAskMarkApiConfig({
    DEV: true,
    MODE: 'askmark-preview',
    VITE_ASK_MARK_API_MODE: 'remote-preview',
    VITE_ASK_MARK_API_BASE_URL:
      'https://askmark.markbadong.com',
  }).enabled,
  false,
)

assert.equal(
  resolveAskMarkApiConfig({
    DEV: true,
    MODE: 'production',
    VITE_ASK_MARK_API_MODE: 'remote-preview',
    VITE_ASK_MARK_API_BASE_URL: remotePreviewBaseUrl,
  }).enabled,
  false,
)

assert.equal(
  resolveAskMarkApiConfig({
    DEV: false,
    MODE: 'production',
    VITE_ASK_MARK_API_BASE_URL: remotePreviewBaseUrl,
  }).enabled,
  false,
)

const fallback = {
  answer: 'Frozen static fallback answer.',
  category: 'static_test',
  sources: [],
  actions: [],
  followUps: [],
  context: null,
}

let capturedRequest = null

const matched = await getAskMarkResponse(
  'Tell me about MarkHQ',
  fallback,
  {
    environment: localEnvironment,
    timeoutMs: 100,
    fetchImpl: async (url, options) => {
      capturedRequest = {
        url,
        method: options.method,
        body: JSON.parse(options.body),
      }

      return new Response(
        JSON.stringify({
          ok: true,
          matched: true,
          answer:
            'MarkHQ is an approved D1-backed project answer.',
          item: {
            id: 'ki_project_markhq',
            key: 'project.markhq',
            kind: 'project',
            category: 'project',
            title: 'MarkHQ Assistant',
          },
          actions: [
            {
              type: 'project',
              label: 'View project',
              href: '/projects/markhq',
            },
            {
              type: 'github',
              label: 'Open GitHub',
              href: 'https://github.com/markanton13',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    },
  },
)

assert.equal(
  capturedRequest.url,
  'http://127.0.0.1:8787/v1/query',
)
assert.equal(capturedRequest.method, 'POST')
assert.equal(
  capturedRequest.body.message,
  'Tell me about MarkHQ',
)

assert.equal(matched.answer, 'MarkHQ is an approved D1-backed project answer.')
assert.equal(matched.delivery, 'd1')
assert.equal(matched.context.id, 'markhq')
assert.equal(matched.sources[0].href, '/projects/markhq')
assert.equal(matched.actions[0].external, false)
assert.equal(matched.actions[1].external, true)

const unmatched = await getAskMarkResponse(
  'Unsupported D1 question',
  fallback,
  {
    environment: localEnvironment,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          matched: false,
          answer: 'No approved D1 match.',
          item: null,
          actions: [],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
  },
)

assert.equal(unmatched.answer, fallback.answer)
assert.equal(unmatched.delivery, 'static')

const offline = await getAskMarkResponse(
  'Worker offline test',
  fallback,
  {
    environment: localEnvironment,
    fetchImpl: async () => {
      throw new Error('Local Worker is offline.')
    },
  },
)

assert.equal(offline.answer, fallback.answer)
assert.equal(offline.delivery, 'static')

const timedOut = await getAskMarkResponse(
  'Timeout test',
  fallback,
  {
    environment: localEnvironment,
    timeoutMs: 5,
    fetchImpl: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true },
        )
      }),
  },
)

assert.equal(timedOut.answer, fallback.answer)
assert.equal(timedOut.delivery, 'static')

let disabledFetchCalled = false

const disabled = await getAskMarkResponse(
  'Static-only mode',
  fallback,
  {
    environment: {
      DEV: true,
    },
    fetchImpl: async () => {
      disabledFetchCalled = true
      throw new Error('Network should not be called.')
    },
  },
)

assert.equal(disabledFetchCalled, false)
assert.equal(disabled.answer, fallback.answer)
assert.equal(disabled.delivery, 'static')

process.stdout.write(
  'Ask Mark frontend client checks passed: local development, allowlisted remote preview, approved D1 mapping, unmatched fallback, offline fallback, timeout fallback, and static-only production mode.\n',
)
