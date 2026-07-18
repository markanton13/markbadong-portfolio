import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../styles/site.css'

export function mountPage(PageComponent) {
  const root = document.getElementById('root')
  if (!root) throw new Error('Could not find the portfolio root element.')

  createRoot(root).render(
    <StrictMode>
      <PageComponent />
    </StrictMode>,
  )
}
