import { rmSync } from 'node:fs'
import path from 'node:path'
import { migrate, worker } from './lib/ask-mark-d1.mjs'
import { importSeed } from './import-ask-mark-seed.mjs'

const state=path.join(worker,'.wrangler','state')
rmSync(state,{recursive:true,force:true})
migrate(state)
const { seed }=importSeed({state})
console.log(`Ask Mark local D1 reset complete: ${seed.knowledge.length} active items in ${seed.release.id}.`)
