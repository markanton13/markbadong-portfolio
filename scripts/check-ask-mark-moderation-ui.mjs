import assert from 'node:assert/strict'
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(
  fileURLToPath(import.meta.url),
)
const root = path.resolve(here, '..')
const viteCli = path.join(
  root,
  'node_modules',
  'vite',
  'bin',
  'vite.js',
)
const moderationOutput = path.join(
  root,
  '.moderation-ui-build-check',
)
const publicModes = [
  'askmark',
  'askmark-preview',
  'askmark-production',
]
const publicOutputs = publicModes.map(
  (mode) =>
    path.join(
      root,
      `.moderation-public-build-check-${mode}`,
    ),
)

const requiredFiles = [
  'ask-mark-moderation.html',
  'vite.moderation.config.js',
  'src/admin/ask-mark-moderation/main.jsx',
  'src/admin/ask-mark-moderation/ModerationApp.jsx',
  'src/admin/ask-mark-moderation/moderationClient.js',
  'src/admin/ask-mark-moderation/moderation.css',
]

function read(relativePath) {
  return readFileSync(
    path.join(root, relativePath),
    'utf8',
  )
}

function runVite(argumentsList) {
  const result = spawnSync(
    process.execPath,
    [viteCli, ...argumentsList],
    {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        CI: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (result.error) throw result.error

  if (result.status !== 0) {
    throw new Error(
      [
        'Vite build failed.',
        result.stdout || '',
        result.stderr || '',
      ].join('\n'),
    )
  }
}

function textFiles(directory) {
  const output = []

  for (const entry of readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  )) {
    const absolute = path.join(
      directory,
      entry.name,
    )

    if (entry.isDirectory()) {
      output.push(...textFiles(absolute))
      continue
    }

    if (
      /\.(?:html|js|css|json|map)$/u.test(
        entry.name,
      )
    ) {
      output.push(absolute)
    }
  }

  return output
}

function combinedText(directory) {
  return textFiles(directory)
    .map((file) =>
      readFileSync(file, 'utf8'),
    )
    .join('\n')
}

for (const relativePath of requiredFiles) {
  assert.equal(
    existsSync(path.join(root, relativePath)),
    true,
    `Missing moderation UI file: ${relativePath}`,
  )
}

const html = read('ask-mark-moderation.html')
const config = read('vite.moderation.config.js')
const app = read(
  'src/admin/ask-mark-moderation/ModerationApp.jsx',
)
const client = read(
  'src/admin/ask-mark-moderation/moderationClient.js',
)
const css = read(
  'src/admin/ask-mark-moderation/moderation.css',
)

assert.match(
  html,
  /noindex,\s*nofollow,\s*noarchive/iu,
)
assert.match(
  html,
  /src="\/src\/admin\/ask-mark-moderation\/main\.jsx"/u,
)
assert.match(
  config,
  /ask-mark-moderation\.html/u,
)
assert.match(
  config,
  /\.ask-mark-moderation-dist/u,
)

for (const required of [
  "environment?.DEV !== true",
  "LOCAL_MODERATION_MODE",
  "askmark-moderation",
  "http://127.0.0.1:8787",
  "parsed.protocol !== 'http:'",
  "parsed.port !== '8787'",
  "parsed.username",
  "parsed.password",
  "X-Ask-Mark-Local-Admin-Key",
  "/v1/admin/intake/submissions",
  "credentials: 'omit'",
  "cache: 'no-store'",
  "referrerPolicy: 'no-referrer'",
]) {
  assert.equal(
    client.includes(required),
    true,
    `Moderation client is missing: ${required}`,
  )
}

for (const required of [
  'Private review queue',
  'Lock session',
  'pending_review',
  'approve',
  'reject',
  'archive',
  'reopen',
  'stale_submission',
  'autoComplete="new-password"',
  "event.key === 'Escape'",
  'Never published automatically.',
  'aria-live="polite"',
  'maxLength={1000}',
]) {
  assert.equal(
    app.includes(required),
    true,
    `Moderation app is missing: ${required}`,
  )
}

assert.match(
  app,
  /never\s+publish\s+knowledge\s+automatically/iu,
  'Moderation app is missing the private-publication safety copy.',
)

for (const required of [
  '@media (max-width: 560px)',
  '@media (prefers-reduced-motion: reduce)',
  'overflow-wrap: anywhere',
  'white-space: pre-wrap',
  ':focus-visible',
]) {
  assert.equal(
    css.includes(required),
    true,
    `Moderation CSS is missing: ${required}`,
  )
}

const sourceText = [
  html,
  config,
  app,
  client,
  css,
].join('\n')

for (const prohibited of [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document.cookie',
  'dangerouslySetInnerHTML',
  '.innerHTML',
  'eval(',
  'new Function',
  'marked(',
  'markdown-it',
]) {
  assert.equal(
    sourceText.includes(prohibited),
    false,
    `Moderation UI contains prohibited behavior: ${prohibited}`,
  )
}

for (const directory of [
  moderationOutput,
  ...publicOutputs,
]) {
  rmSync(directory, {
    recursive: true,
    force: true,
  })
}

let validationSucceeded = false

try {
  runVite([
    'build',
    '--config',
    'vite.moderation.config.js',
    '--mode',
    'askmark-moderation',
    '--outDir',
    moderationOutput,
    '--emptyOutDir',
  ])

  const moderationBuild =
    combinedText(moderationOutput)

  for (const required of [
    '/v1/admin/intake/submissions',
    'X-Ask-Mark-Local-Admin-Key',
    'Private review queue',
  ]) {
    assert.equal(
      moderationBuild.includes(required),
      true,
      `Dedicated moderation build is missing: ${required}`,
    )
  }

  for (
    let index = 0;
    index < publicModes.length;
    index += 1
  ) {
    const mode = publicModes[index]
    const output = publicOutputs[index]

    runVite([
      'build',
      '--mode',
      mode,
      '--outDir',
      output,
      '--emptyOutDir',
    ])

    const publicBuild = combinedText(output)

    for (const prohibited of [
      '/v1/admin/intake/submissions',
      'X-Ask-Mark-Local-Admin-Key',
      'Private review queue',
      'Ask Mark Private Moderation',
    ]) {
      assert.equal(
        publicBuild.includes(prohibited),
        false,
        `${mode} bundle leaked moderation content: ${prohibited}`,
      )
    }

    assert.equal(
      existsSync(
        path.join(
          output,
          'ask-mark-moderation.html',
        ),
      ),
      false,
      `${mode} emitted the private moderation HTML entrypoint.`,
    )
  }

  validationSucceeded = true

  console.log(
    [
      'Ask Mark moderation UI checks passed:',
      'session-only key handling, local loopback client,',
      'queue/detail/actions, plain-text rendering,',
      'keyboard/mobile/reduced-motion support,',
      'dedicated admin build, and zero moderation content',
      'in normal, preview, or production public bundles.',
    ].join(' '),
  )
} finally {
  for (const directory of [
    moderationOutput,
    ...publicOutputs,
  ]) {
    rmSync(directory, {
      recursive: true,
      force: true,
    })
  }

  if (!validationSucceeded) {
    console.error(
      'Disposable moderation build output was removed after failure.',
    )
  }
}
