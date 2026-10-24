import { detectSensitiveContentSignals } from './intake-sensitive-content.js'

export const INTAKE_CLASSIFIER_VERSION = '4d-rules-v1'

const VISITOR_INTENT_BY_TYPE = Object.freeze({
  question: 'question',
  correction: 'correction_claim',
  feedback: 'feedback',
})

/**
 * Deterministic advisory classification only. This function does not decide
 * moderation status, truth, relevance, publication, or visitor intent beyond
 * the type the visitor selected.
 */
export function classifyIntakeSubmission(submission) {
  if (
    !submission ||
    typeof submission !== 'object' ||
    Array.isArray(submission) ||
    !Object.hasOwn(VISITOR_INTENT_BY_TYPE, submission.type) ||
    typeof submission.language !== 'string' ||
    !['en', 'tl', 'taglish'].includes(submission.language) ||
    typeof submission.message !== 'string'
  ) {
    throw new TypeError('A validated intake submission is required.')
  }

  const signals = Object.freeze(
    detectSensitiveContentSignals(submission.message),
  )

  return Object.freeze({
    classifierVersion: INTAKE_CLASSIFIER_VERSION,
    visitorIntent: VISITOR_INTENT_BY_TYPE[submission.type],
    triagePriority: signals.length > 0 ? 'attention' : 'standard',
    signals,
  })
}
