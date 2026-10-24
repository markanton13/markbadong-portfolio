import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { featuredProjects } from '../src/data/projects.js'
import { markverseProjectStatus } from '../src/data/markverseContent.js'

const bySlug = new Map(featuredProjects.map((project) => [project.slug, project]))
assert.equal(bySlug.size, featuredProjects.length, 'Project slugs must be unique.')
for (const project of featuredProjects) assert.ok(markverseProjectStatus[project.slug], `${project.slug} needs a MARKVERSE status mapping.`)
const expected = [
  ['ask-mark', 'Ask Mark', null, true],
  ['tambayan-royale', 'Tambayan Royale Arcade', 'https://arcade.markbadong.com', false],
  ['tambayan-royale-play', 'Tambayan Royale Play', 'https://play.markbadong.com', false],
  ['ledger', 'Ledger', 'https://ledger.markbadong.com', false],
]
for (const [slug, name, url, assistantAction] of expected) {
  const project = bySlug.get(slug)
  assert.ok(project, `${slug} must exist in the shared project inventory.`)
  assert.equal(project.name, name, `${slug} public title must remain consistent.`)
  if (url) assert.equal(project.externalUrl, url, `${slug} external URL must match the reviewed destination.`)
  assert.equal(Boolean(project.assistantAction), assistantAction, `${slug} must expose only its intended action.`)
  assert.equal(project.caseStudyUrl, undefined, `${slug} must not imply a case study route without one.`)
}
assert.equal(bySlug.get('ask-mark').featured, true, 'Ask Mark must remain a featured flagship project.')
assert.match(bySlug.get('ask-mark').status, /Live portfolio feature/u)
assert.match(bySlug.get('tambayan-royale').status, /Staging/u)
assert.match(bySlug.get('tambayan-royale-play').status, /preview/u)
assert.match(bySlug.get('ledger').status, /Early real-world use/u)
assert.match(bySlug.get('ledger').summary, /one friend/u)
assert.doesNotMatch(bySlug.get('ledger').summary, /commercial-scale|revenue|satisfaction score/iu)
const ccc = bySlug.get('childcare-culture')
assert.equal(ccc.externalUrl, 'https://childcarecultureco.com/')
assert.equal(ccc.caseStudyUrl, undefined)

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const card = await readFile(new URL('../src/components/ProjectCard.jsx', import.meta.url), 'utf8')
const assistant = await readFile(new URL('../src/components/assistant/AskMarkAssistant.jsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/styles/markverse.css', import.meta.url), 'utf8')
assert.match(app, /featuredProjects\.map\(\(project, index\) => <ProjectCard/u)
assert.match(card, /requestAskMarkOpen\(event\.currentTarget\)/u)
assert.match(assistant, /ask-mark:open/u)
assert.match(styles, /\.markverse-project-grid\s*\{\s*grid-template-columns:repeat\(3,/u)
assert.match(styles, /@media\s*\(max-width:1080px\)[\s\S]*?\.markverse-project-grid\s*\{\s*grid-template-columns:repeat\(2,/u)
assert.match(styles, /@media\s*\(max-width:600px\)[\s\S]*?\.markverse-project-grid\s*\{\s*grid-template-columns:1fr/u)
console.log(`MARKVERSE project inventory checks passed: ${featuredProjects.length} unique application records, approved project status mappings, Ask Mark flagship action, and responsive project grid.`)
