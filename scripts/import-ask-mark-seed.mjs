import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { database, fail, localArgs, query, root, run, worker } from './lib/ask-mark-d1.mjs'

const defaultSeed = path.join(worker,'seeds','approved-knowledge.v1.json')
const kinds = new Set(['fact','experience','project','skill','credential','education',
  'working_style','role_classification','privacy_boundary','unsupported_boundary',
  'faq','action','contact','testimonial'])
const q = (v) => v == null ? 'NULL' : typeof v === 'number' ? String(v)
  : `'${String(v).replaceAll("'","''")}'`
const hash = (v) => createHash('sha256').update(
  typeof v === 'string' ? v : JSON.stringify(v)).digest('hex')
const norm = (v) => v.normalize('NFKC').toLowerCase()
  .replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim()
const unique = (values,label) => {
  const duplicate = values.find((v,i) => values.indexOf(v) !== i)
  if (duplicate) fail(`Duplicate ${label}: ${duplicate}`)
}

function args(list) {
  const out = { state:path.join(worker,'.wrangler','state'), seed:defaultSeed }
  for (let i=0;i<list.length;i+=1) {
    if (list[i] === '--persist-to') out.state = path.resolve(root,list[++i] || '')
    else if (list[i] === '--seed') out.seed = path.resolve(root,list[++i] || '')
    else fail(`Unknown argument: ${list[i]}`)
  }
  return out
}

function validate(seed) {
  if (!seed.seedVersion || !seed.approvedAt || !seed.approvedBy) fail('Seed approval metadata is required.')
  if (!seed.sources?.length || !seed.knowledge?.length) fail('Seed sources and knowledge are required.')
  unique(seed.sources.map(x=>x.id),'source ID')
  unique(seed.sources.map(x=>x.key),'source key')
  unique(seed.sources.map(x=>x.snapshot.id),'snapshot ID')
  unique(seed.knowledge.map(x=>x.id),'knowledge ID')
  unique(seed.knowledge.map(x=>x.key),'knowledge key')
  const snapshots = new Set(seed.sources.map(x=>x.snapshot.id))
  for (const item of seed.knowledge) {
    if (!kinds.has(item.kind)) fail(`Unsupported kind: ${item.kind}`)
    if (!item.content?.trim() || !item.sources?.length || !item.terms?.length)
      fail(`Incomplete knowledge item: ${item.id}`)
    item.sources.forEach(id=>{ if (!snapshots.has(id)) fail(`Unknown snapshot ${id}`) })
    unique(item.terms.map(norm),`term for ${item.id}`)
  }
  const raw = JSON.stringify(seed)
  if (/\b09\d{9}\b/.test(raw)) fail('Seed must not contain a mobile number.')
  if (/markantonbadong@gmail\.com/i.test(raw)) fail('Seed contains retired alternate email.')
  return seed
}

function build(seed) {
  const at=seed.approvedAt, actor=seed.approvedBy, r=seed.release, s=['PRAGMA foreign_keys=ON;']
  for (const src of seed.sources) {
    s.push(`INSERT INTO source_records (id,source_key,source_type,title,canonical_location,trust_level,sync_mode,visibility,is_active,created_at,updated_at,created_by,updated_by)
VALUES (${q(src.id)},${q(src.key)},${q(src.type)},${q(src.title)},${q(src.location)},100,'import','internal',1,${q(at)},${q(at)},${q(actor)},${q(actor)});`)
    s.push(`INSERT INTO source_snapshots (id,source_id,version_label,content_hash,content_text,metadata_json,captured_at,created_at,created_by)
VALUES (${q(src.snapshot.id)},${q(src.id)},${q(src.snapshot.version)},${q(hash(src.snapshot.content))},${q(src.snapshot.content)},'{}',${q(at)},${q(at)},${q(actor)});`)
  }
  const releaseHash = hash(seed.knowledge.map(x=>[x.key,x.content,x.payload]))
  s.push(`INSERT INTO publication_releases (id,release_no,status,title,release_notes,knowledge_count,content_hash,created_at,created_by,validated_at,validated_by,published_at,published_by)
VALUES (${q(r.id)},${r.releaseNo},'published',${q(r.title)},'Batch 2B canonical seed',${seed.knowledge.length},${q(releaseHash)},${q(at)},${q(actor)},${q(at)},${q(actor)},${q(at)},${q(actor)});`)
  seed.knowledge.forEach((item,index)=>{
    const vid=`${item.id}_v1`
    s.push(`INSERT INTO knowledge_items (id,item_key,kind,category,title,visibility,sensitivity,lifecycle_status,created_at,created_by)
VALUES (${q(item.id)},${q(item.key)},${q(item.kind)},${q(item.category)},${q(item.title)},'public','normal','active',${q(at)},${q(actor)});`)
    s.push(`INSERT INTO knowledge_versions (id,item_id,version_no,content_text,payload_json,answer_template,language,status,change_reason,created_by,created_at,approved_by,approved_at,content_hash)
VALUES (${q(vid)},${q(item.id)},1,${q(item.content)},${q(JSON.stringify(item.payload || {}))},${q(item.content)},'en','approved','Initial canonical approved seed',${q(actor)},${q(at)},${q(actor)},${q(at)},${q(hash([item.content,item.payload]))});`)
    item.sources.forEach((sid,i)=>s.push(`INSERT INTO knowledge_provenance (id,knowledge_version_id,source_snapshot_id,evidence_type,evidence_note,created_at,created_by)
VALUES (${q(`prov_${item.id}_${i+1}`)},${q(vid)},${q(sid)},'supports','Canonical Batch 2B source',${q(at)},${q(actor)});`))
    item.terms.forEach((term,i)=>s.push(`INSERT INTO knowledge_match_terms (id,knowledge_item_id,term,normalized_term,match_mode,weight,is_negative,is_active,created_at,created_by)
VALUES (${q(`term_${item.id}_${i+1}`)},${q(item.id)},${q(term)},${q(norm(term))},'phrase',${500-i*10},0,1,${q(at)},${q(actor)});`))
    s.push(`INSERT INTO review_decisions (id,entity_type,entity_id,decision,review_reason,previous_state,resulting_state,decided_at,decided_by)
VALUES (${q(`review_${vid}`)},'knowledge_version',${q(vid)},'approve','Reviewed canonical seed','draft','approved',${q(at)},${q(actor)});`)
    s.push(`INSERT INTO publication_release_items (release_id,knowledge_item_id,knowledge_version_id,sort_order,added_at,added_by)
VALUES (${q(r.id)},${q(item.id)},${q(vid)},${index+1},${q(at)},${q(actor)});`)
  })
  s.push(`INSERT INTO publication_events (id,release_id,event_type,event_status,details_json,created_at,created_by)
VALUES ('pub_seed_1',${q(r.id)},'published','success',${q(JSON.stringify({seedVersion:seed.seedVersion}))},${q(at)},${q(actor)});`)
  s.push(`INSERT INTO audit_events (id,actor_type,actor_id,action,entity_type,entity_id,after_json,metadata_json,created_at)
VALUES ('audit_seed_1','system',${q(actor)},'seed_and_publish','publication_release',${q(r.id)},${q(JSON.stringify({status:'published'}))},${q(JSON.stringify({seedVersion:seed.seedVersion,releaseHash}))},${q(at)});`)
  for (const [key,value] of [['active_release_id',r.id],['approved_seed_version',seed.seedVersion]])
    s.push(`INSERT INTO system_settings (setting_key,value_text,value_json,updated_at,updated_by)
VALUES (${q(key)},${q(value)},NULL,${q(at)},${q(actor)})
ON CONFLICT(setting_key) DO UPDATE SET value_text=excluded.value_text,value_json=NULL,updated_at=excluded.updated_at,updated_by=excluded.updated_by;`)
  return s.join('\n\n')+'\n'
}

export function importSeed(options={}) {
  const state=path.resolve(options.state || path.join(worker,'.wrangler','state'))
  const seedPath=path.resolve(options.seed || defaultSeed)
  if (!existsSync(seedPath)) fail(`Seed not found: ${seedPath}`)
  const seed=validate(JSON.parse(readFileSync(seedPath,'utf8')))
  const counts=query(state,`SELECT (SELECT COUNT(*) FROM source_records) source_count,
    (SELECT COUNT(*) FROM knowledge_items) knowledge_count,
    (SELECT COUNT(*) FROM publication_releases) release_count;`)
  if (!counts || Number(counts.source_count)+Number(counts.knowledge_count)+Number(counts.release_count) !== 0)
    fail('The target local D1 database already contains knowledge. Use npm run askmark:d1:reset:local.')
  const temp=path.join(worker,'.wrangler','seed-import'), file=path.join(temp,'seed.sql')
  rmSync(temp,{recursive:true,force:true}); mkdirSync(temp,{recursive:true}); writeFileSync(file,build(seed))
  let ok=false
  try {
    run(['d1','execute',...localArgs(state),'--file',file,'--yes'])
    const row=query(state,`SELECT (SELECT COUNT(*) FROM source_records) source_count,
      (SELECT COUNT(*) FROM knowledge_items) knowledge_count,
      (SELECT COUNT(*) FROM v_active_knowledge) active_count,
      (SELECT value_text FROM system_settings WHERE setting_key='active_release_id') active_release_id,
      (SELECT value_text FROM system_settings WHERE setting_key='approved_seed_version') seed_version;`)
    if (!row || Number(row.source_count)!==seed.sources.length ||
        Number(row.knowledge_count)!==seed.knowledge.length ||
        Number(row.active_count)!==seed.knowledge.length ||
        row.active_release_id!==seed.release.id || row.seed_version!==seed.seedVersion)
      fail('Seed import validation failed.')
    ok=true
    console.log(`Ask Mark approved seed imported: ${seed.knowledge.length} knowledge items, ${seed.sources.length} sources, release ${seed.release.releaseNo}.`)
    return {seed, state}
  } finally {
    if (ok) rmSync(temp,{recursive:true,force:true})
    else console.error(`Generated SQL retained at ${file}`)
  }
}

const invoked=process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url===invoked) importSeed(args(process.argv.slice(2)))
