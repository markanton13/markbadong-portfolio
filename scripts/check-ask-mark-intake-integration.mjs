import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  resolveAskMarkIntakeConfig,
} from '../src/components/assistant/askMarkIntakeClient.js'

const assistantSource = await readFile(
  new URL(
    '../src/components/assistant/AskMarkAssistant.jsx',
    import.meta.url,
  ),
  'utf8',
)

const formSource = await readFile(
  new URL(
    '../src/components/assistant/AskMarkIntakeForm.jsx',
    import.meta.url,
  ),
  'utf8',
)

const clientSource = await readFile(
  new URL(
    '../src/components/assistant/askMarkIntakeClient.js',
    import.meta.url,
  ),
  'utf8',
)

const stylesheet = await readFile(
  new URL('../src/styles/assistant.css', import.meta.url),
  'utf8',
)

const localEnvSource = await readFile(
  new URL('../.env.askmark', import.meta.url),
  'utf8',
)

const previewEnvSource = await readFile(
  new URL('../.env.askmark-preview', import.meta.url),
  'utf8',
)

const productionEnvSource = await readFile(
  new URL('../.env.askmark-production', import.meta.url),
  'utf8',
)

assert.deepEqual(
  resolveAskMarkIntakeConfig({
    DEV: true,
    MODE: 'askmark',
    VITE_ASK_MARK_INTAKE_MODE: 'local-only',
    VITE_ASK_MARK_API_BASE_URL:
      'http://127.0.0.1:8787',
  }),
  {
    enabled: true,
    baseUrl: 'http://127.0.0.1:8787',
  },
)

for (const environment of [
  {
    DEV: true,
    MODE: 'askmark-preview',
    VITE_ASK_MARK_INTAKE_MODE: 'local-only',
    VITE_ASK_MARK_API_BASE_URL:
      'https://ask-mark-api-preview.markantonbadong13.workers.dev',
  },
  {
    DEV: false,
    MODE: 'askmark-production',
    VITE_ASK_MARK_INTAKE_MODE: 'local-only',
    VITE_ASK_MARK_API_BASE_URL:
      'https://ask-mark-api-production.markantonbadong13.workers.dev',
  },
]) {
  assert.equal(
    resolveAskMarkIntakeConfig(environment).enabled,
    false,
  )
}

assert.match(
  localEnvSource,
  /^VITE_ASK_MARK_INTAKE_MODE=local-only$/mu,
)

assert.doesNotMatch(
  previewEnvSource,
  /VITE_ASK_MARK_INTAKE_MODE/u,
)

assert.doesNotMatch(
  productionEnvSource,
  /VITE_ASK_MARK_INTAKE_MODE/u,
)

assert.match(
  assistantSource,
  /AskMarkAssistant\(\{ environment = import\.meta\.env \} = \{\}\)/u,
)

assert.match(
  assistantSource,
  /resolveAskMarkIntakeConfig\(environment\)\.enabled/u,
)

assert.match(
  assistantSource,
  /const isIntakeView = panelView === 'intake' && intakeEnabled/u,
)

assert.match(
  assistantSource,
  /if \(!intakeEnabled \|\| isLoading\) return/u,
)

assert.match(
  assistantSource,
  /\{isIntakeView \? \([\s\S]*<AskMarkIntakeForm[\s\S]*onCancel=\{returnToAssistant\}/u,
)

assert.match(
  assistantSource,
  /\{intakeEnabled && \([\s\S]*className="ask-mark-intake-entry"[\s\S]*Submit a question, correction, or feedback/u,
)

assert.match(
  assistantSource,
  /const returnToAssistant = \(\) => \{[\s\S]*intakeEntryRef\.current\?\.focus\(\)/u,
)

assert.equal(
  (
    assistantSource.match(
      /setPanelView\('assistant'\)/gu,
    ) || []
  ).length >= 4,
  true,
)

assert.match(
  formSource,
  /ref=\{messageRef\}\s+autoFocus\s+name="ask-mark-intake-message"/u,
)

for (const selector of [
  '.ask-mark-intake-view',
  '.ask-mark-intake-entry',
  '.ask-mark-intake-entry:focus-visible',
]) {
  assert.equal(
    stylesheet.includes(selector),
    true,
    `Missing integration style selector: ${selector}`,
  )
}

for (const source of [
  assistantSource,
  formSource,
  clientSource,
]) {
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|console\.log/u,
  )
}

assert.doesNotMatch(
  assistantSource,
  /ask-mark-api-preview|ask-mark-api-production/u,
)

process.stdout.write(
  'Ask Mark intake integration checks passed: exact local-only gate, preview and production exclusion, guarded panel entry, isolated view switching, Escape/close/minimize reset, cancel focus restoration, textarea autofocus, integration styles, and zero persistence or content logging.\n',
)
