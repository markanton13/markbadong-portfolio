import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

export function NotFoundPage() {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content') ?? null
    let robots = document.querySelector('meta[name="robots"]')
    const createdRobots = !robots
    const previousRobots = robots?.getAttribute('content') ?? null

    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }

    document.title = 'Page Not Found | Mark Anton'
    description?.setAttribute(
      'content',
      'The requested page could not be found. Return to Mark Anton’s portfolio to explore operations, automation, QA, and web-system case studies.',
    )
    robots.setAttribute('content', 'noindex, nofollow')
    window.scrollTo(0, 0)

    return () => {
      document.title = previousTitle

      if (description) {
        if (previousDescription === null) description.removeAttribute('content')
        else description.setAttribute('content', previousDescription)
      }

      if (createdRobots) robots.remove()
      else if (previousRobots === null) robots.removeAttribute('content')
      else robots.setAttribute('content', previousRobots)
    }
  }, [])

  return (
    <>
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
