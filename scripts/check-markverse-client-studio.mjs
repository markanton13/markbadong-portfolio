import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { featuredProjects } from '../src/data/projects.js'
import { clientStudioScope, markverseProjectStatus } from '../src/data/markverseContent.js'

const project = featuredProjects.find(({ slug }) => slug === 'childcare-culture')
assert.ok(project, 'CCC&C must have one approved project record.')
assert.equal(featuredProjects.filter(({ slug }) => slug === 'childcare-culture').length, 1)
assert.equal(project.externalUrl, 'https://childcarecultureco.com/')
assert.match(project.summary, /six-page responsive website.*GoHighLevel.*custom HTML\/CSS/u)
assert.equal(markverseProjectStatus['childcare-culture'].status, 'Owner-approved high-level website project')
assert.equal(clientStudioScope.website, 'https://childcarecultureco.com/')
assert.match(clientStudioScope.summary, /responsive design, user experience, and quality assurance/u)
assert.equal('workstreams' in clientStudioScope, false)

const component = await readFile(new URL('../src/components/markverse/ClientStudioSection.jsx', import.meta.url), 'utf8')
const ledger = await readFile(new URL('../workers/ask-mark/PHASE-5E-OWNER-APPROVAL-LEDGER.md', import.meta.url), 'utf8')
assert.match(component, /childcarecultureco\.com/u)
assert.doesNotMatch(component, /Foundation First|Culture Club|Founding Cohort|90-Day Experience|Summit|workflow map|program operations/iu)
assert.match(ledger, /Written client permission evidence is \*\*unverified\*\*/u)
assert.match(ledger, /receives no new record/u)

console.log('CCC&C approval-scope checks passed: owner-approved website summary and link only; written client permission evidence remains unverified.')
