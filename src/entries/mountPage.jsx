import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../styles/site.css'
import { initializeTracking } from '../lib/analytics.js'

export function mountPage(PageComponent) {
  initializeTracking()

  const root = document.getElementById('root')
  if (!root) throw new Error('Could not find the portfolio root element.')

  createRoot(root).render(
    <StrictMode>
      <PageComponent />
    </StrictMode>,
  )
}
