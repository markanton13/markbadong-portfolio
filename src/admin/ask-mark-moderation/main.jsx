import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ModerationApp from './ModerationApp.jsx'
import './moderation.css'

const rootElement = document.getElementById(
  'ask-mark-moderation-root',
)

if (!rootElement) {
  throw new Error(
    'Ask Mark moderation root is unavailable.',
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <ModerationApp />
  </StrictMode>,
)
