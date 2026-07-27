import { rmSync } from 'node:fs'
import path from 'node:path'
import {
  localArgs,
  migrate,
  query,
  run,
  worker,
} from './lib/ask-mark-d1.mjs'

const stateDirectory = path.join(
  worker,
  '.wrangler-intake-schema-check',
)

const expectedTables = [
  'visitor_rate_limit_buckets',
  'visitor_submission_events',
  'visitor_submissions',
]

const expectedIndexes = [
  'idx_visitor_rate_limit_buckets_expiry',
  'idx_visitor_submission_events_submission_created',
  'idx_visitor_submissions_expiry',
  'idx_visitor_submissions_hash_created',
  'idx_visitor_submissions_status_created',
  'idx_visitor_submissions_type_language_created',
]

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

function quoteSql(value) {
  return "'" + value.replaceAll("'", "''") + "'"
}

function sqlList(values) {
  return values.map(quoteSql).join(', ')
}

function compact(parts) {
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

let validationSucceeded = false

rmSync(stateDirectory, { recursive: true, force: true })

try {
  migrate(stateDirectory)
  migrate(stateDirectory)

  const schemaSql = compact([
    'SELECT',
    '(',
    'SELECT COUNT(*)',
    'FROM sqlite_schema',
    "WHERE type = 'table'",
    'AND name IN (' + sqlList(expectedTables) + ')',
    ') AS intake_table_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM sqlite_schema',
    "WHERE type = 'index'",
    'AND name IN (' + sqlList(expectedIndexes) + ')',
    ') AS intake_index_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM d1_migrations',
    ') AS migration_count,',
    '(',
    'SELECT value_text',
    'FROM system_settings',
    "WHERE setting_key = 'schema_version'",
    ') AS schema_version,',
    '(',
    'SELECT COUNT(*)',
    "FROM pragma_foreign_key_list('visitor_submissions')",
    ') AS submission_fk_count,',
    '(',
    'SELECT COUNT(*)',
    "FROM pragma_foreign_key_list('visitor_rate_limit_buckets')",
    ') AS bucket_fk_count,',
    '(',
    'SELECT COUNT(*)',
    "FROM pragma_foreign_key_list('visitor_submission_events')",
    "WHERE \"table\" = 'visitor_submissions'",
    "AND \"from\" = 'submission_id'",
    "AND on_update = 'CASCADE'",
    "AND on_delete = 'CASCADE'",
    ') AS event_submission_fk_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM sqlite_schema',
    "WHERE type = 'view'",
    "AND name = 'v_active_knowledge'",
    "AND instr(lower(sql), 'visitor_') > 0",
    ') AS active_view_intake_reference_count,',
    '(',
    'SELECT COUNT(*)',
    "FROM pragma_index_list('visitor_submissions') AS indexes",
    'JOIN pragma_index_info(indexes.name) AS columns',
    'WHERE indexes."unique" = 1',
    "AND columns.name = 'deduplication_hash'",
    ') AS deduplication_unique_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM sqlite_schema',
    "WHERE type = 'table'",
    "AND name = 'visitor_rate_limit_buckets'",
    "AND instr(sql, 'request_count BETWEEN 0 AND 5') > 0",
    ') AS capped_request_count_table_count;',
  ])

  const schemaRow = query(stateDirectory, schemaSql)

  expect(
    schemaRow !== null,
    'The intake schema validation query returned no row.',
  )

  expect(
    Number(schemaRow.intake_table_count) === expectedTables.length,
    'Expected ' +
      expectedTables.length +
      ' intake tables; found ' +
      schemaRow.intake_table_count +
      '.',
  )

  expect(
    Number(schemaRow.intake_index_count) === expectedIndexes.length,
    'Expected ' +
      expectedIndexes.length +
      ' intake indexes; found ' +
      schemaRow.intake_index_count +
      '.',
  )

  expect(
    Number(schemaRow.migration_count) === 5,
    'Expected five migrations; found ' + schemaRow.migration_count + '.',
  )

  expect(
    schemaRow.schema_version === '4A.1',
    'Expected schema 4A.1; found ' +
      (schemaRow.schema_version ?? 'none') +
      '.',
  )

  expect(
    Number(schemaRow.submission_fk_count) === 0,
    'visitor_submissions must not reference another table.',
  )

  expect(
    Number(schemaRow.bucket_fk_count) === 0,
    'visitor_rate_limit_buckets must not reference another table.',
  )

  expect(
    Number(schemaRow.event_submission_fk_count) === 1,
    'visitor_submission_events must reference only visitor_submissions.',
  )

  expect(
    Number(schemaRow.active_view_intake_reference_count) === 0,
    'v_active_knowledge must not reference visitor-intake tables.',
  )

  expect(
    Number(schemaRow.deduplication_unique_count) === 1,
    'visitor_submissions must uniquely constrain deduplication_hash.',
  )

  expect(
    Number(schemaRow.capped_request_count_table_count) === 1,
    'visitor_rate_limit_buckets must cap request_count at five.',
  )

  const submissionHash = 'a'.repeat(64)
  const deduplicationHash = 'c'.repeat(64)
  const bucketHash = 'b'.repeat(64)

  const insertSql = compact([
    'PRAGMA foreign_keys = ON;',
    'INSERT INTO visitor_submissions (',
    'id, submission_type, language, content_text, content_hash,',
    'deduplication_hash, status, created_at, updated_at, expires_at',
    ') VALUES (',
    "'submission_local_schema_0001',",
    "'question',",
    "'taglish',",
    "'May CRM projects ba si Mark na puwedeng makita?',",
    quoteSql(submissionHash) + ',',
    quoteSql(deduplicationHash) + ',',
    "'pending_review',",
    "'2026-07-27T00:00:00.000Z',",
    "'2026-07-27T00:00:00.000Z',",
    "'2026-10-25T00:00:00.000Z'",
    ');',
    'INSERT INTO visitor_submission_events (',
    'id, submission_id, event_type, previous_status,',
    'resulting_status, reason_code, actor_type, actor_id, created_at',
    ') VALUES',
    '(',
    "'event_local_schema_0001',",
    "'submission_local_schema_0001',",
    "'received',",
    'NULL,',
    "'received',",
    'NULL,',
    "'local_test',",
    "'schema-check',",
    "'2026-07-27T00:00:00.000Z'",
    '),',
    '(',
    "'event_local_schema_0002',",
    "'submission_local_schema_0001',",
    "'queued_for_review',",
    "'received',",
    "'pending_review',",
    'NULL,',
    "'local_test',",
    "'schema-check',",
    "'2026-07-27T00:00:01.000Z'",
    ');',
    'INSERT INTO visitor_rate_limit_buckets (',
    'bucket_hash, window_started_at, request_count, expires_at, updated_at',
    ') VALUES (',
    quoteSql(bucketHash) + ',',
    "'2026-07-27T00:00:00.000Z',",
    '1,',
    "'2026-07-27T00:15:00.000Z',",
    "'2026-07-27T00:00:00.000Z'",
    ');',
  ])

  run([
    'd1',
    'execute',
    ...localArgs(stateDirectory),
    '--command',
    insertSql,
    '--yes',
  ])

  const dataSql = compact([
    'SELECT',
    '(',
    'SELECT COUNT(*)',
    'FROM visitor_submissions',
    ') AS submission_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM visitor_submission_events',
    ') AS event_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM visitor_rate_limit_buckets',
    ') AS bucket_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM v_active_knowledge',
    ') AS active_knowledge_count,',
    '(',
    'SELECT COUNT(*)',
    'FROM pragma_foreign_key_check',
    ') AS foreign_key_issue_count;',
  ])

  const dataRow = query(stateDirectory, dataSql)

  expect(
    dataRow !== null,
    'The disposable intake-data query returned no row.',
  )

  expect(
    Number(dataRow.submission_count) === 1,
    'Expected one disposable visitor submission.',
  )

  expect(
    Number(dataRow.event_count) === 2,
    'Expected two disposable lifecycle events.',
  )

  expect(
    Number(dataRow.bucket_count) === 1,
    'Expected one disposable rate-limit bucket.',
  )

  expect(
    Number(dataRow.active_knowledge_count) === 0,
    'Visitor intake must not create active knowledge.',
  )

  expect(
    Number(dataRow.foreign_key_issue_count) === 0,
    'Disposable intake rows failed foreign-key integrity.',
  )

  validationSucceeded = true

  console.log(
    'Ask Mark intake schema checks passed: 3 isolated tables, ' +
      '6 named indexes, per-window deduplication uniqueness, a capped ' +
      'rate bucket, 5 migrations, schema 4A.1, valid lifecycle rows, ' +
      'and zero active-knowledge coupling.',
  )
} finally {
  if (validationSucceeded) {
    rmSync(stateDirectory, { recursive: true, force: true })
  } else {
    console.error(
      'Disposable local state was retained for inspection at ' +
        stateDirectory,
    )
  }
}
