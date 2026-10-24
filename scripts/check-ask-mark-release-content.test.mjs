import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
function listFiles(directory, relative = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name)
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), next) : [next]
  })
}
function artifactText(files) {
  return files.filter((file) => /\.(?:html|js|json|xml|svg|css)$/i.test(file))
    .map((file) => readFileSync(path.join(dist, file), 'utf8')).join('\n')
}

test('production artifact excludes held Short-Form Video assets and public references', () => {
  const files = listFiles(dist)
  const paths = files.filter((file) => /short-form-video|brand-storytelling-reel|mission-driven-reel|sponsor-promotional-reel/i.test(file))
  const text = artifactText(files)
  const namedReferences = /Short-Form Video Editing|\/projects\/short-form-video|\/videos\/short-form-video|brand-storytelling-reel|mission-driven-reel|sponsor-promotional-reel/i.test(text)
  assert.equal(paths.length, 0, 'held campaign asset paths remain in the production artifact')
  assert.equal(namedReferences, false, 'a held campaign reference remains in production text')
})

test('production artifact omits unapproved phone numbers while preserving email contact', () => {
  const html = listFiles(dist).filter((file) => file.endsWith('.html'))
    .map((file) => readFileSync(path.join(dist, file), 'utf8')).join('\n')
  const phone = /(?:\+?63[\s().-]*9\d{2}[\s().-]*\d{3}[\s.-]*\d{4}|\b09\d{2}[\s().-]*\d{3}[\s.-]*\d{4}\b)/
  assert.equal(phone.test(html) || /\btel:/i.test(html) || /"telephone"\s*:/i.test(html), false, 'a public phone number or telephone field remains')
  assert.equal(/\bmailto:markantonbadong@gmail\.com/i.test(html), true, 'approved primary email route is missing')
})

test('production artifact retains only the owner-approved CCC&C website scope', () => {
  const text = artifactText(listFiles(dist))
  for (const value of ['Childcare Culture & Co.', 'childcarecultureco.com', 'six-page', 'GoHighLevel', 'custom HTML/CSS']) {
    assert.equal(text.includes(value), true, `approved content missing: ${value}`)
  }
  assert.equal(/Foundation First|Culture Club|Founding Cohort|90-Day Experience|Summit & sponsorship/i.test(text), false, 'unapproved CCC&C identifiers appeared in the artifact')
})
