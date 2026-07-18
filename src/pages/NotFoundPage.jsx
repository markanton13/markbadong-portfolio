import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { PageMeta } from '../components/PageMeta'

export function NotFoundPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <PageMeta pageKey="notFound" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell">
        <Header mode="case-study" />
        <main id="main-content" className="not-found-main">
          <section className="not-found-card" aria-labelledby="not-found-title">
            <p className="eyebrow">Error 404</p>
            <h1 id="not-found-title">This page isn’t part of the portfolio.</h1>
            <p>
              The address may be incomplete, outdated, or mistyped. The main portfolio and published case studies are still available.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/">Return home</a>
              <a className="button button-secondary" href="/#work">Explore selected work</a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
