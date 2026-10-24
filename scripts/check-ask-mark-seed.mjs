import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fail, migrate, query, root, worker } from './lib/ask-mark-d1.mjs'
import { importSeed } from './import-ask-mark-seed.mjs'

const runRoot=mkdtempSync(path.join(tmpdir(),'ask-mark-seed-check-'))
const state=path.join(runRoot,'d1')
const seedPath=path.join(worker,'seeds','approved-knowledge.v1.json')
const importer=path.join(root,'scripts','import-ask-mark-seed.mjs')
const seed=JSON.parse(readFileSync(seedPath,'utf8'))
process.env.WRANGLER_WRITE_LOGS='false'
try {
  migrate(state)
  importSeed({state,seed:seedPath,scratch:path.join(state,'seed-import-scratch')})
  const row=query(state,`SELECT
    (SELECT COUNT(*) FROM source_records) source_count,
    (SELECT COUNT(*) FROM source_snapshots) snapshot_count,
    (SELECT COUNT(*) FROM knowledge_items) knowledge_count,
    (SELECT COUNT(*) FROM knowledge_versions WHERE status='approved') approved_count,
    (SELECT COUNT(*) FROM knowledge_provenance) provenance_count,
    (SELECT COUNT(*) FROM knowledge_match_terms WHERE is_active=1) matcher_count,
    (SELECT COUNT(*) FROM publication_releases WHERE status='published') release_count,
    (SELECT COUNT(*) FROM publication_release_items) release_item_count,
    (SELECT COUNT(*) FROM v_active_knowledge) active_count,
    (SELECT COUNT(*) FROM v_active_knowledge WHERE visibility<>'public' OR sensitivity<>'normal') unsafe_count;`)
  const n=seed.knowledge.length, s=seed.sources.length
  const exact={source_count:s,snapshot_count:s,knowledge_count:n,approved_count:n,
    release_count:1,release_item_count:n,active_count:n,unsafe_count:0}
  for (const [key,value] of Object.entries(exact))
    if (Number(row?.[key])!==value) fail(`Expected ${key}=${value}, found ${row?.[key]}.`)
  if (Number(row.provenance_count)<n || Number(row.matcher_count)<n)
    fail('Every item must have provenance and matcher terms.')
  const repeat=spawnSync(process.execPath,[importer,'--persist-to',state,'--seed',seedPath,'--scratch-dir',path.join(state,'repeat-import-scratch')],
    {cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,CI:'1',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'}})
  if (repeat.status===0 || !/already contains knowledge/i.test(`${repeat.stdout}\n${repeat.stderr}`))
    fail('Repeat-import safety guard failed.')
  console.log(`Ask Mark seed checks passed: ${n} active items, ${s} sources, ${row.provenance_count} provenance links, ${row.matcher_count} matcher terms, release 1.`)
} finally {
  // This D1 state and importer scratch space belong only to this invocation.
  rmSync(runRoot,{recursive:true,force:true})
}
