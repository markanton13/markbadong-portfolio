import assert from 'node:assert/strict'
import {
  ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS,
  ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS,
  countAskMarkIntakeCodePoints,
  prepareAskMarkIntakeSubmission,
  resolveAskMarkIntakeConfig,
  submitAskMarkIntake,
} from '../src/components/assistant/askMarkIntakeClient.js'

const localEnvironment = {
  DEV: true,
  MODE: 'askmark',
  VITE_ASK_MARK_API_BASE_URL: 'http://127.0.0.1:8787/',
  VITE_ASK_MARK_INTAKE_MODE: 'local-only',
}

assert.deepEqual(
  resolveAskMarkIntakeConfig(localEnvironment),
  {
    enabled: true,
    baseUrl: 'http://127.0.0.1:8787',
  },
)

for (const environment of [
  {},
  {
    ...localEnvironment,
    DEV: false,
  },
  {
    ...localEnvironment,
    VITE_ASK_MARK_INTAKE_MODE: 'remote-preview',
  },
  {
    ...localEnvironment,
    VITE_ASK_MARK_API_BASE_URL:
      'https://ask-mark-api-preview.markantonbadong13.workers.dev',
  },
  {
    ...localEnvironment,
    VITE_ASK_MARK_API_BASE_URL: 'http://127.0.0.1:8788',
  },
  {
    ...localEnvironment,
    VITE_ASK_MARK_API_BASE_URL:
      'http://user:pass@127.0.0.1:8787',
  },
  {
    ...localEnvironment,
    VITE_ASK_MARK_API_BASE_URL:
      'http://127.0.0.1:8787/other',
  },
  {
    ...localEnvironment,
    VITE_ASK_MARK_API_BASE_URL:
      'http://127.0.0.1:8787/?write=true',
  },
]) {
  assert.deepEqual(
    resolveAskMarkIntakeConfig(environment),
    {
      enabled: false,
      baseUrl: null,
    },
  )
}

assert.equal(
  countAskMarkIntakeCodePoints('  ＡＢＣ\r\nhello\tworld  '),
  15,
)

const normalized = prepareAskMarkIntakeSubmission({
  type: 'question',
  language: 'taglish',
  message: '  Ｐｗｅｄｅ\r\nba ito?\t  ',
})

assert.equal(normalized.ok, true)
assert.equal(
  normalized.value.submission.message,
  'Pwede\nba ito?',
)
assert.equal(
  normalized.value.messageCodePoints,
  Array.from('Pwede\nba ito?').length,
)
assert.equal(
  normalized.value.bodyBytes,
  new TextEncoder().encode(normalized.value.body).byteLength,
)

for (const [submission, expectedCode] of [
  [
    {
      type: 'question',
      language: 'taglish',
      message: 'Valid message here',
      extra: 'not allowed',
    },
    'invalid_payload',
  ],
  [
    {
      type: 'contact_request',
      language: 'taglish',
      message: 'Valid message here',
    },
    'invalid_submission_type',
  ],
  [
    {
      type: 'question',
      language: 'auto',
      message: 'Valid message here',
    },
    'invalid_language',
  ],
  [
    {
      type: 'question',
      language: 'en',
      message: 123,
    },
    'message_required',
  ],
  [
    {
      type: 'question',
      language: 'en',
      message: 'short',
    },
    'message_too_short',
  ],
  [
    {
      type: 'question',
      language: 'en',
      message: 'valid\u0000message',
    },
    'invalid_unicode',
  ],
]) {
  const result = prepareAskMarkIntakeSubmission(submission)

  assert.equal(result.ok, false)
  assert.equal(result.error.code, expectedCode)
}

assert.equal(
  ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS,
  10,
)
assert.equal(
  ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS,
  1000,
)

const tooLong = prepareAskMarkIntakeSubmission({
  type: 'feedback',
  language: 'en',
  message: 'a'.repeat(1001),
})

assert.equal(tooLong.ok, false)
assert.equal(tooLong.error.code, 'message_too_long')

const maximumWidthUnicode = prepareAskMarkIntakeSubmission({
  type: 'feedback',
  language: 'en',
  message: '😀'.repeat(1000),
})

assert.equal(maximumWidthUnicode.ok, true)
assert.equal(
  maximumWidthUnicode.value.messageCodePoints,
  1000,
)
assert.equal(
  maximumWidthUnicode.value.bodyBytes <= 4096,
  true,
)

let capturedRequest = null

const accepted = await submitAskMarkIntake(
  {
    type: 'question',
    language: 'taglish',
    message: 'Pwede bang malaman ang CRM experience ni Mark?',
  },
  {
    environment: localEnvironment,
    fetchImpl: async (url, options) => {
      capturedRequest = {
        url,
        method: options.method,
        contentType: options.headers['Content-Type'],
        body: JSON.parse(options.body),
        signal: options.signal,
      }

      return new Response(
        JSON.stringify({
          ok: true,
          submission: {
            id: 'submission_test-123',
            status: 'pending_review',
          },
        }),
        {
          status: 202,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        },
      )
    },
  },
)

assert.equal(
  capturedRequest.url,
  'http://127.0.0.1:8787/v1/intake/submissions',
)
assert.equal(capturedRequest.method, 'POST')
assert.equal(
  capturedRequest.contentType,
  'application/json',
)
assert.equal(capturedRequest.signal instanceof AbortSignal, true)
assert.deepEqual(capturedRequest.body, {
  type: 'question',
  language: 'taglish',
  message: 'Pwede bang malaman ang CRM experience ni Mark?',
})
assert.deepEqual(accepted, {
  ok: true,
  submission: {
    id: 'submission_test-123',
    status: 'pending_review',
  },
})

const duplicate = await submitAskMarkIntake(
  {
    type: 'feedback',
    language: 'en',
    message: 'This is duplicate feedback.',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'duplicate_submission',
            message: 'Duplicate submission.',
          },
        }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
  },
)

assert.deepEqual(duplicate, {
  ok: false,
  error: {
    code: 'duplicate_submission',
    status: 409,
    retryAfterSeconds: null,
  },
})

const rateLimited = await submitAskMarkIntake(
  {
    type: 'correction',
    language: 'tl',
    message: 'May kailangang itama sa project description.',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'rate_limited',
            message: 'Too many submissions.',
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '420',
          },
        },
      ),
  },
)

assert.deepEqual(rateLimited, {
  ok: false,
  error: {
    code: 'rate_limited',
    status: 429,
    retryAfterSeconds: 420,
  },
})

const invalidRetryAfter = await submitAskMarkIntake(
  {
    type: 'correction',
    language: 'tl',
    message: 'May isa pang kailangang itama rito.',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'rate_limited',
            message: 'Too many submissions.',
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '9999',
          },
        },
      ),
  },
)

assert.equal(
  invalidRetryAfter.error.retryAfterSeconds,
  null,
)

const serverValidation = await submitAskMarkIntake(
  {
    type: 'question',
    language: 'en',
    message: 'This passes the browser-side minimum.',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: 'invalid_unicode',
            message: 'Invalid Unicode.',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
  },
)

assert.equal(serverValidation.ok, false)
assert.equal(
  serverValidation.error.code,
  'invalid_unicode',
)
assert.equal(serverValidation.error.status, 400)

const malformedAcceptedResponse =
  await submitAskMarkIntake(
    {
      type: 'question',
      language: 'en',
      message: 'This response shape will be invalid.',
    },
    {
      environment: localEnvironment,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            submission: {
              status: 'pending_review',
            },
          }),
          {
            status: 202,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
    },
  )

assert.equal(
  malformedAcceptedResponse.error.code,
  'unexpected_response',
)

const invalidJsonResponse = await submitAskMarkIntake(
  {
    type: 'feedback',
    language: 'en',
    message: 'The server response is not valid JSON.',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () =>
      new Response('not-json', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        },
      }),
  },
)

assert.equal(
  invalidJsonResponse.error.code,
  'unexpected_response',
)
assert.equal(invalidJsonResponse.error.status, 500)

let disabledFetchCalled = false

const disabled = await submitAskMarkIntake(
  {
    type: 'question',
    language: 'en',
    message: 'This must never reach the network.',
  },
  {
    environment: {
      DEV: false,
      VITE_ASK_MARK_API_BASE_URL:
        'https://ask-mark-api-production.markantonbadong13.workers.dev',
      VITE_ASK_MARK_INTAKE_MODE: 'local-only',
    },
    fetchImpl: async () => {
      disabledFetchCalled = true
      throw new Error('Network should not be called.')
    },
  },
)

assert.equal(disabledFetchCalled, false)
assert.equal(disabled.error.code, 'intake_unavailable')

let invalidFetchCalled = false

const invalidLocalPayload = await submitAskMarkIntake(
  {
    type: 'question',
    language: 'en',
    message: 'short',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () => {
      invalidFetchCalled = true
      throw new Error('Network should not be called.')
    },
  },
)

assert.equal(invalidFetchCalled, false)
assert.equal(
  invalidLocalPayload.error.code,
  'message_too_short',
)

const offline = await submitAskMarkIntake(
  {
    type: 'feedback',
    language: 'en',
    message: 'The local Worker is currently offline.',
  },
  {
    environment: localEnvironment,
    fetchImpl: async () => {
      throw new Error('offline')
    },
  },
)

assert.equal(offline.error.code, 'intake_unavailable')
assert.equal(offline.error.status, 0)

const timedOut = await submitAskMarkIntake(
  {
    type: 'feedback',
    language: 'en',
    message: 'This request should time out safely.',
  },
  {
    environment: localEnvironment,
    timeoutMs: 5,
    fetchImpl: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          {
            once: true,
          },
        )
      }),
  },
)

assert.equal(timedOut.error.code, 'request_timed_out')
assert.equal(timedOut.error.status, 0)

process.stdout.write(
  'Ask Mark intake client checks passed: exact local-only enablement, loopback and port isolation, normalized payload preparation, Unicode and byte boundaries, 202 acceptance, safe server-error mapping, duplicate and rate-limit handling, timeout behavior, and zero remote-write fallback.\n',
)
