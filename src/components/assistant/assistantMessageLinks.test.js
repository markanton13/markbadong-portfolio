import assert from 'node:assert/strict'
import test from 'node:test'
import { getAssistantMessageLinks } from './assistantMessageLinks.js'
import { getMockResponse } from './assistantMockData.js'

test('multi-project response keeps unique shared actions and named project links', () => {
  const response = getMockResponse('Compare MarkHQ and ApplyLang.', '/')
  const { sources, actions } = getAssistantMessageLinks(response.sources, response.actions)

  assert.equal(actions.filter((item) => item.type === 'contact').length, 1)
  assert.equal(actions.filter((item) => item.type === 'external_link').length, 2)
  assert.deepEqual(
    actions.filter((item) => item.type === 'external_link').map((item) => item.label),
    ['MarkHQ · GitHub', 'ApplyLang · GitHub'],
  )
  assert.equal(actions.length, 3)
  assert.equal(sources.length, 2)
})

test('API-shaped generic GitHub actions are labeled from their matching project proof', () => {
  const { actions } = getAssistantMessageLinks(
    [
      { label: 'MarkHQ Assistant', href: '/projects/markhq' },
      { label: 'ApplyLang', href: '/projects/applylang' },
    ],
    [
      { label: 'Open GitHub', href: 'https://github.com/markanton13/markhq-assistant-downloads', type: 'github' },
      { label: 'Open GitHub', href: 'https://github.com/markanton13/applylang', type: 'github' },
    ],
  )

  assert.deepEqual(actions.map((item) => item.label), ['MarkHQ · GitHub', 'ApplyLang · GitHub'])
})

test('deduplication normalizes destinations and purpose but preserves separate purposes', () => {
  const { actions } = getAssistantMessageLinks([], [
    { label: 'Contact Mark', href: 'https://MARKBADONG.COM/#contact', type: 'contact' },
    { label: 'Contact Mark about this', href: 'https://markbadong.com#contact', type: 'contact' },
    { label: 'Book a quick call', href: 'https://calendar.app.google/mark-call', type: 'booking' },
    { label: 'Book a call', href: 'https://calendar.app.google/mark-call/', type: 'booking' },
    { label: 'View résumé', href: '/files/Mark-Anton-Badong-Resume.pdf', type: 'resume' },
    { label: 'Open résumé', href: 'https://markbadong.com/files/Mark-Anton-Badong-Resume.pdf', type: 'resume' },
    { label: 'Explore selected work', href: '/#work', type: 'navigation' },
    { label: 'Explore work', href: 'https://markbadong.com/#work', type: 'navigation' },
    { label: 'Contact section', href: 'https://markbadong.com/#work', type: 'contact' },
  ])

  assert.deepEqual(
    actions.map(({ label, type }) => `${type}:${label}`),
    [
      'contact:Contact Mark',
      'booking:Book a quick call',
      'resume:View résumé',
      'navigation:Explore selected work',
      'contact:Contact section',
    ],
  )
})

test('Portfolio Proof suppresses action links with the same normalized destination', () => {
  const { sources, actions } = getAssistantMessageLinks(
    [{ label: 'MarkHQ case study', href: 'https://markbadong.com/projects/markhq/' }],
    [
      { label: 'Open case study', href: '/projects/markhq', type: 'internal_link' },
      { label: 'MarkHQ · GitHub', href: 'https://github.com/markanton13/markhq-assistant-downloads', type: 'external_link' },
    ],
  )

  assert.equal(sources.length, 1)
  assert.deepEqual(actions.map((item) => item.label), ['MarkHQ · GitHub'])
})
