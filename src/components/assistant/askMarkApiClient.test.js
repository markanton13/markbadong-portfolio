import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  getAskMarkResponse,
  isLocalAskMarkAiEnabled,
} from './askMarkApiClient.js'

const localEnvironment = {
  DEV: true,
  MODE: 'askmark',
  VITE_ASK_MARK_AI_MODE: 'local-only',
  VITE_ASK_MARK_API_BASE_URL: 'http://127.0.0.1:8787',
}

test('local AI mode requires a Vite dev server and loopback API', () => {
  assert.equal(isLocalAskMarkAiEnabled(localEnvironment), true)
  assert.equal(
    isLocalAskMarkAiEnabled({
      ...localEnvironment,
      VITE_ASK_MARK_API_BASE_URL: 'https://ask-mark-api-preview.example.workers.dev',
    }),
    false,
  )
  assert.equal(
    isLocalAskMarkAiEnabled({
      ...localEnvironment,
      DEV: false,
    }),
    false,
  )
  assert.equal(
    isLocalAskMarkAiEnabled({
      ...localEnvironment,
      VITE_ASK_MARK_AI_MODE: 'enabled',
    }),
    false,
  )
})

test('browser API client contains no Gateway key or authorization header', async () => {
  const source = await readFile(
    new URL('./askMarkApiClient.js', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(source, /KILO_API_KEY|Authorization\s*:/i)
})

test('sends only the current question and approved knowledge key in local AI mode', async () => {
  let request
  const fallback = {
    answer: 'MarkHQ is an operations project.',
    sources: [],
    actions: [],
  }
  const response = await getAskMarkResponse(
    'Tell me more about that.',
    fallback,
    {
      environment: localEnvironment,
      generative: true,
      contextKey: 'project.markhq',
      fetchImpl: async (_url, options) => {
        request = options
        return new Response(
          JSON.stringify({
            ok: true,
            matched: true,
            mode: 'kilo-local',
            answer: 'MarkHQ is an operations project.',
            item: {
              key: 'project.markhq',
              kind: 'project',
              category: 'project',
              title: 'MarkHQ',
            },
            actions: [{ type: 'project', label: 'MarkHQ', href: '/projects/markhq' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      },
    },
  )

  assert.deepEqual(JSON.parse(request.body), {
    message: 'Tell me more about that.',
    generative: true,
    contextKey: 'project.markhq',
  })
  assert.equal(response.delivery, 'kilo-local')
  assert.equal(response.knowledgeKey, 'project.markhq')
})

test('AI mode disabled sends the unchanged deterministic query contract', async () => {
  let request
  await getAskMarkResponse('Who is Mark?', { answer: 'fallback' }, {
    environment: {
      ...localEnvironment,
      VITE_ASK_MARK_AI_MODE: undefined,
    },
    generative: true,
    contextKey: 'project.markhq',
    fetchImpl: async (_url, options) => {
      request = options
      return new Response('{}', { status: 503 })
    },
  })
  assert.deepEqual(JSON.parse(request.body), { message: 'Who is Mark?' })
})

test('uses the deterministic API result when the Worker reports provider fallback', async () => {
  const response = await getAskMarkResponse(
    'Tell me about MarkHQ.',
    { answer: 'Static fallback.' },
    {
      environment: localEnvironment,
      generative: true,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            matched: true,
            mode: 'deterministic-d1',
            answer: 'MarkHQ is an operations project.',
            item: {
              key: 'project.markhq',
              kind: 'project',
              category: 'project',
              title: 'MarkHQ',
            },
            actions: [{ type: 'project', label: 'MarkHQ', href: '/projects/markhq' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    },
  )

  assert.equal(response.answer, 'MarkHQ is an operations project.')
  assert.equal(response.delivery, 'd1')
})

test('maps at most two approved D1 project results and keys into bounded context', async () => {
  const response = await getAskMarkResponse('Compare MarkHQ and LeaveFlow.', { answer: 'fallback' }, {
    environment: localEnvironment,
    generative: true,
    contextKeys: ['project.markhq', 'project.leaveflow', 'project.forged'],
    fetchImpl: async (_url, options) => {
      assert.deepEqual(JSON.parse(options.body), {
        message: 'Compare MarkHQ and LeaveFlow.',
        generative: true,
        contextKeys: ['project.markhq', 'project.leaveflow'],
      })
      return new Response(JSON.stringify({
        ok: true,
        matched: true,
        mode: 'kilo-local',
        answer: 'MarkHQ Assistant is a Discord operations system. LeaveFlow is a leave-management system.',
        item: { key: 'project.markhq', kind: 'project', category: 'Projects', title: 'MarkHQ Assistant' },
        items: [
          { key: 'project.markhq', kind: 'project', category: 'Projects', title: 'MarkHQ Assistant' },
          { key: 'project.leaveflow', kind: 'project', category: 'Projects', title: 'LeaveFlow' },
        ],
        actions: [
          { type: 'project', label: 'MarkHQ Assistant', href: '/projects/markhq' },
          { type: 'project', label: 'LeaveFlow', href: '/projects/leaveflow' },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  assert.equal(response.knowledgeKeys.length, 2)
  assert.deepEqual(response.knowledgeKeys, ['project.markhq', 'project.leaveflow'])
  assert.equal(response.context.type, 'projects')
  assert.deepEqual(response.sources.map((source) => source.href), ['/projects/markhq', '/projects/leaveflow'])
})

test('clarification response is displayed without requiring an item', async () => {
  const response = await getAskMarkResponse('Tell me more about that project.', { answer: 'fallback' }, {
    environment: localEnvironment,
    generative: true,
    fetchImpl: async () => new Response(JSON.stringify({
      ok: true,
      matched: false,
      clarificationRequired: true,
      answer: 'Which approved project do you mean?',
      actions: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  })
  assert.equal(response.category, 'clarification')
  assert.match(response.answer, /Which approved project/)
  assert.equal(response.delivery, 'd1')
})

test('slow local response has a bounded diagnostic timeout while public deterministic timeout stays short', async () => {
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout
  const deadlines = []
  globalThis.setTimeout = (_callback, delay) => { deadlines.push(delay); return deadlines.length }
  globalThis.clearTimeout = () => {}
  try {
    await getAskMarkResponse('Tell me about MarkHQ.', { answer: 'fallback' }, {
      environment: localEnvironment,
      generative: true,
      fetchImpl: async () => new Response('{}', { status: 503 }),
    })
    await getAskMarkResponse('Tell me about MarkHQ.', { answer: 'fallback' }, {
      environment: {
        DEV: false,
        MODE: 'askmark-production',
        VITE_ASK_MARK_API_MODE: 'remote-production',
        VITE_ASK_MARK_API_ALLOWED_HOST: 'ask-mark-api-production.markantonbadong13.workers.dev',
        VITE_ASK_MARK_API_BASE_URL: 'https://ask-mark-api-production.markantonbadong13.workers.dev',
      },
      generative: false,
      fetchImpl: async () => new Response('{}', { status: 503 }),
    })
  } finally {
    globalThis.setTimeout = originalSetTimeout
    globalThis.clearTimeout = originalClearTimeout
  }
  assert.deepEqual(deadlines, [37_000, 2_200])
})

test('external cancellation reaches fetch and returns the deterministic fallback', async () => {
  const controller = new AbortController()
  let observedSignal
  const pending = getAskMarkResponse('Tell me about MarkHQ.', { answer: 'Deterministic fallback.' }, {
    environment: localEnvironment,
    generative: true,
    signal: controller.signal,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      observedSignal = options.signal
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }),
  })
  controller.abort()
  const response = await pending
  assert.equal(observedSignal.aborted, true)
  assert.equal(response.answer, 'Deterministic fallback.')
  assert.equal(response.delivery, 'static')
})

test('accepts a slow local diagnostic response that arrives before its bounded deadline', async () => {
  const response = await getAskMarkResponse('Tell me about MarkHQ.', { answer: 'fallback' }, {
    environment: localEnvironment,
    generative: true,
    fetchImpl: async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 30))
      return new Response(JSON.stringify({
        ok: true,
        matched: true,
        mode: 'kilo-local',
        answer: 'MarkHQ is an operations project.',
        item: { key: 'project.markhq', kind: 'project', title: 'MarkHQ' },
        actions: [{ type: 'project', label: 'MarkHQ', href: '/projects/markhq' }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  assert.equal(response.delivery, 'kilo-local')
})

test('ignores a late response from a fetch implementation after caller cancellation', async () => {
  const controller = new AbortController()
  const pending = getAskMarkResponse('Tell me about MarkHQ.', { answer: 'Deterministic fallback.' }, {
    environment: localEnvironment,
    generative: true,
    signal: controller.signal,
    fetchImpl: async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 15))
      return new Response(JSON.stringify({
        ok: true,
        matched: true,
        mode: 'kilo-local',
        answer: 'Late answer must not be used.',
        item: { key: 'project.markhq', kind: 'project', title: 'MarkHQ' },
        actions: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  controller.abort()
  const response = await pending
  assert.equal(response.answer, 'Deterministic fallback.')
  assert.equal(response.delivery, 'static')
})
