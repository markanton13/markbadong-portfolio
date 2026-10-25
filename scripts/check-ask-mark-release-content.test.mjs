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

test('production artifact includes the approved Short-Form Video project and its portfolio media', () => {
  const files = listFiles(dist)
  const normalizedPaths = files.map((file) => file.replace(/\\/g, '/'))
  const requiredPaths = [
    'projects/short-form-video.html',
    'images/projects/short-form-video/brand-storytelling-reel.webp',
    'images/projects/short-form-video/mission-driven-reel.webp',
    'images/projects/short-form-video/short-form-video-overview.webp',
    'images/projects/short-form-video/sponsor-promotional-reel.webp',
    'images/seo/short-form-video-og.png',
    'videos/short-form-video/brand-storytelling-reel.mp4',
    'videos/short-form-video/mission-driven-reel.mp4',
    'videos/short-form-video/sponsor-promotional-reel.mp4',
  ]
  for (const requiredPath of requiredPaths) {
    assert.equal(normalizedPaths.includes(requiredPath), true, `approved project asset missing: ${requiredPath}`)
  }
  const text = artifactText(files)
  assert.match(text, /Short-Form Video Editing/)
  assert.match(text, /\/projects\/short-form-video/)
  assert.match(text, /Approved deliverables/)
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
