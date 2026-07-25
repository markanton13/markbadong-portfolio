import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'
import { PageMeta } from '../components/PageMeta'

const imageBase = '/images/projects/learning-library'

function CaseFigure({ src, alt, caption, className = '', eager = false }) {
  return (
    <figure className={`case-figure ${className}`.trim()}>
      <ExpandableImage
        src={`${imageBase}/${src}`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
      />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

const architectureLayers = [
  {
    title: 'Public learning experience',
    copy: 'Ten interactive guides are delivered through Cloudflare Pages, with registry-driven free and premium access rules.',
  },
  {
    title: 'Serverless access control',
    copy: 'Workers middleware validates signed access cookies, guide scopes, device limits, immutable pass clocks, and fail-closed course registration.',
  },
  {
    title: 'Operational data',
    copy: 'Cloudflare D1 stores vouchers, purchases, rewarded-ad claims, recovery links, support requests, analytics events, launch controls, and backup records.',
  },
  {
    title: 'Connected services',
    copy: 'PayMongo test webhooks, Resend recovery email, Turnstile verification, and Google test rewarded ads support realistic end-to-end demonstrations.',
  },
]

const validationItems = [
  'Free-guide access and premium gating in fresh browser sessions',
  'PayMongo test checkout, signed webhook fulfillment, and automatic activation',
  'Rewarded-ad opt-in, reward completion, early-close protection, and daily limits',
  'Passwordless email recovery, single-use links, recovery codes, and device limits',
  'Immutable pass clocks across device resets and browser recovery',
  'Responsive countdown, expiry revalidation, and protected-guide lockout',
  'Cloudflare Access plus admin API-key protection for private operations tools',
  'D1 backups, emergency pause, health checks, analytics, and rollback workflows',
  'Unified guide onboarding and fail-closed handling for unregistered content',
]

export function LearningLibraryCaseStudy() {
  useEffect(() => {
    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(window.location.hash.slice(1))
        target?.scrollIntoView()
      })
    } else {
      window.scrollTo(0, 0)
    }
  }, [])

  return (
    <>
      <PageMeta pageKey="learningLibrary" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell case-study-shell">
        <Header mode="case-study" />

        <main id="main-content" className="case-study-main">
          <section className="case-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Serverless interactive learning platform</p>
                <h1>Learning Library <em>Access Platform</em></h1>
                <p className="case-hero-intro">
                  A deployed learning system combining interactive guides, premium access control,
                  test payments, rewarded-ad unlocks, passwordless recovery, analytics, and launch operations.
                </p>
                <div className="case-tag-list" aria-label="Project highlights">
                  <span>Cloudflare Pages + Workers</span>
                  <span>D1 access system</span>
                  <span>PayMongo + Resend</span>
                  <span>Rewarded access + analytics</span>
                </div>
                <div className="hero-actions">
                  <a className="button button-primary" href="https://learn.markbadong.com" target="_blank" rel="noreferrer">Open live demo</a>
                  <a className="button button-secondary" href="#case-overview">Explore the case study</a>
                  <a className="button button-secondary" href="#architecture">View architecture</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Serverless learning platform</strong></div>
                <div><span>My role</span><strong>Creator, system designer & QA</strong></div>
                <div><span>Status</span><strong>Live portfolio demo</strong></div>
                <div><span>Safety mode</span><strong>Test payments and test ads</strong></div>
              </aside>
            </div>

            <CaseFigure
              className="case-hero-figure"
              src="library-overview.svg"
              alt="Illustrated overview of the Learning Library with guide cards, premium access, recovery, and operations controls."
              caption="The platform connects an interactive learning catalog with access control, recovery, analytics, and operational safeguards."
              eager
            />
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>A collection of learning guides evolved into a complete access and operations platform.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  The original goal was to organize interactive training material. The finished system also handles premium access, time-limited passes, recovery, provider integrations, and private administration.
                </p>
                <p>
                  The live catalog currently contains ten guides. Nine remain public and one premium guide demonstrates the full access lifecycle through Google test rewarded ads, PayMongo test checkout, vouchers, and passwordless recovery.
                </p>
                <p>
                  The project intentionally stays in portfolio mode: real transactions and real ad monetization are locked, while the complete technical workflow remains available for evaluation.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Content</dt><dd>10 registered interactive guides</dd></div>
                <div><dt>Runtime</dt><dd>Cloudflare Pages, Workers, and D1</dd></div>
                <div><dt>Access</dt><dd>Free, voucher, purchase, rewarded ad, and owner passes</dd></div>
                <div><dt>Operations</dt><dd>Analytics, support, backups, health, and launch controls</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The problem</p>
              <h2>Static guides alone could not support controlled access or realistic product operations.</h2>
              <p>
                Premium content needed secure routing, timed access, recovery, device handling, and operational visibility without turning the project into a heavyweight account system.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The solution</p>
              <h2>A serverless access layer with one guide registry and multiple verified entry paths.</h2>
              <p>
                Shared middleware, signed cookies, immutable pass clocks, D1 records, provider callbacks, and fail-closed registration rules keep the learner experience simple while preserving operational control.
              </p>
            </article>
          </section>

          <section id="architecture" className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Architecture</p>
              <h2>Public learning, protected access, provider integrations, and private operations remain separate.</h2>
            </div>

            <CaseFigure
              src="access-architecture.svg"
              alt="Architecture diagram connecting learners, Cloudflare Pages and Workers, D1, PayMongo, Resend, Turnstile, Google rewarded ads, and private admin tools."
              caption="The architecture keeps provider-specific workflows behind server-side validation while the public library remains fast and static-first."
            />

            <div className="case-decision-grid">
              {architectureLayers.map((layer) => (
                <article key={layer.title} className="case-decision-card">
                  <h3>{layer.title}</h3>
                  <p>{layer.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="demo" className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Access lifecycle</p>
              <h2>Learners can unlock access without creating a traditional account.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">01</span>
                <h3>Verified purchase fulfillment</h3>
                <p>
                  A PayMongo test checkout is created server-side. A signed payment webhook records the purchase, issues a scoped voucher, and allows the confirmation page to activate a signed browser pass automatically.
                </p>
                <ul className="case-bullet-list">
                  <li>Webhook-driven fulfillment</li>
                  <li>Automatic access activation</li>
                  <li>Recovery voucher retained as a fallback</li>
                  <li>Live-mode safety lock remains disabled</li>
                </ul>
              </div>
              <CaseFigure
                src="operations-console.svg"
                alt="Illustrated operations console showing purchase activation, rewarded access, recovery, countdown, and analytics states."
                caption="One operations model supports purchase, rewarded, recovery, and administrative access flows."
              />
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">02</span>
                <h3>Voluntary rewarded access</h3>
                <p>
                  Learners can choose a Google test rewarded ad for temporary course access. Turnstile protects claim creation, the reward event activates the pass, and early closure grants nothing.
                </p>
                <ul className="case-bullet-list">
                  <li>Explicit opt-in before the ad</li>
                  <li>Reward-event activation</li>
                  <li>Daily claim limits and no-fill handling</li>
                  <li>Course-scoped Ad Pass recovery</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="case-section case-local-section">
            <div className="case-section-heading">
              <p className="eyebrow">Recovery and time integrity</p>
              <h2>Browser data can be replaced without restarting the purchased clock.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">03</span>
                <h3>Passwordless recovery</h3>
                <p>
                  Buyers can copy or download a recovery code, request a single-use email link, or contact support. Recovery restores the valid remaining access period instead of issuing a fresh duration.
                </p>
                <ul className="case-bullet-list">
                  <li>Single-use, expiring recovery links</li>
                  <li>Readable pass codes are never stored in D1</li>
                  <li>Device-limit enforcement and admin reset</li>
                  <li>Permanent pass-level start and expiry</li>
                </ul>
              </div>

              <div className="case-feature-copy">
                <span className="case-number">04</span>
                <h3>Live access countdown</h3>
                <p>
                  Timed passes display the server-aligned remaining duration and exact local expiry. The browser revalidates with the server at zero and locks protected content after expiration.
                </p>
                <ul className="case-bullet-list">
                  <li>Warning and critical countdown states</li>
                  <li>Purchase and Ad Pass support</li>
                  <li>Lifetime-pass no-expiry state</li>
                  <li>Server remains the source of truth</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Operations and scale</p>
              <h2>The platform includes the controls needed to operate and extend it safely.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">05</span>
                <h3>Private analytics and launch operations</h3>
                <p>
                  Cloudflare Access and an admin API key protect analytics, voucher tools, support recovery, launch checklists, maintenance controls, and backup records.
                </p>
                <ul className="case-bullet-list">
                  <li>Purchases, access, ad, recovery, and support metrics</li>
                  <li>CSV export without raw secrets or recovery tokens</li>
                  <li>Emergency pause for new purchases and Ad Passes</li>
                  <li>D1 export records and rollback runbooks</li>
                </ul>
              </div>

              <div className="case-feature-copy">
                <span className="case-number">06</span>
                <h3>Unified guide onboarding</h3>
                <p>
                  A canonical guide registry controls homepage cards, access tiers, secure routes, rewarded eligibility, pricing choices, analytics filters, countdown installation, and sitemap inclusion.
                </p>
                <ul className="case-bullet-list">
                  <li>Free or premium tier declared once</li>
                  <li>Automated onboarding command</li>
                  <li>Unknown guide files fail closed</li>
                  <li>All-access passes cover future premium guides</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="validation" className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Validation</p>
              <h2>Each new layer was tested against the workflows that already worked.</h2>
            </div>

            <ul className="case-check-list">
              {validationItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel">
              <p className="eyebrow">Key engineering lesson</p>
              <h2>Device identity and access duration must be separate concepts.</h2>
              <p>
                A recovery test exposed that deleting device redemptions could restart a timed pass. The fix introduced immutable pass-level clocks, with device rows acting only as replaceable browser registrations.
              </p>
            </article>

            <article className="case-panel">
              <p className="eyebrow">Portfolio positioning</p>
              <h2>The product is realistic without pretending to be commercially live.</h2>
              <p>
                The complete purchase and rewarded-ad experiences run in provider test modes. Production approval remains explicitly locked, making the technical work demonstrable without processing real charges or real ad revenue.
              </p>
            </article>
          </section>

          <section className="case-section case-cta-section">
            <p className="eyebrow">Explore the system</p>
            <h2>Open the deployed library and review the live access experience.</h2>
            <p>
              The live platform includes free guides, a premium access gate, test payment and rewarded-ad flows, recovery, and visible portfolio-mode disclosures.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="https://learn.markbadong.com" target="_blank" rel="noreferrer">Open Learning Library</a>
              <a className="button button-secondary" href="https://learn.markbadong.com/pricing/" target="_blank" rel="noreferrer">View access options</a>
              <a className="button button-secondary" href="https://learn.markbadong.com/support/" target="_blank" rel="noreferrer">View recovery support</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
