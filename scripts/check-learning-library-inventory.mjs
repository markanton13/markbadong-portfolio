import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { featuredProjects } from '../src/data/projects.js'
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')
const project = featuredProjects.find((item) => item.slug === 'learning-library')
assert.ok(project, 'Learning Library must remain in the shared portfolio inventory.')
assert.match(project.summary, /11 QA-passed public guides: 10 free during the pilot and one premium-pilot guide/u)
assert.match(project.metric, /11 public.*10 free.*1 premium pilot/u)
const [caseStudy, assistant, illustration, askSource, workerSeed] = await Promise.all([
  read('../src/pages/LearningLibraryCaseStudy.jsx'),
  read('../src/components/assistant/assistantKnowledge.js'),
  read('../public/images/projects/learning-library/library-overview.svg'),
  read('../src/data/askMarkPublicKnowledge.json').then(JSON.parse),
  read('../workers/ask-mark/seeds/approved-knowledge.v1.json').then(JSON.parse),
])
for (const [label, text] of [['case study', caseStudy], ['Ask Mark fallback', assistant]]) {
  assert.match(text, /11 QA-passed public guides/u, `${label} must state the verified public catalog count.`)
  assert.match(text, /(?:10|ten)(?: are)? free during the pilot/u, `${label} must distinguish free pilot access.`)
  assert.match(text, /premium-pilot guide/u, `${label} must distinguish the premium-pilot guide.`)
  assert.doesNotMatch(text, /ten interactive guides|nine remain public|The live catalog currently contains ten guides/u, `${label} contains a stale inventory count.`)
}
assert.match(illustration, /11 public guides · 10 free in pilot · 1 premium pilot/u)
assert.doesNotMatch(illustration, /10 interactive guides|Verified purchase|Access \+ revenue/u)
assert.match(askSource.learningLibraryRecord.content, /11 QA-passed public guides: 10 are free during the pilot and one is a premium-pilot guide/u)
assert.match(askSource.learningLibraryRecord.content, /does not claim live commercial payment activation, conversions, or revenue/u)
const workerRecord = workerSeed.knowledge.find((item) => item.key === 'project.learning_library')
assert.equal(workerRecord?.content, askSource.learningLibraryRecord.content)
assert.deepEqual(workerRecord?.payload, askSource.learningLibraryRecord.payload)
console.log('Learning Library inventory checks passed: 11 public, 10 free in pilot, one premium-pilot guide; test-mode payment claims remain bounded.')
