import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getMockResponse } from './assistantMockData.js'

const assistantSource = await readFile(new URL('./AskMarkAssistant.jsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../../styles/assistant.css', import.meta.url), 'utf8')
const siteStyles = await readFile(new URL('../../styles/site.css', import.meta.url), 'utf8')

test('greeting and small talk are concise and do not overstate the public AI capability', () => {
  const greeting = getMockResponse('hello', '/')
  const smallTalk = getMockResponse('how are you?', '/')
  const identity = getMockResponse('Who are you?', '/')

  assert.match(greeting.answer, /approved projects, skills, or customer and technical support background/i)
  assert.match(smallTalk.answer, /ready to help/i)
  assert.match(identity.answer, /portfolio assistant/i)
  assert.doesNotMatch(`${greeting.answer} ${smallTalk.answer} ${identity.answer}`, /AI portfolio concierge/i)
})

test('keyboard submission supports Enter, preserves Shift+Enter, and ignores IME composition', () => {
  assert.match(assistantSource, /event\.key === 'Enter'/)
  assert.match(assistantSource, /!event\.shiftKey/)
  assert.match(assistantSource, /!event\.nativeEvent\?\.isComposing/)
  assert.match(assistantSource, /event\.nativeEvent\?\.keyCode !== 229/)
  assert.match(assistantSource, /enterKeyHint="send"/)
  assert.match(assistantSource, /Press Shift and Enter to add a line/)
})

test('chat exposes a polite log and waiting status with a user-controlled cancel action', () => {
  assert.match(assistantSource, /role="log"\s+aria-live="polite"/)
  assert.match(assistantSource, /role="status"/)
  assert.match(assistantSource, /Cancel response/)
  assert.match(assistantSource, /aria-label="Ask Mark portfolio assistant"/)
})

test('message scrolling follows new content only while the reader remains near the bottom', () => {
  assert.match(assistantSource, /if \(!list \|\| !isOpen \|\| isIntakeView \|\| !isAtBottomRef\.current\) return/)
  assert.match(assistantSource, /element\.scrollHeight - element\.scrollTop - element\.clientHeight < 80/)
  assert.match(assistantSource, /isAtBottomRef\.current = true/)
})

test('responsive panel and long content have bounded, wrapping layouts', () => {
  assert.match(styles, /width: min\(420px, calc\(100vw - 32px\)\)/)
  assert.match(styles, /height: min\(88dvh, 760px\)/)
  assert.match(styles, /@media \(max-width: 700px\)/)
  assert.match(styles, /@media \(max-width: 390px\)/)
  assert.match(styles, /\.ask-mark-message__content \{\s*min-width: 0;\s*max-width: 84%;\s*overflow-wrap: anywhere;/)
})

test('keyboard focus and reduced-motion preferences are represented in the assistant styles', () => {
  assert.match(styles, /\.ask-mark-launcher:focus-visible/)
  assert.match(styles, /\.ask-mark-send:focus-visible/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})

test('small composer text uses the approved readable muted color token', () => {
  assert.match(styles, /\.ask-mark-composer textarea::placeholder \{\s*color: var\(--ask-mark-muted\);/)
  assert.match(styles, /\.ask-mark-composer > p \{[\s\S]*?color: var\(--ask-mark-muted\);/)
  assert.match(siteStyles, /--muted:\s*#69665f/i)
})
