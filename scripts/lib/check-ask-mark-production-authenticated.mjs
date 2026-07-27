import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function records(value) {
  return Array.isArray(value) ? value.flat(Infinity) : [value]
}

function firstRow(parsed, label) {
  for (const record of records(parsed)) {
    if (Array.isArray(record?.results) && record.results.length > 0) {
      return record.results[0]
    }
  }

  throw new Error(label + " returned no result row.")
}

function queryRecords(parsed, label) {
  const output = records(parsed)

  assert(
    output.length === 1,
    label + " returned an unexpected result count.",
  )

  const result = output[0]

  assert(result?.success === true, label + " did not report success.")
  assert(
    Number(result?.meta?.rows_written) === 0,
    label + " wrote rows.",
  )
  assert(
    result?.meta?.changed_db === false,
    label + " changed the database.",
  )
  assert(
    Number(result?.meta?.changes) === 0,
    label + " reported changes.",
  )

  return result
}

function normalizedSql(sql) {
  return sql.replace(/\s+/g, " ").trim()
}

function validateReadOnlySql(sql) {
  const normalized = normalizedSql(sql)
  const upper = normalized.toUpperCase()
  const approvedPragmas = new Set([
    "PRAGMA FOREIGN_KEY_CHECK",
    "PRAGMA QUICK_CHECK",
  ])

  assert(
    !normalized.includes(";"),
    "SQL must contain exactly one statement.",
  )
  assert(
    !/--|\/\*|\*\//.test(normalized),
    "SQL comments are not allowed.",
  )

  if (approvedPragmas.has(upper)) return normalized

  assert(
    /^SELECT\b/i.test(normalized),
    "Only SELECT or approved PRAGMA is allowed.",
  )

  const forbidden = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "REPLACE",
    "CREATE",
    "ALTER",
    "DROP",
    "ATTACH",
    "DETACH",
    "VACUUM",
    "REINDEX",
    "TRIGGER",
    "TRANSACTION",
    "SAVEPOINT",
  ]

  for (const keyword of forbidden) {
    assert(
      !new RegExp("\\b" + keyword + "\\b", "i").test(normalized),
      "Forbidden SQL keyword: " + keyword,
    )
  }

  return normalized
}

function runWranglerJson(
  { root, wranglerCli },
  argumentsList,
  label,
) {
  assert(existsSync(wranglerCli), "Wrangler is not installed.")

  const result = spawnSync(
    process.execPath,
    [wranglerCli, ...argumentsList],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        CI: "1",
        WRANGLER_SEND_METRICS: "false",
      },
    },
  )

  if (result.error) {
    throw new Error(
      label + " could not start: " + result.error.message,
    )
  }

  if (result.status !== 0) {
    const details = (result.stdout + "\n" + result.stderr).trim()
    throw new Error(label + " failed. " + details)
  }

  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error(
      label + " returned invalid JSON: " +
        result.stdout.slice(0, 300),
    )
  }
}

function runD1(context, sql, label) {
  const command = validateReadOnlySql(sql)
  const parsed = runWranglerJson(
    context,
    [
      "d1",
      "execute",
      context.baseline.d1.databaseName,
      "--remote",
      "--config",
      context.productionConfig,
      "--command",
      command,
      "--json",
    ],
    label,
  )

  return queryRecords(parsed, label)
}

function checkWorker(context) {
  const deployments = records(
    runWranglerJson(
      context,
      [
        "deployments",
        "list",
        "--name",
        context.baseline.worker.name,
        "--config",
        context.productionConfig,
        "--json",
      ],
      "Worker deployment listing",
    ),
  )
  const deployment = deployments[0]

  assert(
    deployment?.id === context.baseline.worker.deploymentId,
    "Unexpected active Worker deployment.",
  )
  assert(
    deployment?.strategy === "percentage",
    "Unexpected Worker deployment strategy.",
  )
  assert(
    Array.isArray(deployment?.versions),
    "Worker deployment versions are missing.",
  )
  assert(
    deployment.versions.length === 1,
    "Expected one active Worker version.",
  )
  assert(
    deployment.versions[0].version_id ===
      context.baseline.worker.versionId,
    "Unexpected deployed Worker version.",
  )
  assert(
    Number(deployment.versions[0].percentage) === 100,
    "Worker version allocation is not 100 percent.",
  )

  const versions = records(
    runWranglerJson(
      context,
      [
        "versions",
        "list",
        "--name",
        context.baseline.worker.name,
        "--config",
        context.productionConfig,
        "--json",
      ],
      "Worker version listing",
    ),
  )

  assert(
    versions[0]?.id === context.baseline.worker.versionId,
    "Unexpected latest Worker version.",
  )

  console.log(
    "PASS authenticated Worker deployment and version metadata",
  )
}

function checkD1Info(context) {
  const info = runWranglerJson(
    context,
    [
      "d1",
      "info",
      context.baseline.d1.databaseName,
      "--config",
      context.productionConfig,
      "--json",
    ],
    "D1 information",
  )

  assert(
    info?.uuid === context.baseline.d1.databaseId,
    "Unexpected D1 UUID.",
  )
  assert(
    info?.name === context.baseline.d1.databaseName,
    "Unexpected D1 name.",
  )
  assert(
    Number(info?.num_tables) ===
      context.baseline.d1.applicationTables.length + 1,
    "Unexpected D1 table count.",
  )

  console.log("PASS authenticated D1 identity metadata")
}

function checkSchema(context) {
  for (const table of context.baseline.d1.applicationTables) {
    assert(
      /^[a-z0-9_]+$/.test(table),
      "Unsafe baseline table name: " + table,
    )
  }

  const quotedTables = context.baseline.d1.applicationTables
    .map((table) => "'" + table + "'")
    .join(", ")

  const query = `
    SELECT
      (SELECT COUNT(*) FROM sqlite_schema
        WHERE type='table' AND name IN (${quotedTables}))
        AS app_table_count,
      (SELECT COUNT(*) FROM sqlite_schema
        WHERE type='view' AND name='v_active_knowledge')
        AS active_view_count,
      (SELECT COUNT(*) FROM d1_migrations)
        AS migration_count,
      (SELECT value_text FROM system_settings
        WHERE setting_key='schema_version')
        AS schema_version
  `

  const result = runD1(context, query, "D1 schema parity")
  const row = firstRow([result], "D1 schema parity")

  assert(
    Number(row.app_table_count) ===
      context.baseline.d1.applicationTables.length,
    "Application table count drifted.",
  )
  assert(
    Number(row.active_view_count) ===
      context.baseline.d1.views.length,
    "Active view count drifted.",
  )
  assert(
    Number(row.migration_count) ===
      context.baseline.d1.migrationCount,
    "Migration count drifted.",
  )
  assert(
    row.schema_version === context.baseline.d1.schemaVersion,
    "Schema version drifted.",
  )

  console.log("PASS production D1 schema and migration parity")
}

function checkReleaseAndCounts(context) {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM source_records)
        AS source_count,
      (SELECT COUNT(*) FROM source_snapshots)
        AS snapshot_count,
      (SELECT COUNT(*) FROM knowledge_items)
        AS knowledge_count,
      (SELECT COUNT(*) FROM knowledge_versions
        WHERE status='approved')
        AS approved_count,
      (SELECT COUNT(*) FROM knowledge_provenance)
        AS provenance_count,
      (SELECT COUNT(*) FROM knowledge_match_terms
        WHERE is_active=1)
        AS matcher_count,
      (SELECT COUNT(*) FROM publication_releases
        WHERE status='published')
        AS release_count,
      (SELECT COUNT(*) FROM publication_release_items
        WHERE release_id=(
          SELECT value_text FROM system_settings
          WHERE setting_key='active_release_id'
        )) AS release_item_count,
      (SELECT COUNT(*) FROM v_active_knowledge)
        AS active_count,
      (SELECT COUNT(*) FROM v_active_knowledge
        WHERE visibility<>'public'
          OR sensitivity<>'normal')
        AS unsafe_count,
      (SELECT value_text FROM system_settings
        WHERE setting_key='active_release_id')
        AS active_release_id,
      (SELECT value_text FROM system_settings
        WHERE setting_key='approved_seed_version')
        AS seed_version,
      (SELECT release_no FROM publication_releases
        WHERE id=(
          SELECT value_text FROM system_settings
          WHERE setting_key='active_release_id'
        )) AS release_no,
      (SELECT knowledge_count FROM publication_releases
        WHERE id=(
          SELECT value_text FROM system_settings
          WHERE setting_key='active_release_id'
        )) AS release_knowledge_count
  `

  const result = runD1(
    context,
    query,
    "D1 release and count parity",
  )
  const row = firstRow(
    [result],
    "D1 release and count parity",
  )
  const expected = context.baseline.d1.counts
  const countPairs = {
    source_count: expected.sources,
    snapshot_count: expected.snapshots,
    knowledge_count: expected.knowledge,
    approved_count: expected.approved,
    provenance_count: expected.provenance,
    matcher_count: expected.matcherTerms,
    release_count: expected.publishedReleases,
    release_item_count: expected.releaseItems,
    active_count: expected.active,
    unsafe_count: expected.unsafe,
  }

  for (const [key, value] of Object.entries(countPairs)) {
    assert(
      Number(row[key]) === Number(value),
      key + " drifted.",
    )
  }

  assert(
    row.active_release_id ===
      context.baseline.d1.activeReleaseId,
    "Active release drifted.",
  )
  assert(
    row.seed_version === context.baseline.d1.seedVersion,
    "Approved seed version drifted.",
  )
  assert(
    Number(row.release_no) ===
      context.baseline.worker.release.number,
    "Release number drifted.",
  )
  assert(
    Number(row.release_knowledge_count) ===
      context.baseline.worker.release.knowledgeCount,
    "Release knowledge count drifted.",
  )

  console.log(
    "PASS production D1 release, provenance, matcher, " +
      "and count parity",
  )
}

function checkIntegrity(context) {
  const foreignKeys = runD1(
    context,
    "PRAGMA foreign_key_check",
    "D1 foreign-key check",
  )

  assert(
    Array.isArray(foreignKeys.results),
    "Foreign-key results are missing.",
  )
  assert(
    foreignKeys.results.length === 0,
    "D1 foreign-key violations were found.",
  )

  const quick = runD1(
    context,
    "PRAGMA quick_check",
    "D1 quick check",
  )

  assert(
    Array.isArray(quick.results) &&
      quick.results.length === 1,
    "D1 quick check returned an unexpected result.",
  )
  assert(
    Object.values(quick.results[0])[0] === "ok",
    "D1 quick check did not return ok.",
  )

  console.log(
    "PASS production D1 foreign-key and quick integrity checks",
  )
}

export function checkAuthenticatedProduction({ baseline, root }) {
  const context = {
    baseline,
    root,
    productionConfig: path.join(
      root,
      "workers",
      "ask-mark",
      "wrangler.production.jsonc",
    ),
    wranglerCli: path.join(
      root,
      "node_modules",
      "wrangler",
      "bin",
      "wrangler.js",
    ),
  }

  checkWorker(context)
  checkD1Info(context)
  checkSchema(context)
  checkReleaseAndCounts(context)
  checkIntegrity(context)
}
