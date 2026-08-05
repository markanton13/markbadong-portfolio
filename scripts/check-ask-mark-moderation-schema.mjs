import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import {
  config,
  database,
  localArgs,
  migrate,
  query,
  root,
  run,
  worker,
  wranglerCli,
} from './lib/ask-mark-d1.mjs'

const stateDirectory = path.join(
  worker,
  '.wrangler-moderation-schema-check',
)
const migrationPath = path.join(
  worker,
  'migrations',
  '0006_private_moderation.sql',
)

function compact(parts) {
  return parts.join(' ').replace(/\s+/gu, ' ').trim()
}

function execute(sql) {
  run([
    'd1',
    'execute',
    ...localArgs(stateDirectory),
    '--command',
    sql.replace(/\s+/gu, ' ').trim(),
    '--yes',
  ])
}

function expectSqlFailure(sql, label) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerCli,
      'd1',
      'execute',
      database,
      '--local',
      '--persist-to',
      stateDirectory,
      '--config',
      config,
      '--command',
      sql.replace(/\s+/gu, ' ').trim(),
      '--yes',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        CI: '1',
        WRANGLER_SEND_METRICS: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (result.error) throw result.error

  assert.notEqual(
    result.status,
    0,
    `${label} unexpectedly succeeded.`,
  )
}

const migrationSource = readFileSync(migrationPath, 'utf8')

for (const required of [
  'CREATE TABLE visitor_submission_events_v4c',
  'INSERT INTO visitor_submission_events_v4c',
  'FROM visitor_submission_events',
  "'reopened'",
  "'admin'",
  'CREATE TABLE visitor_submission_moderation_actions',
  'idx_visitor_submission_moderation_submission_created',
  'idx_visitor_submission_moderation_action_created',
  'idx_visitor_submission_moderation_actor_created',
  "'4C.1'",
]) {
  assert.equal(
    migrationSource.includes(required),
    true,
    `Moderation migration is missing: ${required}`,
  )
}

for (const prohibited of [
  'knowledge_items',
  'publication_releases',
  'publication_release_items',
  'source_records',
  'v_active_knowledge',
]) {
  assert.equal(
    migrationSource.includes(prohibited),
    false,
    `Moderation migration must not reference: ${prohibited}`,
  )
}

rmSync(stateDirectory, { recursive: true, force: true })
let validationSucceeded = false

try {
  migrate(stateDirectory)
  migrate(stateDirectory)

  const schemaRow = query(
    stateDirectory,
    compact([
      'SELECT',
      '(SELECT COUNT(*) FROM d1_migrations) AS migration_count,',
      '(',
      'SELECT value_text FROM system_settings',
      "WHERE setting_key = 'schema_version'",
      ') AS schema_version,',
      '(',
      'SELECT COUNT(*) FROM sqlite_schema',
      "WHERE type = 'table'",
      "AND name = 'visitor_submission_moderation_actions'",
      ') AS moderation_table_count,',
      '(',
      'SELECT COUNT(*) FROM sqlite_schema',
      "WHERE type = 'index'",
      "AND name LIKE 'idx_visitor_submission_moderation_%'",
      ') AS moderation_index_count,',
      '(',
      'SELECT COUNT(*)',
      "FROM pragma_foreign_key_list('visitor_submission_moderation_actions')",
      "WHERE \"table\" = 'visitor_submissions'",
      "AND \"from\" = 'submission_id'",
      "AND on_update = 'CASCADE'",
      "AND on_delete = 'CASCADE'",
      ') AS moderation_fk_count,',
      '(',
      'SELECT COUNT(*)',
      "FROM pragma_foreign_key_list('visitor_submission_events')",
      "WHERE \"table\" = 'visitor_submissions'",
      "AND \"from\" = 'submission_id'",
      ') AS event_fk_count;',
    ]),
  )

  assert.equal(Number(schemaRow.migration_count), 6)
  assert.equal(schemaRow.schema_version, '4C.1')
  assert.equal(Number(schemaRow.moderation_table_count), 1)
  assert.equal(Number(schemaRow.moderation_index_count), 3)
  assert.equal(Number(schemaRow.moderation_fk_count), 1)
  assert.equal(Number(schemaRow.event_fk_count), 1)

  const baseline = query(
    stateDirectory,
    compact([
      'SELECT',
      '(SELECT COUNT(*) FROM source_records) AS source_count,',
      '(SELECT COUNT(*) FROM knowledge_items) AS knowledge_count,',
      '(SELECT COUNT(*) FROM publication_releases) AS release_count,',
      '(',
      'SELECT COUNT(*) FROM publication_release_items',
      ') AS release_item_count,',
      '(SELECT COUNT(*) FROM v_active_knowledge) AS active_count;',
    ]),
  )

  const hashA = 'a'.repeat(64)
  const hashB = 'b'.repeat(64)

  execute(
    compact([
      'PRAGMA foreign_keys = ON;',
      'INSERT INTO visitor_submissions (',
      'id, submission_type, language, content_text, content_hash,',
      'deduplication_hash, status, created_at, updated_at, expires_at',
      ') VALUES (',
      "'submission_moderation_schema',",
      "'question',",
      "'taglish',",
      "'May private moderation workflow ba si Ask Mark?',",
      `'${hashA}',`,
      `'${hashB}',`,
      "'pending_review',",
      "'2026-08-04T00:00:00.000Z',",
      "'2026-08-04T00:00:00.000Z',",
      "'2026-11-02T00:00:00.000Z'",
      ');',
      'INSERT INTO visitor_submission_events (',
      'id, submission_id, event_type, previous_status,',
      'resulting_status, reason_code, actor_type, actor_id, created_at',
      ') VALUES',
      '(',
      "'event_moderation_legacy',",
      "'submission_moderation_schema',",
      "'queued_for_review',",
      "'received',",
      "'pending_review',",
      'NULL,',
      "'system',",
      'NULL,',
      "'2026-08-04T00:00:00.000Z'",
      '),',
      '(',
      "'event_moderation_reopened',",
      "'submission_moderation_schema',",
      "'reopened',",
      "'archived',",
      "'pending_review',",
      "'needs_reconsideration',",
      "'admin',",
      "'local-admin:mark',",
      "'2026-08-04T00:00:05.000Z'",
      ');',
      'INSERT INTO visitor_submission_moderation_actions (',
      'id, submission_id, action_type, previous_status,',
      'resulting_status, reason_code, note_text, actor_id, created_at',
      ') VALUES',
      '(',
      "'action_schema_approve',",
      "'submission_moderation_schema',",
      "'approve',",
      "'pending_review',",
      "'approved',",
      "'useful_question',",
      "'Verify before later curation.',",
      "'local-admin:mark',",
      "'2026-08-04T00:00:01.000Z'",
      '),',
      '(',
      "'action_schema_reject',",
      "'submission_moderation_schema',",
      "'reject',",
      "'pending_review',",
      "'rejected',",
      "'not_actionable',",
      'NULL,',
      "'local-admin:mark',",
      "'2026-08-04T00:00:02.000Z'",
      '),',
      '(',
      "'action_schema_archive',",
      "'submission_moderation_schema',",
      "'archive',",
      "'approved',",
      "'archived',",
      "'resolved',",
      'NULL,',
      "'local-admin:mark',",
      "'2026-08-04T00:00:03.000Z'",
      '),',
      '(',
      "'action_schema_reopen',",
      "'submission_moderation_schema',",
      "'reopen',",
      "'archived',",
      "'pending_review',",
      "'needs_reconsideration',",
      'NULL,',
      "'local-admin:mark',",
      "'2026-08-04T00:00:04.000Z'",
      ');',
    ]),
  )

  expectSqlFailure(
    compact([
      'INSERT INTO visitor_submission_moderation_actions (',
      'id, submission_id, action_type, previous_status,',
      'resulting_status, reason_code, note_text, actor_id, created_at',
      ') VALUES (',
      "'action_schema_invalid_reason',",
      "'submission_moderation_schema',",
      "'approve',",
      "'pending_review',",
      "'approved',",
      "'duplicate',",
      'NULL,',
      "'local-admin:mark',",
      "'2026-08-04T00:00:06.000Z'",
      ');',
    ]),
    'Invalid action-specific reason',
  )

  expectSqlFailure(
    compact([
      'INSERT INTO visitor_submission_events (',
      'id, submission_id, event_type, previous_status,',
      'resulting_status, reason_code, actor_type, actor_id, created_at',
      ') VALUES (',
      "'event_schema_invalid_actor',",
      "'submission_moderation_schema',",
      "'approved',",
      "'pending_review',",
      "'approved',",
      "'useful_question',",
      "'visitor',",
      'NULL,',
      "'2026-08-04T00:00:07.000Z'",
      ');',
    ]),
    'Invalid moderation actor',
  )

  const result = query(
    stateDirectory,
    compact([
      'SELECT',
      '(',
      'SELECT COUNT(*)',
      'FROM visitor_submission_moderation_actions',
      ') AS action_count,',
      '(',
      'SELECT COUNT(*) FROM visitor_submission_events',
      "WHERE actor_type = 'admin' AND event_type = 'reopened'",
      ') AS admin_reopened_count,',
      '(',
      'SELECT COUNT(*) FROM visitor_submission_events',
      "WHERE actor_type = 'system'",
      ') AS legacy_system_count,',
      '(',
      'SELECT COUNT(*) FROM pragma_foreign_key_check',
      ') AS foreign_key_issue_count,',
      '(SELECT COUNT(*) FROM source_records) AS source_count,',
      '(SELECT COUNT(*) FROM knowledge_items) AS knowledge_count,',
      '(SELECT COUNT(*) FROM publication_releases) AS release_count,',
      '(',
      'SELECT COUNT(*) FROM publication_release_items',
      ') AS release_item_count,',
      '(SELECT COUNT(*) FROM v_active_knowledge) AS active_count;',
    ]),
  )

  assert.equal(Number(result.action_count), 4)
  assert.equal(Number(result.admin_reopened_count), 1)
  assert.equal(Number(result.legacy_system_count), 1)
  assert.equal(Number(result.foreign_key_issue_count), 0)
  assert.equal(Number(result.source_count), Number(baseline.source_count))
  assert.equal(Number(result.knowledge_count), Number(baseline.knowledge_count))
  assert.equal(Number(result.release_count), Number(baseline.release_count))
  assert.equal(
    Number(result.release_item_count),
    Number(baseline.release_item_count),
  )
  assert.equal(Number(result.active_count), Number(baseline.active_count))

  validationSucceeded = true

  console.log(
    [
      'Ask Mark moderation schema checks passed:',
      'six replay-safe migrations, schema 4C.1, preserved lifecycle events,',
      'admin/reopened constraints, action-specific decisions, three indexes,',
      'valid foreign keys, and zero source, knowledge, release, or active-view mutation.',
    ].join(' '),
  )
} finally {
  if (validationSucceeded) {
    rmSync(stateDirectory, { recursive: true, force: true })
  } else {
    console.error(
      'Disposable moderation schema state was retained at ' +
        stateDirectory,
    )
  }
}
