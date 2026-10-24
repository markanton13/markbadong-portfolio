import assert from 'node:assert/strict'
import test from 'node:test'
import { validateIntakeSubmission } from './intake-validation.js'
import { detectSensitiveContentSignals } from './intake-sensitive-content.js'
import { handleLocalIntakeSubmission } from './intake.js'

function validateMessage(message, language = 'en') {
  return validateIntakeSubmission({
    contentType: 'application/json',
    rawBody: JSON.stringify({
      type: 'question',
      language,
      message,
    }),
  })
}

function expectSensitiveRejection(message, language = 'en') {
  const result = validateMessage(message, language)

  assert.equal(result.ok, false)
  assert.equal(result.error.status, 400)
  assert.equal(result.error.code, 'sensitive_content_not_accepted')
  assert.equal(JSON.stringify(result.error).includes(message), false)
  return result
}

test('rejects standard email addresses without echoing them', () => {
  const email = 'mark.private@private.example.com'
  const result = expectSensitiveRejection(
    `Please contact me at ${email} about my question.`,
  )

  assert.doesNotMatch(JSON.stringify(result.error), /private\.example\.com/u)
})

test('rejects international and Philippine mobile number formats', () => {
  expectSensitiveRejection('Call me at +63 900 000 0000 please.')
  expectSensitiveRejection('Text me at 09000000000 salamat po.', 'tl')
})

test('rejects recognizable credential structures without exposing values', () => {
  const githubToken = `ghp_${'A'.repeat(36)}`
  const result = expectSensitiveRejection(
    `My token is ${githubToken}, please check this.`,
  )

  assert.equal(JSON.stringify(result.error).includes(githubToken), false)
  expectSensitiveRejection(
    '-----BEGIN PRIVATE KEY----- please review this configuration.',
  )
  expectSensitiveRejection(`sk_live_${'a'.repeat(24)} is my key.`)
})

test('allows only the exact published AWS documentation placeholder', () => {
  for (const value of [
    'AKIAIOSFODNN7EXAMPLE',
    'AKIAI44QH8DHBEXAMPLE',
  ]) {
    assert.equal(
      validateMessage(`Why does the AWS example ${value} look like this?`).ok,
      true,
    )
  }
})

test('rejects AWS-shaped credentials and adversarial placeholder variants', () => {
  for (const value of [
    'AKIA1234567890ABCDEF',
    'AKIAIOSFODNN7EXAMPLE1',
    'AKIAIOSFODNN7EXAMPLETEST',
    'AKIAI44QH8DHBEXAMPLE1',
    'akiaiosfodnn7example',
  ]) {
    expectSensitiveRejection(`Please inspect this value: ${value}`)
  }
})

test('an AWS placeholder exemption does not exempt other sensitive content', () => {
  expectSensitiveRejection(
    'The AWS sample is AKIAIOSFODNN7EXAMPLE, but email me at person@private-mail.example.com.',
  )
  expectSensitiveRejection(
    `The AWS sample is AKIAIOSFODNN7EXAMPLE and another token is ghp_${'B'.repeat(36)}.`,
  )
})

test('allows reserved examples and explicit placeholders in code questions', () => {
  for (const message of [
    "Why does `const email = 'person@example.com'` fail validation?",
    "Why does `const phone = '+1 202-555-0100'` parse this way?",
    "Does `const apiKey = 'YOUR_API_KEY'` use the right field?",
    'What does `api_key = databaseClient.generateKey()` do?',
    'Puwede bang gamitin ang email@example.test sa sample code?',
  ]) {
    const result = validateMessage(message, 'taglish')
    assert.equal(result.ok, true, result.error?.message)
  }
})

test('does not block ordinary English, Filipino, or Taglish questions', () => {
  for (const [language, message] of [
    ['en', 'How do I validate an API key in my sample application?'],
    ['tl', 'Paano mag-validate ng API key sa sample application?'],
    ['taglish', 'Paano mag-validate ng API key sa sample application?'],
  ]) {
    assert.equal(validateMessage(message, language).ok, true)
  }
})

test('returns only fixed signal codes from the detector', () => {
  const signals = detectSensitiveContentSignals(
    'Email mark.private@private.example.com or use a sample API key.',
  )

  assert.deepEqual(signals, ['possible_contact_detail'])
  assert.equal(JSON.stringify(signals).includes('mark.private'), false)
})

test('rejects sensitive content before any database access', async () => {
  let databaseCalls = 0
  const request = new Request(
    'http://localhost/v1/intake/submissions',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'question',
        language: 'en',
        message: 'Please email mark.private@private.example.com about this.',
      }),
    },
  )
  const response = await handleLocalIntakeSubmission(
    request,
    {
      ASK_MARK_INTAKE_MODE: 'local-only',
      ASK_MARK_INTAKE_HASH_KEY: 'x'.repeat(32),
      ASK_MARK_DB: {
        prepare() {
          databaseCalls += 1
          throw new Error('Database access was not expected.')
        },
      },
    },
  )
  const responseBody = await response.json()

  assert.equal(response.status, 400)
  assert.equal(
    responseBody.error.code,
    'sensitive_content_not_accepted',
  )
  assert.equal(JSON.stringify(responseBody).includes('mark.private'), false)
  assert.equal(databaseCalls, 0)
})
