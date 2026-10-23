import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { featuredProjects } from '../src/data/projects.js'
import { clientStudioScope, markverseProjectStatus } from '../src/data/markverseContent.js'

const project = featuredProjects.find(({ slug }) => slug === 'childcare-culture')
assert.ok(project, 'CCC&C must have exactly one portfolio project record.')
assert.equal(featuredProjects.filter(({ slug }) => slug === 'childcare-culture').length, 1)
assert.equal(project.role, 'GoHighLevel & Systems Specialist · Independent Contractor')
assert.equal(project.detailUrl, '#client-studio', 'The project card should link to the detailed public-safe summary.')
assert.equal(markverseProjectStatus['childcare-culture'].district, 'Client Studio')
assert.ok(clientStudioScope.workstreams.some(({ title }) => title === 'Foundation First'))
assert.ok(clientStudioScope.workstreams.some(({ title }) => title === 'Culture Club'))
assert.ok(clientStudioScope.workstreams.some(({ title }) => title === 'Founding Cohort'))
assert.ok(clientStudioScope.workstreams.some(({ title }) => title === '90-Day Experience'))
assert.ok(clientStudioScope.workstreams.some(({ title }) => title === 'Summit & sponsorship'))
assert.match(clientStudioScope.workstreams.find(({ title }) => title === 'Culture Club').detail, /not verified/u)
assert.match(clientStudioScope.workstreams.find(({ title }) => title === 'Foundation First').detail, /Draft/u)
assert.match(clientStudioScope.workstreams.find(({ title }) => title === 'Summit & sponsorship').detail, /not described as completed/u)

const component = await readFile(new URL('../src/components/markverse/ClientStudioSection.jsx', import.meta.url), 'utf8')
const card = await readFile(new URL('../src/components/ProjectCard.jsx', import.meta.url), 'utf8')
const diagram = await readFile(new URL('../public/images/projects/ccc-digital-operations-map.svg', import.meta.url), 'utf8')
assert.match(component, /<details className="client-studio-details">/u)
assert.match(component, /Sanitized workflow overview/u)
assert.match(component, /separateDemo/u, 'Luma Home Care remains a separate portfolio demo.')
assert.match(card, /target\.scrollIntoView\(/u, 'The CCC&C card link should scroll visitors to the full work summary.')
assert.match(diagram, /no client records|no client data/iu)
assert.doesNotMatch(component, /<video|internal dashboard screenshot/iu)

const seed = JSON.parse(await readFile(new URL('../docs/markverse/markverse-content.seed.json', import.meta.url), 'utf8'))
assert.equal(seed.projects.filter(({ slug }) => slug === 'childcare-culture').length, 1)

console.log('CCC&C Client Studio checks passed: official role, unique project record, expandable workstream summary, cautious status labels, separate Luma demo, and sanitized workflow illustration.')
