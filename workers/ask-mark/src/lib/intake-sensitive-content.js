const EMAIL_PATTERN =
  /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/giu

const INTERNATIONAL_PHONE_PATTERN =
  /(?:^|[^\p{L}\p{N}])(\+[1-9](?:[ ()-]?\d){7,14})(?![\p{L}\p{N}])/gu

const PHILIPPINE_MOBILE_PATTERN =
  /(?:^|[^\p{L}\p{N}])09\d{9}(?![\p{L}\p{N}])/u

const PRIVATE_KEY_PATTERN =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/iu

const RECOGNIZABLE_TOKEN_PATTERN =
  /\b(?:AKIA|ASIA)[0-9A-Z]{16,}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b|\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/iu

// AWS explicitly publishes these exact values as documentation examples.
// Do not generalize this exemption to values with example/test-like suffixes.
// Source: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-keys-admin-managed.html
const VERIFIED_CREDENTIAL_PLACEHOLDERS = new Set([
  'AKIAIOSFODNN7EXAMPLE',
  'AKIAI44QH8DHBEXAMPLE',
])

const RESERVED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
])

function isReservedExampleEmail(address) {
  const domain = address.slice(address.lastIndexOf('@') + 1).toLowerCase()

  return (
    RESERVED_EMAIL_DOMAINS.has(domain) ||
    /\.(?:example|invalid|test)$/u.test(domain)
  )
}

function hasNonPlaceholderEmail(message) {
  for (const match of message.matchAll(EMAIL_PATTERN)) {
    if (!isReservedExampleEmail(match[0])) return true
  }

  return false
}

function isReservedNorthAmericanExample(number) {
  const digits = number.replace(/\D/gu, '')

  return (
    digits.length === 11 &&
    digits.startsWith('1') &&
    digits.slice(4, 7) === '555' &&
    Number(digits.slice(7)) >= 100 &&
    Number(digits.slice(7)) <= 199
  )
}

function hasNonPlaceholderPhone(message) {
  for (const match of message.matchAll(INTERNATIONAL_PHONE_PATTERN)) {
    if (!isReservedNorthAmericanExample(match[1])) return true
  }

  return PHILIPPINE_MOBILE_PATTERN.test(message)
}

function hasCredential(message) {
  if (PRIVATE_KEY_PATTERN.test(message)) return true

  const tokenPattern = new RegExp(
    RECOGNIZABLE_TOKEN_PATTERN.source,
    'giu',
  )

  for (const match of message.matchAll(tokenPattern)) {
    if (!VERIFIED_CREDENTIAL_PLACEHOLDERS.has(match[0])) return true
  }

  return false
}

/**
 * Return only fixed signal codes. Never return matched text or captures.
 * This conservative local rule set is not comprehensive DLP.
 */
export function detectSensitiveContentSignals(message) {
  if (typeof message !== 'string') return []

  const signals = []

  if (hasNonPlaceholderEmail(message) || hasNonPlaceholderPhone(message)) {
    signals.push('possible_contact_detail')
  }

  if (hasCredential(message)) {
    signals.push('possible_credential')
  }

  return signals
}

export function containsHighConfidenceSensitiveContent(message) {
  return detectSensitiveContentSignals(message).length > 0
}
