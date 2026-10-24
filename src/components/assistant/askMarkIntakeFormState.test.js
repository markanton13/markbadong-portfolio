import assert from 'node:assert/strict'
import test from 'node:test'
import { submitAskMarkIntake } from './askMarkIntakeClient.js'
import { mapAskMarkIntakeResult } from './askMarkIntakeFormState.js'

test('maps sensitive-content response through the local intake client', async () => {
  const clientResult = await submitAskMarkIntake(
    {
      type: 'question',
      language: 'en',
      message: 'What CRM projects has Mark completed?',
    },
    {
      environment: {
        DEV: true,
        VITE_ASK_MARK_INTAKE_MODE: 'local-only',
        VITE_ASK_MARK_API_BASE_URL: 'http://127.0.0.1:8787',
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: 'sensitive_content_not_accepted',
              message:
                'Remove contact details, credentials, and confidential information before submitting.',
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
  const result = mapAskMarkIntakeResult(clientResult)

  assert.deepEqual(clientResult, {
    ok: false,
    error: {
      code: 'sensitive_content_not_accepted',
      status: 400,
      retryAfterSeconds: null,
    },
  })

  assert.deepEqual(result, {
    state: 'validation_error',
    tone: 'error',
    title: 'Check your submission',
    message:
      'Remove contact details and credential-like values. Use placeholders in code examples.',
    code: 'sensitive_content_not_accepted',
  })
})
