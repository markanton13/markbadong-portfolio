import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const workerDirectory = path.join(repositoryRoot, 'workers', 'ask-mark')
const configPath = path.join(workerDirectory, 'wrangler.jsonc')
const stateDirectory = path.join(workerDirectory, '.wrangler-schema-check')
const databaseName = 'ask-mark-knowledge-local'

const expectedTables = [
  'audit_events',
  'knowledge_items',
  'knowledge_match_terms',
  'knowledge_provenance',
  'knowledge_relations',
  'knowledge_versions',
  'publication_events',
  'publication_release_items',
  'publication_releases',
  'review_decisions',
  'source_records',
  'source_snapshots',
  'system_settings',
  'visitor_rate_limit_buckets',
  'visitor_submission_moderation_actions',
  'visitor_submission_events',
  'visitor_submissions',
]

const wranglerCli = path.join(
  repositoryRoot,
  'node_modules',
  'wrangler',
  'bin',
  'wrangler.js',
)

function fail(message, details = '') {
  if (details) {
    console.error(details.trim())
  }

  throw new Error(message)
}

function runWrangler(argumentsList, { capture = false } = {}) {
  if (!existsSync(wranglerCli)) {
    fail(
      'Wrangler is not installed. Run npm install before validating the Ask Mark schema.',
    )
  }

  const result = spawnSync(process.execPath, [wranglerCli, ...argumentsList], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
      WRANGLER_SEND_METRICS: 'false',
    },
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: true,
  })

  if (result.error) {
    fail(`Wrangler could not start: ${result.error.message}`)
  }

  if (result.status !== 0) {
    fail(
      `Wrangler exited with status ${result.status}.`,
      `${result.stdout || ''}\n${result.stderr || ''}`,
    )
  }

  return result.stdout || ''
}

function findValidationRow(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const row = findValidationRow(entry)
      if (row) return row
    }

    return null
  }

  if (!value || typeof value !== 'object') return null

  if (
    Object.hasOwn(value, 'app_table_count') &&
    Object.hasOwn(value, 'migration_count')
  ) {
    return value
  }

  if (Array.isArray(value.results)) {
    const row = value.results.find(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        Object.hasOwn(entry, 'app_table_count'),
    )

    if (row) return row
  }

  for (const nested of Object.values(value)) {
    const row = findValidationRow(nested)
    if (row) return row
  }

  return null
}

function parseValidationOutput(output) {
  let parsed

  try {
    parsed = JSON.parse(output)
  } catch {
    fail('Wrangler returned invalid JSON during schema validation.', output)
  }

  const row = findValidationRow(parsed)

  if (!row) {
    fail('The schema validation query returned no usable result row.', output)
  }

  return row
}

function migrationArguments(command) {
  return [
    'd1',
    'migrations',
    command,
    databaseName,
    '--local',
    '--persist-to',
    stateDirectory,
    '--config',
    configPath,
  ]
}

rmSync(stateDirectory, { recursive: true, force: true })

let validationSucceeded = false

try {
  runWrangler(migrationArguments('apply'))

  // A second replay confirms that Wrangler records each migration and does not
  // try to apply the same file twice.
  runWrangler(migrationArguments('apply'))

  const quotedTableNames = expectedTables
    .map((tableName) => `'${tableName}'`)
    .join(', ')

  const validationQuery = `
    SELECT
      (
        SELECT COUNT(*)
        FROM sqlite_schema
        WHERE type = 'table'
          AND name IN (${quotedTableNames})
      ) AS app_table_count,
      (
        SELECT COUNT(*)
        FROM sqlite_schema
        WHERE type = 'view'
          AND name = 'v_active_knowledge'
      ) AS active_view_count,
      (
        SELECT COUNT(*)
        FROM d1_migrations
      ) AS migration_count,
      (
        SELECT value_text
        FROM system_settings
        WHERE setting_key = 'schema_version'
      ) AS schema_version;
  `.replace(/\s+/g, ' ').trim()

  const output = runWrangler(
    [
      'd1',
      'execute',
      databaseName,
      '--local',
      '--persist-to',
      stateDirectory,
      '--config',
      configPath,
      '--command',
      validationQuery,
      '--json',
      '--yes',
    ],
    { capture: true },
  )

  const row = parseValidationOutput(output)

  const actualTableCount = Number(row.app_table_count)
  const actualViewCount = Number(row.active_view_count)
  const actualMigrationCount = Number(row.migration_count)

  if (actualTableCount !== expectedTables.length) {
    fail(
      `Expected ${expectedTables.length} Ask Mark tables, found ${actualTableCount}.`,
    )
  }

  if (actualViewCount !== 1) {
    fail(`Expected one active-knowledge view, found ${actualViewCount}.`)
  }

  if (actualMigrationCount !== 6) {
    fail(`Expected six recorded migrations, found ${actualMigrationCount}.`)
  }

  if (row.schema_version !== '4C.1') {
    fail(`Expected schema version 4C.1, found ${row.schema_version ?? 'none'}.`)
  }

  validationSucceeded = true

  console.log(
    `Ask Mark D1 schema checks passed: ${actualTableCount} tables, ` +
      `${actualViewCount} view, ${actualMigrationCount} migrations, ` +
      `schema ${row.schema_version}.`,
  )
} finally {
  if (validationSucceeded) {
    rmSync(stateDirectory, { recursive: true, force: true })
  } else {
    console.error(
      `Disposable local state was retained for inspection at ${stateDirectory}`,
    )
  }
}
