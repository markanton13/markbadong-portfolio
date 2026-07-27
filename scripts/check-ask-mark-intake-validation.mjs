import assert from 'node:assert/strict'
import {
  INTAKE_BODY_MAX_BYTES,
  INTAKE_MESSAGE_MAX_CODE_POINTS,
  validateIntakeSubmission,
} from '../workers/ask-mark/src/lib/intake-validation.js'

function validate(body, contentType = 'application/json') {
  return validateIntakeSubmission({
    contentType,
    rawBody:
      typeof body === 'string'
        ? body
        : JSON.stringify(body),
  })
}

function expectSuccess(result) {
  assert.equal(result.ok, true)
  return result.value
}

function expectError(result, code, status) {
  assert.equal(result.ok, false)
  assert.equal(result.error.code, code)
  assert.equal(result.error.status, status)
}

const english = expectSuccess(
  validate({
    type: 'question',
    language: 'en',
    message: 'What CRM projects has Mark completed?',
  }),
)

assert.equal(
  english.message,
  'What CRM projects has Mark completed?',
)

const tagalog = expectSuccess(
  validate({
    type: 'correction',
    language: 'tl',
    message: 'May detalye rito na kailangang itama.',
  }),
)

assert.equal(tagalog.type, 'correction')

const taglish = expectSuccess(
  validate({
    type: 'feedback',
    language: 'taglish',
    message: 'Helpful ito, pero puwedeng mas direct ang sagot.',
  }),
)

assert.equal(taglish.language, 'taglish')

expectSuccess(
  validate(
    {
      type: 'question',
      language: 'en',
      message: 'Is charset handling supported?',
    },
    'Application/JSON; Charset="UTF-8"',
  ),
)

for (const contentType of [
  '',
  'text/plain',
  'application/json-patch+json',
  'application/json; charset=iso-8859-1',
  'application/json; charset=utf-8; version=1',
]) {
  expectError(
    validate(
      {
        type: 'question',
        language: 'en',
        message: 'This body should be rejected.',
      },
      contentType,
    ),
    'unsupported_media_type',
    415,
  )
}

expectError(
  validateIntakeSubmission({
    contentType: 'application/json',
    rawBody: null,
  }),
  'invalid_payload',
  400,
)

expectError(
  validate('{"type":'),
  'invalid_json',
  400,
)

expectError(
  validate(
    '{"type":"question","type":"feedback","language":"en","message":"Duplicate type field."}',
  ),
  'duplicate_field',
  400,
)

for (const body of [
  null,
  [],
  ['question'],
]) {
  expectError(
    validate(body),
    'invalid_payload',
    400,
  )
}

expectError(
  validate({
    type: 'question',
    language: 'en',
    message: {
      text: 'Nested values are not accepted.',
    },
  }),
  'invalid_payload',
  400,
)

expectError(
  validate({
    type: 'question',
    language: 'en',
  }),
  'invalid_payload',
  400,
)

expectError(
  validate({
    type: 'question',
    language: 'en',
    message: 'This request contains an unknown field.',
    extra: true,
  }),
  'unknown_field',
  400,
)

for (const type of [
  '',
  'contact_request',
  'QUESTION',
  1,
]) {
  expectError(
    validate({
      type,
      language: 'en',
      message: 'This submission type should be rejected.',
    }),
    'invalid_submission_type',
    400,
  )
}

for (const language of [
  '',
  'fil',
  'Taglish',
  1,
]) {
  expectError(
    validate({
      type: 'question',
      language,
      message: 'This language value should be rejected.',
    }),
    'invalid_language',
    400,
  )
}

for (const message of [
  null,
  123,
]) {
  expectError(
    validate({
      type: 'question',
      language: 'en',
      message,
    }),
    'message_required',
    400,
  )
}

expectError(
  validate({
    type: 'question',
    language: 'en',
    message: '      ',
  }),
  'message_required',
  400,
)

expectError(
  validate({
    type: 'question',
    language: 'en',
    message: 'Too short',
  }),
  'message_too_short',
  400,
)

const minimumBoundary = expectSuccess(
  validate({
    type: 'question',
    language: 'en',
    message: '1234567890',
  }),
)

assert.equal(minimumBoundary.messageCodePoints, 10)

const maximumBoundary = expectSuccess(
  validate({
    type: 'feedback',
    language: 'en',
    message: 'a'.repeat(INTAKE_MESSAGE_MAX_CODE_POINTS),
  }),
)

assert.equal(
  maximumBoundary.messageCodePoints,
  INTAKE_MESSAGE_MAX_CODE_POINTS,
)

expectError(
  validate({
    type: 'feedback',
    language: 'en',
    message: 'a'.repeat(INTAKE_MESSAGE_MAX_CODE_POINTS + 1),
  }),
  'message_too_long',
  413,
)

expectError(
  validate({
    type: 'question',
    language: 'en',
    message: 'Contains\u0000a NUL character.',
  }),
  'invalid_unicode',
  400,
)

expectError(
  validate({
    type: 'question',
    language: 'en',
    message: 'Contains\u0085a C1 control.',
  }),
  'invalid_unicode',
  400,
)

expectError(
  validate(
    '{"type":"question","language":"en","message":"Broken \\ud800 surrogate text."}',
  ),
  'invalid_unicode',
  400,
)

expectError(
  validate(
    '{"type":"question","language":"en","message":"Broken \\udc00 surrogate text."}',
  ),
  'invalid_unicode',
  400,
)

const normalized = expectSuccess(
  validate({
    type: 'feedback',
    language: 'taglish',
    message: '  Ｈｅｌｌｏ\tMark\r\nUseful ito.  ',
  }),
)

assert.equal(normalized.message, 'Hello Mark\nUseful ito.')

const emoji = expectSuccess(
  validate({
    type: 'feedback',
    language: 'en',
    message: 'Excellent work 👍👍',
  }),
)

assert.equal(
  emoji.messageCodePoints,
  Array.from('Excellent work 👍👍').length,
)

const oversizedRawBody = JSON.stringify({
  type: 'feedback',
  language: 'en',
  message: 'x'.repeat(INTAKE_BODY_MAX_BYTES),
})

expectError(
  validate(oversizedRawBody),
  'payload_too_large',
  413,
)

console.log(
  'Ask Mark intake validation checks passed: media type, byte limit, ' +
    'flat exact payload, duplicate fields, allowlists, Unicode safety, ' +
    'NFKC normalization, and code-point boundaries.',
)
