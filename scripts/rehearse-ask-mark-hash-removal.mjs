import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const worker = path.join(root, 'workers', 'ask-mark')
const draft = path.join(worker, '0007_remove_unkeyed_intake_content_hash.DRAFT.sql')
const cli = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'ask-mark-hash-removal-'))
const databaseName = 'ask-mark-phase4d-rehearsal'
const migrationFiles = [
  '0001_system_sources.sql',
  '0002_knowledge_core.sql',
  '0003_publication.sql',
  '0004_review_audit.sql',
  '0005_visitor_intake.sql',
  '0006_private_moderation.sql',
]

function safeEnvironment() {
  const env = {
    ...process.env,
    CI: '1',
    WRANGLER_SEND_METRICS: 'false',
    WRANGLER_LOG_PATH: path.join(temporaryRoot, 'wrangler.log'),
  }
  for (const name of Object.keys(env)) {
    if (/^(?:CLOUDFLARE_|CF_API_)/iu.test(name)) delete env[name]
  }
  return env
}

function run(config, state, args, allowFailure = false) {
  const result = spawnSync(process.execPath, [cli, ...args, '--local', '--persist-to', state, '--config', config], {
    cwd: temporaryRoot,
    env: safeEnvironment(),
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.error) throw result.error
  if (!allowFailure && result.status !== 0) {
    const diagnostic = `${result.stdout || ''}\n${result.stderr || ''}`
      .replaceAll(temporaryRoot, '<temporary-fixture>')
      .trim()
    throw new Error(`Local Wrangler command failed with exit ${result.status}: ${diagnostic}`)
  }
  return { ok: result.status === 0, stdout: result.stdout || '' }
}

function parseRows(output) {
  const parsed = JSON.parse(output)
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item)
        if (found) return found
      }
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value.results)) return value.results
      for (const item of Object.values(value)) {
        const found = visit(item)
        if (found) return found
      }
    }
    return null
  }
  return visit(parsed) ?? []
}

function query(config, state, sql) {
  const result = run(config, state, ['d1', 'execute', databaseName, '--command', sql, '--json', '--yes'])
  return parseRows(result.stdout)
}

function makeFixture(name, failing = false) {
  const fixture = path.join(temporaryRoot, name)
  const migrations = path.join(fixture, 'migrations')
  const state = path.join(fixture, 'state')
  mkdirSync(migrations, { recursive: true })
  mkdirSync(state, { recursive: true })
  for (const filename of migrationFiles) {
    cpSync(path.join(worker, 'migrations', filename), path.join(migrations, filename))
  }
  let draftSql = readFileSync(draft, 'utf8')
  if (failing) draftSql += '\nSELECT * FROM phase4d_intentional_missing_table;\n'
  writeFileSync(path.join(migrations, '0007_remove_unkeyed_intake_content_hash.sql'), draftSql)
  writeFileSync(path.join(fixture, 'worker.js'), 'export default { fetch() { return new Response("fixture") } }\n')
  const config = path.join(fixture, 'wrangler.jsonc')
  writeFileSync(config, JSON.stringify({
    name: 'ask-mark-phase4d-rehearsal',
    main: 'worker.js',
    compatibility_date: '2026-07-24',
    d1_databases: [{
      binding: 'DB',
      database_name: databaseName,
      database_id: '00000000-0000-0000-0000-000000000000',
      migrations_dir: 'migrations',
      migrations_table: 'd1_migrations',
    }],
  }, null, 2))
  return { config, state }
}

function applyThroughSix(fixture) {
  // The draft migration is omitted from the migration folder until after the baseline.
  const draftPath = path.join(path.dirname(fixture.config), 'migrations', '0007_remove_unkeyed_intake_content_hash.sql')
  const content = readFileSync(draftPath, 'utf8')
  rmSync(draftPath)
  try {
    run(fixture.config, fixture.state, ['d1', 'migrations', 'apply', databaseName])
  } finally {
    writeFileSync(draftPath, content)
  }
}

const populatedFixtureSql = `
INSERT INTO source_records (id,source_key,source_type,title,trust_level,sync_mode,visibility,is_active,created_at,updated_at,created_by,updated_by)
VALUES ('source_fixture','fixture','manual_approved','Fixture',100,'manual','public',1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z','fixture','fixture');
INSERT INTO source_snapshots (id,source_id,version_label,content_hash,content_text,captured_at,created_at,created_by)
VALUES ('snapshot_fixture','source_fixture','v1','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','approved fixture','2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z','fixture');
INSERT INTO knowledge_items (id,item_key,kind,category,title,visibility,sensitivity,lifecycle_status,created_at,created_by)
VALUES ('knowledge_fixture','fixture','fact','portfolio','Approved fixture','public','normal','active','2026-01-01T00:00:00.000Z','fixture');
INSERT INTO knowledge_versions (id,item_id,version_no,content_text,status,created_by,created_at,approved_by,approved_at,content_hash)
VALUES ('version_fixture','knowledge_fixture',1,'Approved content','approved','fixture','2026-01-01T00:00:00.000Z','owner','2026-01-01T00:00:00.000Z','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
INSERT INTO knowledge_provenance (id,knowledge_version_id,source_snapshot_id,evidence_type,created_at,created_by)
VALUES ('provenance_fixture','version_fixture','snapshot_fixture','supports','2026-01-01T00:00:00.000Z','fixture');
INSERT INTO publication_releases (id,release_no,status,title,knowledge_count,created_at,created_by,published_at,published_by)
VALUES ('release_fixture',1,'published','Fixture release',1,'2026-01-01T00:00:00.000Z','fixture','2026-01-01T00:00:00.000Z','owner');
INSERT INTO publication_release_items (release_id,knowledge_item_id,knowledge_version_id,sort_order,added_at,added_by)
VALUES ('release_fixture','knowledge_fixture','version_fixture',1,'2026-01-01T00:00:00.000Z','fixture');
INSERT INTO publication_events (id,release_id,event_type,event_status,created_at,created_by)
VALUES ('publication_event_fixture','release_fixture','published','success','2026-01-01T00:00:00.000Z','owner');
INSERT INTO system_settings (setting_key,value_text,value_json,updated_at,updated_by)
VALUES ('active_release_id','release_fixture',NULL,'2026-01-01T00:00:00.000Z','fixture');
INSERT INTO visitor_submissions (id,submission_type,language,content_text,content_hash,deduplication_hash,status,created_at,updated_at,expires_at)
VALUES ('submission_fixture','question','taglish','Fixture visitor question','cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd','approved','2026-02-01T01:02:03.000Z','2026-02-02T01:02:03.000Z','2026-05-02T01:02:03.000Z');
INSERT INTO visitor_submission_events (id,submission_id,event_type,previous_status,resulting_status,actor_type,actor_id,created_at)
VALUES ('event_received_fixture','submission_fixture','received',NULL,'received','system',NULL,'2026-02-01T01:02:03.000Z');
INSERT INTO visitor_submission_events (id,submission_id,event_type,previous_status,resulting_status,actor_type,actor_id,created_at)
VALUES ('event_queued_fixture','submission_fixture','queued_for_review','received','pending_review','system',NULL,'2026-02-01T01:02:04.000Z');
INSERT INTO visitor_submission_events (id,submission_id,event_type,previous_status,resulting_status,reason_code,actor_type,actor_id,created_at)
VALUES ('event_approved_fixture','submission_fixture','approved','pending_review','approved','useful_question','admin','owner','2026-02-02T01:02:03.000Z');
INSERT INTO visitor_submission_moderation_actions (id,submission_id,action_type,previous_status,resulting_status,reason_code,note_text,actor_id,created_at)
VALUES ('action_fixture','submission_fixture','approve','pending_review','approved','useful_question',NULL,'owner','2026-02-02T01:02:03.000Z');
INSERT INTO visitor_rate_limit_buckets (bucket_hash,window_started_at,request_count,expires_at,updated_at)
VALUES ('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee','2026-02-01T01:00:00.000Z',1,'2026-02-01T01:15:00.000Z','2026-02-01T01:02:03.000Z');
`

function fullSnapshot(fixture, includeContentHash = true) {
  const columns = {
    visitor_submissions: includeContentHash
      ? 'id,submission_type,language,content_text,content_hash,deduplication_hash,status,created_at,updated_at,expires_at'
      : 'id,submission_type,language,content_text,deduplication_hash,status,created_at,updated_at,expires_at',
    visitor_submission_events: 'id,submission_id,event_type,previous_status,resulting_status,reason_code,actor_type,actor_id,created_at',
    visitor_submission_moderation_actions: 'id,submission_id,action_type,previous_status,resulting_status,reason_code,note_text,actor_id,created_at',
    visitor_rate_limit_buckets: 'bucket_hash,window_started_at,request_count,expires_at,updated_at',
    source_records: 'id,source_key,source_type,title,trust_level,sync_mode,visibility,is_active,created_at,updated_at,created_by,updated_by',
    source_snapshots: 'id,source_id,version_label,content_hash,content_text,captured_at,created_at,created_by',
    knowledge_items: 'id,item_key,kind,category,title,visibility,sensitivity,lifecycle_status,created_at,created_by',
    knowledge_versions: 'id,item_id,version_no,content_text,status,created_by,created_at,approved_by,approved_at,content_hash',
    knowledge_provenance: 'id,knowledge_version_id,source_snapshot_id,evidence_type,created_at,created_by',
    publication_releases: 'id,release_no,status,title,release_notes,parent_release_id,rollback_of_release_id,knowledge_count,content_hash,created_at,created_by,validated_at,validated_by,published_at,published_by',
    publication_release_items: 'release_id,knowledge_item_id,knowledge_version_id,sort_order,added_at,added_by',
    publication_events: 'id,release_id,event_type,event_status,details_json,created_at,created_by',
  }
  const selects = Object.entries(columns).map(([table, list], index) => {
    const sort = list.split(',')[0]
    return `(SELECT COALESCE(json_group_array(json_object(${list.split(',').map((column) => `'${column}',${column}`).join(',')})), '[]') FROM (SELECT ${list} FROM ${table} ORDER BY ${sort})) AS t${index}`
  })
  selects.push(`(SELECT COALESCE(json_group_array(json_object('type',type,'name',name,'tbl_name',tbl_name,'sql',sql)), '[]') FROM (SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name GLOB 'source_*' OR name GLOB 'knowledge_*' OR name GLOB 'publication_*' ORDER BY type,name)) AS protected_schema`)
  selects.push(`(SELECT COUNT(*) FROM pragma_foreign_key_check) AS foreign_key_errors`)
  selects.push(`(SELECT COUNT(*) FROM pragma_table_info('visitor_submissions') WHERE name='content_hash') AS content_hash_column`)
  selects.push(`(SELECT COUNT(*) FROM sqlite_schema WHERE name='idx_visitor_submissions_hash_created') AS hash_index`)
  selects.push(`(SELECT value_text FROM system_settings WHERE setting_key='schema_version') AS schema_version`)
  selects.push(`(SELECT value_text FROM system_settings WHERE setting_key='active_release_id') AS active_release_id`)
  return query(fixture.config, fixture.state, `SELECT ${selects.join(',')}`)[0]
}

try {
  const empty = makeFixture('empty')
  applyThroughSix(empty)
  assert.equal(fullSnapshot(empty).t0, '[]')
  run(empty.config, empty.state, ['d1', 'migrations', 'apply', databaseName])
  const emptyAfter = fullSnapshot(empty, false)
  assert.equal(emptyAfter.content_hash_column, 0)
  assert.equal(emptyAfter.hash_index, 0)
  assert.equal(emptyAfter.foreign_key_errors, 0)
  console.log('Empty local fixture: passed')

  const populated = makeFixture('populated')
  applyThroughSix(populated)
  run(populated.config, populated.state, ['d1', 'execute', databaseName, '--command', populatedFixtureSql, '--yes'])
  const before = fullSnapshot(populated)

  run(populated.config, populated.state, ['d1', 'migrations', 'apply', databaseName])
  const after = fullSnapshot(populated, false)
  const read = (snapshot, index) => JSON.parse(snapshot[`t${index}`])
  assert.deepEqual(read(after, 0), read(before, 0).map(({ content_hash, ...row }) => row))
  for (let index = 1; index < 12; index += 1) assert.equal(after[`t${index}`], before[`t${index}`])
  assert.equal(after.protected_schema, before.protected_schema)
  assert.equal(after.foreign_key_errors, 0)
  assert.equal(after.content_hash_column, 0)
  assert.equal(after.hash_index, 0)
  assert.equal(after.schema_version, '4D.1')
  assert.equal(after.active_release_id, before.active_release_id)
  const dedupSql = query(populated.config, populated.state, "SELECT sql FROM sqlite_schema WHERE type='table' AND name='visitor_submissions'")[0].sql
  assert.match(dedupSql, /UNIQUE\s*\(deduplication_hash\)/u, 'deduplication uniqueness must remain enforced')
  console.log('Populated local fixture and protected-table comparison: passed')

  const failed = makeFixture('failure', true)
  applyThroughSix(failed)
  run(failed.config, failed.state, ['d1', 'execute', databaseName, '--command', populatedFixtureSql, '--yes'])
  const failedBefore = fullSnapshot(failed)
  const failedApply = run(failed.config, failed.state, ['d1', 'migrations', 'apply', databaseName], true)
  assert.equal(failedApply.ok, false, 'intentional post-DDL migration failure should fail')
  const failedAfter = fullSnapshot(failed)
  assert.deepEqual(failedAfter, failedBefore, 'failed migration must restore all populated fixture data and schema')
  assert.equal(failedAfter.content_hash_column, 1)
  assert.equal(failedAfter.hash_index, 1)
  assert.equal(failedAfter.foreign_key_errors, 0)
  assert.equal(query(failed.config, failed.state, 'SELECT COUNT(*) AS n FROM d1_migrations')[0].n, 6)
  console.log('Injected migration failure rollback: passed')

  console.log('Hash-removal migration rehearsal passed: empty/populated, preservation, deduplication, FK integrity, and failed-migration rollback on disposable local D1 fixtures.')
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
