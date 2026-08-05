import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const designPath = path.join(
  root,
  'workers',
  'ask-mark',
  'PHASE-4C-DESIGN.md',
)
const threatPath = path.join(
  root,
  'workers',
  'ask-mark',
  'PHASE-4C-THREAT-MODEL.md',
)

const [design, threat] = await Promise.all([
  readFile(designPath, 'utf8'),
  readFile(threatPath, 'utf8'),
])

function includesAll(source, values, label) {
  for (const value of values) {
    assert.equal(
      source.includes(value),
      true,
      `${label} is missing: ${value}`,
    )
  }
}

includesAll(
  design,
  [
    'Automatic publication: Prohibited',
    '`approved` means approved for later human curation',
    'ASK_MARK_MODERATION_MODE=local-only',
    'ASK_MARK_MODERATION_KEY=<development-only key of at least 32 characters>',
    'GET /v1/admin/intake/submissions',
    'GET /v1/admin/intake/submissions/:submissionId',
    'POST /v1/admin/intake/submissions/:submissionId/actions',
    'X-Ask-Mark-Local-Admin-Key',
    '409 stale_submission',
    '409 invalid_moderation_transition',
    'workers/ask-mark/migrations/0006_private_moderation.sql',
    'visitor_submission_moderation_actions',
    'actor_type = admin',
    'Phase 6, not Phase 4C',
    'component memory',
    'must never be written to localStorage',
    'normal, preview, and production bundles exclude moderation code',
  ],
  'Phase 4C design contract',
)

includesAll(
  threat,
  [
    'Stored cross-site scripting',
    'Concurrent or stale moderation',
    'Automatic publication or knowledge poisoning',
    'Sensitive visitor content',
    'Build leakage',
    'constant-time comparison',
    'prepared statements only',
    'no `dangerouslySetInnerHTML`',
    'no mutation of knowledge, source, release, or active views',
  ],
  'Phase 4C threat model',
)

assert.equal(
  design.includes('automatic knowledge creation'),
  true,
)
assert.equal(
  design.includes('automatic publication'),
  true,
)
assert.equal(
  /production writes:\s*prohibited/iu.test(design),
  true,
)
assert.equal(
  /production exposure:\s*prohibited/iu.test(threat),
  true,
)

console.log(
  [
    'Ask Mark Phase 4C architecture checks passed:',
    'local-only admin activation, private queue/detail/action contracts,',
    'atomic audited state transitions, stale-write protection,',
    'session-only key handling, plain-text rendering, build isolation,',
    'retention boundaries, and zero automatic publication.',
  ].join(' '),
)
