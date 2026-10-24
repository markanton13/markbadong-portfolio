import assert from 'node:assert/strict'
import test from 'node:test'
import { KILO_APPROVED_MODEL_POOL } from './lib/kilo-gateway.js'
import worker, { isLocalGenerativeRequest, reportLocalAiDiagnostic } from './index.js'

const localEnv = { ASK_MARK_AI_MODE: 'local-only' }
const enabledBody = { generative: true }

test('Worker accepts generative requests only on explicit local loopback mode', () => {
  for (const hostname of ['127.0.0.1', 'localhost', '[::1]']) {
    assert.equal(
      isLocalGenerativeRequest(
        new Request(`http://${hostname}:8787/v1/query`),
        localEnv,
        enabledBody,
      ),
      true,
    )
  }

  assert.equal(
    isLocalGenerativeRequest(
      new Request('https://ask-mark-api-preview.example.workers.dev/v1/query'),
      localEnv,
      enabledBody,
    ),
    false,
  )
  assert.equal(
    isLocalGenerativeRequest(
      new Request('http://localhost:8787/v1/query'),
      { ASK_MARK_AI_MODE: 'disabled' },
      enabledBody,
    ),
    false,
  )
  assert.equal(
    isLocalGenerativeRequest(
      new Request('http://localhost:8787/v1/query'),
      localEnv,
      { generative: false },
    ),
    false,
  )
})

test('the fixed synthetic smoke request enters the local generative gate', () => {
  const smokeBody = {
    message: 'Synthetic test: describe the approved MarkHQ operations project.',
    generative: true,
    contextKey: 'project.markhq',
  }
  assert.equal(
    isLocalGenerativeRequest(
      new Request('http://127.0.0.1:8787/v1/query'),
      localEnv,
      smokeBody,
    ),
    true,
  )
})

test('local diagnostic logging is loopback-only and allowlists metadata fields', () => {
  const originalInfo = console.info
  const lines = []
  console.info = (line) => lines.push(String(line))
  try {
    reportLocalAiDiagnostic(
      new Request('https://portfolio.example/v1/query'),
      { code: 'model_answer_accepted', providerCallAttempted: true },
    )
    reportLocalAiDiagnostic(
      new Request('http://127.0.0.1:8787/v1/query'),
      {
        code: 'model_answer_accepted',
        providerCallAttempted: true,
        elapsedMs: 72_000,
        overallElapsedMs: 81_000,
        usageMetadataInconsistent: true,
        httpStatusReceived: true,
        responseHeadersReceived: true,
        timeoutSource: 'attempt_deadline',
        abortSource: 'client_request',
        completionTokens: 240,
        reasoningTokens: 231,
        httpStatus: 200,
        choicesCount: 1,
        contentType: 'application/json',
        finishReason: 'length',
        modelId: KILO_APPROVED_MODEL_POOL[0],
        attemptNumber: 1,
        prompt: 'private prompt text',
        evidence: 'private evidence text',
        apiKey: 'synthetic-secret-value',
        providerBody: 'private response text',
        reasoningText: 'private hidden reasoning',
        arbitraryContentType: 'application/x-private',
      },
    )
  } finally {
    console.info = originalInfo
  }

  assert.equal(lines.length, 1)
  assert.match(lines[0], /ASK_MARK_LOCAL_AI_DIAGNOSTIC/)
  assert.match(lines[0], /"elapsedMs":60000/)
  assert.match(lines[0], /"overallElapsedMs":60000/)
  assert.match(lines[0], /"usageMetadataInconsistent":true/)
  assert.match(lines[0], /"httpStatusReceived":true/)
  assert.match(lines[0], /"responseHeadersReceived":true/)
  assert.match(lines[0], /"timeoutSource":"attempt_deadline"/)
  assert.match(lines[0], /"abortSource":"client_request"/)
  assert.match(lines[0], /"completionTokens":240/)
  assert.match(lines[0], /"reasoningTokens":231/)
  assert.match(lines[0], /"choicesCount":1/)
  assert.match(lines[0], /"contentType":"application\/json"/)
  assert.match(lines[0], /"finishReason":"length"/)
  assert.doesNotMatch(lines[0], /private prompt|private evidence|private hidden reasoning|synthetic-secret-value|apiKey/)
  assert.doesNotMatch(lines[0], /providerBody|private response|arbitraryContentType/)
})

test('a mocked reasoning-only truncation preserves deterministic D1 fallback and logs counts only', async () => {
  const knowledgeRow = {
    knowledge_item_id: 'synthetic-markhq-id',
    item_key: 'project.markhq',
    kind: 'project',
    category: 'Projects',
    title: 'MarkHQ',
    content_text: 'MarkHQ is an operations project that organizes customer workflows.',
    payload_json: '{}',
    answer_template: null,
    language: 'en',
    release_id: 'synthetic-release-id',
  }
  const db = {
    prepare(sql) {
      return {
        bind() { return this },
        async first() {
          return {
            release_id: 'synthetic-release-id',
            release_no: 1,
            release_title: 'Synthetic approved release',
            published_at: '2026-01-01T00:00:00Z',
            knowledge_count: 1,
            seed_version: 'synthetic-v1',
          }
        },
        async all() {
          if (sql.includes('FROM v_active_knowledge')) return { results: [knowledgeRow] }
          if (sql.includes('FROM knowledge_match_terms')) {
            return { results: [{
              knowledge_item_id: knowledgeRow.knowledge_item_id,
              normalized_term: 'markhq',
              match_mode: 'whole_word',
              weight: 10,
              is_negative: 0,
            }] }
          }
          return { results: [] }
        },
      }
    },
  }

  const originalFetch = globalThis.fetch
  const originalInfo = console.info
  const diagnosticLines = []
  let providerCalls = 0
  globalThis.fetch = async (url, options) => {
    if (url === 'https://ai-gateway.kilo.ai/api/v1/models') {
      return new Response(JSON.stringify({ data: KILO_APPROVED_MODEL_POOL.map((id) => ({ id, pricing: { prompt: 0, completion: 0 }, architecture: { input_modalities: ['text'], output_modalities: ['text'] }, supported_parameters: ['max_tokens'] })) }), { headers: { 'Content-Type': 'application/json' } })
    }
    providerCalls += 1
    const requestModel = JSON.parse(options.body).model
    return new Response(JSON.stringify({
      model: requestModel,
      choices: [{ message: { role: 'assistant', content: null }, finish_reason: 'length' }],
      usage: {
        completion_tokens: 240,
        completion_tokens_details: { reasoning_tokens: 231 },
      },
    }), { headers: { 'Content-Type': 'application/json' } })
  }
  console.info = (line) => diagnosticLines.push(String(line))

  let response
  try {
    response = await worker.fetch(
      new Request('http://127.0.0.1:8787/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Synthetic test: describe the approved MarkHQ operations project.',
          generative: true,
        }),
      }),
      {
        ASK_MARK_AI_MODE: 'local-only',
        KILO_API_KEY: 'synthetic-secret-never-used-live',
        ASK_MARK_DB: db,
      },
      { waitUntil() {} },
    )
  } finally {
    globalThis.fetch = originalFetch
    console.info = originalInfo
  }

  assert.equal(providerCalls, 2)
  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.mode, 'deterministic-d1')
  assert.equal(payload.answer, knowledgeRow.content_text)
  assert.equal(payload.matched, true)
  assert.equal(diagnosticLines.length, 2)
  assert.match(diagnosticLines[0], /"code":"provider_incomplete_generation"/)
  assert.match(diagnosticLines[0], /"completionTokens":240/)
  assert.match(diagnosticLines[0], /"reasoningTokens":231/)
  assert.match(diagnosticLines[0], /"modelId":"nvidia\/nemotron-3\.5-super-vl:free"/)
  assert.match(diagnosticLines[0], /"attemptNumber":1/)
  assert.match(diagnosticLines[1], /"modelId":"dots-studio\/dots-3-note-preview:free"/)
  assert.match(diagnosticLines[1], /"attemptNumber":2/)
  assert.doesNotMatch(diagnosticLines[0], /synthetic-secret-never-used-live|MarkHQ is an operations project|reasoning text|choices\W/)
})
