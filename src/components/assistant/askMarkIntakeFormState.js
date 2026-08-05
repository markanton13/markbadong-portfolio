import {
  ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS,
  ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS,
} from './askMarkIntakeClient.js'

export const MESSAGE_VALIDATION_CODES = new Set([
  'message_required',
  'message_too_short',
  'message_too_long',
  'payload_too_large',
  'invalid_unicode',
])

const GENERAL_VALIDATION_CODES = new Set([
  'invalid_payload',
  'invalid_submission_type',
  'invalid_language',
  ...MESSAGE_VALIDATION_CODES,
])

function validationMessage(code) {
  switch (code) {
    case 'message_required':
      return 'Enter a plain-text message before submitting.'
    case 'message_too_short':
      return `Use at least ${ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS} characters.`
    case 'message_too_long':
      return `Keep the message within ${ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS} characters.`
    case 'payload_too_large':
      return 'This message uses too many encoded bytes. Shorten it and try again.'
    case 'invalid_unicode':
      return 'Remove unsupported control characters and try again.'
    case 'invalid_submission_type':
      return 'Choose question, correction, or feedback.'
    case 'invalid_language':
      return 'Choose English, Tagalog / Filipino, or Taglish.'
    default:
      return 'Review the form fields and try again.'
  }
}

export function mapAskMarkIntakeResult(result) {
  if (result?.ok === true) {
    return {
      state: 'accepted',
      tone: 'success',
      title: 'Received for private review',
      message:
        'Thanks—your submission is pending Mark’s private review. It has not been added to Ask Mark’s approved answers.',
    }
  }

  const code =
    typeof result?.error?.code === 'string'
      ? result.error.code
      : 'unexpected_response'

  if (GENERAL_VALIDATION_CODES.has(code)) {
    return {
      state: 'validation_error',
      tone: 'error',
      title: 'Check your submission',
      message: validationMessage(code),
      code,
    }
  }

  if (code === 'duplicate_submission') {
    return {
      state: 'duplicate',
      tone: 'warning',
      title: 'Already received recently',
      message:
        'An identical submission was already received in the current review window. Revise the message before trying again.',
      code,
    }
  }

  if (code === 'rate_limited') {
    const retryAfterSeconds =
      Number.isSafeInteger(result?.error?.retryAfterSeconds) &&
      result.error.retryAfterSeconds > 0
        ? result.error.retryAfterSeconds
        : null

    const retryMinutes =
      retryAfterSeconds === null
        ? null
        : Math.max(1, Math.ceil(retryAfterSeconds / 60))

    return {
      state: 'rate_limited',
      tone: 'warning',
      title: 'Submission limit reached',
      message:
        retryMinutes === null
          ? 'Please wait before sending another submission.'
          : `Please wait about ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'} before trying again.`,
      code,
    }
  }

  if (code === 'request_timed_out') {
    return {
      state: 'unavailable',
      tone: 'error',
      title: 'The request timed out',
      message:
        'Your submission was not confirmed. Keep this form open and try again when the local intake service is available.',
      code,
    }
  }

  return {
    state: 'unavailable',
    tone: 'error',
    title: 'Submission service unavailable',
    message:
      'Your submission was not confirmed. Try again later or return to Ask Mark.',
    code,
  }
}
