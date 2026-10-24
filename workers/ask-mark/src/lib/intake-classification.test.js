import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyIntakeSubmission,
  INTAKE_CLASSIFIER_VERSION,
} from './intake-classification.js'

test('maps visitor-selected types without inferring language or meaning', () => {
  const cases = [
    {
      type: 'question',
      language: 'en',
      message: 'What CRM projects has Mark completed?',
      intent: 'question',
    },
    {
      type: 'correction',
      language: 'tl',
      message: 'May detalye rito na kailangang itama.',
      intent: 'correction_claim',
    },
    {
      type: 'feedback',
      language: 'taglish',
      message: 'Helpful ito, pero puwedeng mas direct ang sagot.',
      intent: 'feedback',
    },
  ]

  for (const { intent, ...submission } of cases) {
    const result = classifyIntakeSubmission(submission)

    assert.deepEqual(result, {
      classifierVersion: INTAKE_CLASSIFIER_VERSION,
      visitorIntent: intent,
      triagePriority: 'standard',
      signals: [],
    })
    assert.equal(Object.hasOwn(result, 'status'), false)
    assert.equal(Object.hasOwn(result, 'publicationApproval'), false)
  }
})

test('leaves ambiguous and multilingual content advisory only', () => {
  const submission = {
    type: 'question',
    language: 'taglish',
    message: 'Hindi ako sure kung ito ang tamang tanong.',
  }

  const first = classifyIntakeSubmission(submission)
  const second = classifyIntakeSubmission(submission)

  assert.deepEqual(first, second)
  assert.equal(first.visitorIntent, 'question')
  assert.equal(first.triagePriority, 'standard')
  assert.deepEqual(first.signals, [])
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.signals), true)
})

test('returns fixed advisory codes without returning matched content', () => {
  const privateText = 'Please email mark.private@private.example.com.'
  const result = classifyIntakeSubmission({
    type: 'feedback',
    language: 'en',
    message: privateText,
  })

  assert.deepEqual(result.signals, ['possible_contact_detail'])
  assert.equal(result.triagePriority, 'attention')
  assert.equal(JSON.stringify(result).includes('mark.private'), false)
  assert.equal(Object.hasOwn(result, 'status'), false)
})

test('rejects objects outside the validated intake contract', () => {
  assert.throws(
    () => classifyIntakeSubmission({ type: 'unknown' }),
    TypeError,
  )
})
