import assert from 'node:assert/strict'
import {
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformWithOxc } from 'vite'

const componentPath = fileURLToPath(
  new URL(
    '../src/components/assistant/AskMarkIntakeForm.jsx',
    import.meta.url,
  ),
)
const stylesheetPath = fileURLToPath(
  new URL('../src/styles/assistant.css', import.meta.url),
)
const stateModulePath = fileURLToPath(
  new URL(
    '../src/components/assistant/askMarkIntakeFormState.js',
    import.meta.url,
  ),
)
const componentDirectory = path.dirname(componentPath)
const temporaryModulePath = path.join(
  componentDirectory,
  `.AskMarkIntakeForm.check-${process.pid}.mjs`,
)

const source = await readFile(componentPath, 'utf8')
const stateSource = await readFile(stateModulePath, 'utf8')
const stylesheet = await readFile(stylesheetPath, 'utf8')

assert.equal(source.includes('localStorage'), false)
assert.equal(source.includes('sessionStorage'), false)
assert.equal(source.includes('console.log'), false)
assert.equal(source.includes('pending_review'), false)
assert.equal(source.includes('export function mapAskMarkIntakeResult'), false)
assert.equal(
  (source.match(/export function /gu) || []).length,
  1,
)
assert.equal(stateSource.includes('localStorage'), false)
assert.equal(stateSource.includes('sessionStorage'), false)
assert.equal(stateSource.includes('console.log'), false)
assert.equal(
  source.includes('not automatically published'),
  true,
)

assert.match(
  source,
  /useEffect\(\(\) => \{\s*mountedRef\.current = true[\s\S]*return \(\) => \{[\s\S]*mountedRef\.current = false/u,
)

for (const selector of [
  '.ask-mark-intake',
  '.ask-mark-intake__field',
  '.ask-mark-intake__status',
  '.ask-mark-intake__actions',
  '.ask-mark-intake__accepted',
]) {
  assert.equal(
    stylesheet.includes(selector),
    true,
    `Missing form style selector: ${selector}`,
  )
}

assert.equal(
  stylesheet.includes(
    '@media (prefers-reduced-motion: reduce)',
  ),
  true,
)

const transformed = await transformWithOxc(
  source,
  componentPath,
)

await writeFile(
  temporaryModulePath,
  transformed.code,
  'utf8',
)

try {
  const moduleUrl =
    `${pathToFileURL(temporaryModulePath).href}` +
    `?checkpoint=${Date.now()}`

  const { AskMarkIntakeForm } = await import(moduleUrl)

  const stateModuleUrl =
    `${pathToFileURL(stateModulePath).href}` +
    `?checkpoint=${Date.now()}`

  const { mapAskMarkIntakeResult } =
    await import(stateModuleUrl)

  assert.equal(typeof AskMarkIntakeForm, 'function')
  assert.equal(
    typeof mapAskMarkIntakeResult,
    'function',
  )

  assert.deepEqual(
    mapAskMarkIntakeResult({
      ok: true,
      submission: {
        id: 'submission_test',
        status: 'pending_review',
      },
    }),
    {
      state: 'accepted',
      tone: 'success',
      title: 'Received for private review',
      message:
        'Thanks—your submission is pending Mark’s private review. It has not been added to Ask Mark’s approved answers.',
    },
  )

  assert.equal(
    mapAskMarkIntakeResult({
      ok: false,
      error: {
        code: 'duplicate_submission',
        status: 409,
        retryAfterSeconds: null,
      },
    }).state,
    'duplicate',
  )

  const rateLimited = mapAskMarkIntakeResult({
    ok: false,
    error: {
      code: 'rate_limited',
      status: 429,
      retryAfterSeconds: 121,
    },
  })

  assert.equal(rateLimited.state, 'rate_limited')
  assert.equal(
    rateLimited.message,
    'Please wait about 3 minutes before trying again.',
  )

  assert.equal(
    mapAskMarkIntakeResult({
      ok: false,
      error: {
        code: 'message_too_short',
      },
    }).state,
    'validation_error',
  )

  assert.equal(
    mapAskMarkIntakeResult({
      ok: false,
      error: {
        code: 'request_timed_out',
      },
    }).title,
    'The request timed out',
  )

  assert.equal(
    mapAskMarkIntakeResult({
      ok: false,
      error: {
        code: 'unexpected_response',
      },
    }).state,
    'unavailable',
  )

  const markup = renderToStaticMarkup(
    createElement(AskMarkIntakeForm, {
      onCancel: () => {},
      onAccepted: () => {},
      submitIntake: async () => ({
        ok: true,
        submission: {
          id: 'unused',
          status: 'pending_review',
        },
      }),
    }),
  )

  assert.match(
    markup,
    /<section[^>]+aria-labelledby=/u,
  )
  assert.match(
    markup,
    /<form[^>]+noValidate=""/u,
  )
  assert.match(
    markup,
    /name="ask-mark-intake-type"/u,
  )
  assert.match(
    markup,
    /name="ask-mark-intake-language"/u,
  )
  assert.match(
    markup,
    /name="ask-mark-intake-message"/u,
  )

  for (const value of [
    'question',
    'correction',
    'feedback',
    'en',
    'tl',
    'taglish',
  ]) {
    assert.match(
      markup,
      new RegExp(`value="${value}"`, 'u'),
    )
  }

  assert.match(
    markup,
    /aria-live="polite"/u,
  )
  assert.match(
    markup,
    /aria-atomic="true"/u,
  )
  assert.match(
    markup,
    /0\/1000/u,
  )
  assert.match(
    markup,
    /Submit for private review/u,
  )
  assert.match(
    markup,
    /Do not include confidential, sensitive, or personal contact information\./u,
  )
  assert.match(
    markup,
    /not automatically published/u,
  )
  assert.doesNotMatch(
    markup,
    /email|phone number|attachment/u,
  )
} finally {
  await unlink(temporaryModulePath).catch(() => {})
}

process.stdout.write(
  'Ask Mark intake form checks passed: Oxc JSX compilation, component-only Fast Refresh export, isolated result-state mapping, StrictMode remount safety, server-rendered accessibility contract, approved type and language options, Unicode counter, private-review wording, privacy exclusions, CSS coverage, and temporary-module cleanup.\n',
)
