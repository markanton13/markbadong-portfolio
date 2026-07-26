import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'
import { PageMeta } from '../components/PageMeta'

const imageBase = '/images/projects/funnel-lab'

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

const styleDirections = [
  {
    title: 'FlowPilot',
    copy: 'A calm soft-light SaaS system with a dark product dashboard, pricing logic, trial capture, and demo booking.',
  },
  {
    title: 'Clarity with Maya',
    copy: 'A warm editorial coaching funnel with a qualification quiz, tailored recommendation, and strategy-call flow.',
  },
  {
    title: 'Luma Home Care',
    copy: 'A friendly local-service experience with an instant quote estimator, scheduling preferences, and trust-focused content.',
  },
  {
    title: 'ClientFlow Kit',
    copy: 'A creator-led digital-product funnel with product previews, value stacking, simulated checkout, and onboarding booking.',
  },
  {
    title: 'Aurelia Dental',
    copy: 'A calm clinical-luxury clinic experience with a smile check, treatment guidance, insurance simulation, and appointment request.',
  },
  {
    title: 'Forge 47 Fitness',
    copy: 'A kinetic fitness system with program matching, class filters, membership calculation, and free-session booking.',
  },
  {
    title: 'Northline Build',
    copy: 'A blueprint-inspired construction funnel with project paths, milestone exploration, budgeting, and consultation capture.',
  },
]

const pipelineLayers = [
  {
    title: 'Static-first delivery',
    copy: 'The gallery and seven demos are deployed through Cloudflare Pages for fast global delivery and simple maintenance.',
  },
  {
    title: 'Serverless form endpoint',
    copy: 'The real Contact Mark form submits to a Pages Function that validates and sanitizes the request server-side.',
  },
  {
    title: 'Transactional email',
    copy: 'Resend delivers the structured inquiry to the portfolio inbox while preserving the visitor email as the reply-to address.',
  },
  {
    title: 'Separated demo boundaries',
    copy: 'Fictional business forms remain simulations, while real project inquiries use Mark’s production booking and contact paths.',
  },
]

const validationItems = [
  'Responsive layouts across desktop and compact mobile viewports',
  'Navigation, accordions, tabs, carousels, selectors, and modal behavior',
  'Qualification, pricing, quote, budget, and membership calculations',
  'Multi-step booking flows with review and confirmation states',
  'Client-side and server-side contact-form validation',
  'Cloudflare Pages Function and Resend email delivery',
  'Keyboard-accessible modal behavior and Escape-key handling',
  'Reduced-motion support and visible focus states',
  'Locally stored, optimized stock photography with source credits',
  'No horizontal overflow, missing local assets, or duplicate element IDs',
]

export function FunnelLabCaseStudy() {
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
      <PageMeta pageKey="funnelLab" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell case-study-shell">
        <Header mode="case-study" />

        <main id="main-content" className="case-study-main">
          <section className="case-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Interactive conversion design portfolio</p>
                <h1>Landing &amp; Funnel <em>Portfolio Lab</em></h1>
                <p className="case-hero-intro">
                  Seven feature-complete landing pages and funnels, each built around a different industry,
                  visual identity, conversion objective, and interactive customer journey.
                </p>
                <div className="case-tag-list" aria-label="Project highlights">
                  <span>7 industry demos</span>
                  <span>Vanilla HTML, CSS &amp; JavaScript</span>
                  <span>Cloudflare Pages + Function</span>
                  <span>Resend inquiry delivery</span>
                </div>
                <div className="hero-actions">
                  <a className="button button-primary" href="https://funnels.markbadong.com" target="_blank" rel="noreferrer">Open live gallery</a>
                  <a className="button button-secondary" href="https://github.com/markanton13/landing-funnel-portfolio-lab" target="_blank" rel="noreferrer">View GitHub</a>
                  <a className="button button-secondary" href="#case-overview">Explore the case study</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Multi-industry funnel showcase</strong></div>
                <div><span>My role</span><strong>Creator, frontend developer, conversion UX &amp; QA</strong></div>
                <div><span>Status</span><strong>Live and production-deployed</strong></div>
                <div><span>Live surface</span><strong>funnels.markbadong.com</strong></div>
              </aside>
            </div>

            <CaseFigure
              className="case-hero-figure"
              src="gallery-overview.webp"
              alt="Landing and Funnel Portfolio Lab gallery hero showing seven distinct conversion demos and real project booking paths."
              caption="The gallery presents seven working demos while separating fictional business interactions from Mark’s real booking and contact paths."
              eager
            />
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>A portfolio experiment became a complete proof of visual range and conversion thinking.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  The goal was not to produce seven templates. It was to show that one developer can adapt strategy, hierarchy, interaction, and tone to very different businesses.
                </p>
                <p>
                  Each demo uses its own content model, visual system, responsive behavior, and conversion path. SaaS trials, coaching qualification, service quotes, product checkout, clinic appointments, gym memberships, and construction inquiries all require different decisions.
                </p>
                <p>
                  The finished lab also includes a shared gallery, real booking links, and a production contact pipeline powered by Cloudflare Pages Functions and Resend.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Demos</dt><dd>7 complete industry experiences</dd></div>
                <div><dt>Frontend</dt><dd>Single-file HTML, CSS, and JavaScript pages</dd></div>
                <div><dt>Deployment</dt><dd>Cloudflare Pages with custom subdomain</dd></div>
                <div><dt>Real inquiry</dt><dd>Pages Function → Resend → Gmail</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The challenge</p>
              <h2>One repeated template would show output, but not real design range.</h2>
              <p>
                A convincing funnel portfolio needed to demonstrate different audiences, trust signals, content priorities, visual languages, and conversion mechanics without becoming visually chaotic or technically fragile.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The approach</p>
              <h2>Shared quality standards, distinct systems, and a complete working journey for every concept.</h2>
              <p>
                Each page received a unique identity and interaction set, while accessibility, responsive behavior, validation, disclosures, image optimization, and QA remained consistent across the lab.
              </p>
            </article>
          </section>

          <section id="conversion-system" className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Conversion systems</p>
              <h2>The demos behave like real customer journeys—not static design mockups.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">01</span>
                <h3>Interactions support the business decision.</h3>
                <p>
                  Every demo includes functional mechanics that match its offer: a pricing toggle for SaaS, a coaching-fit quiz, a service quote estimator, a simulated checkout, an insurance check, a membership calculator, or a construction budget range.
                </p>
                <ul className="case-bullet-list">
                  <li>Relevant inputs instead of generic forms</li>
                  <li>Clear validation and review states</li>
                  <li>Booking and contact paths connected to the result</li>
                  <li>Fictional interactions clearly disclosed</li>
                </ul>
              </div>

              <CaseFigure
                src="flowpilot.webp"
                alt="FlowPilot SaaS landing page with a soft-light interface, dark workflow dashboard, pricing, trial, and demo-booking calls to action."
                caption="FlowPilot establishes a product-led SaaS experience with a contrasting dashboard, trial capture, pricing logic, and a multi-step demo request."
              />
            </div>

            <div className="case-gallery case-gallery-two funnel-case-gallery">
              <CaseFigure
                src="clarity-with-maya.webp"
                alt="Clarity with Maya editorial coaching funnel with a warm portrait-led hero and consultation call to action."
                caption="Clarity with Maya uses editorial typography and a qualification path to make the consultation feel personal and intentional."
              />
              <CaseFigure
                src="luma-home-care.webp"
                alt="Luma Home Care local-service landing page with a bright home interior and quote-estimator call to action."
                caption="Luma Home Care emphasizes trust, service selection, local coverage, estimated pricing, and preferred appointment details."
              />
            </div>
          </section>

          <section id="visual-range" className="case-section case-section-dark funnel-range-section">
            <div className="case-section-heading">
              <p className="eyebrow">Visual range</p>
              <h2>Each industry receives a purpose-built identity instead of a recolored template.</h2>
            </div>

            <div className="funnel-style-grid">
              {styleDirections.map((direction, index) => (
                <article key={direction.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{direction.title}</h3>
                  <p>{direction.copy}</p>
                </article>
              ))}
            </div>

            <div className="case-gallery case-gallery-two funnel-case-gallery funnel-dark-gallery">
              <CaseFigure
                src="clientflow-kit.webp"
                alt="ClientFlow Kit digital-product sales funnel with a creator workspace aesthetic and product box mockup."
                caption="Creator-product sales: warm editorial styling, value stack, previews, simulated checkout, and onboarding."
              />
              <CaseFigure
                src="aurelia-dental.webp"
                alt="Aurelia Dental Studio clinical-luxury clinic funnel with an editorial hero and dentist consultation imagery."
                caption="Clinical luxury: reassuring hierarchy, treatment guidance, insurance simulation, and appointment capture."
              />
              <CaseFigure
                src="forge-47-fitness.webp"
                alt="Forge 47 Fitness bold gym funnel with black, cream, and acid-lime styling."
                caption="Kinetic fitness: condensed typography, program matching, schedule filters, membership calculation, and booking."
              />
              <CaseFigure
                src="northline-build.webp"
                alt="Northline Build construction funnel with blueprint grid styling and architectural project imagery."
                caption="Technical construction: project paths, milestones, budget and timeline estimation, and consultation capture."
              />
            </div>
          </section>

          <section id="contact-pipeline" className="case-section case-local-section">
            <div className="case-section-heading">
              <p className="eyebrow">Real conversion path</p>
              <h2>The gallery does more than showcase work—it can receive genuine project inquiries.</h2>
            </div>

            <div className="funnel-pipeline-grid">
              {pipelineLayers.map((layer, index) => (
                <article key={layer.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{layer.title}</h3>
                  <p>{layer.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="validation" className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Quality assurance</p>
              <h2>Visual polish was treated as only one part of completion.</h2>
            </div>

            <ul className="case-check-list">
              {validationItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="case-section">
            <div className="case-role-card">
              <div>
                <p className="eyebrow">My contribution</p>
                <h2>Strategy, interface design, frontend implementation, deployment, and production inquiry handling.</h2>
              </div>
              <div>
                <p>
                  I defined the seven concepts, wrote the page structures and conversion logic, implemented the responsive experiences, selected and optimized licensed stock photography, validated interactions, deployed the gallery, connected the custom domain, and added the serverless contact pipeline.
                </p>
                <div className="tool-list" aria-label="Project tools">
                  <span>HTML</span>
                  <span>CSS</span>
                  <span>Vanilla JavaScript</span>
                  <span>Cloudflare Pages</span>
                  <span>Pages Functions</span>
                  <span>Resend</span>
                  <span>Responsive QA</span>
                </div>
              </div>
            </div>
          </section>

          <section className="case-cta">
            <p className="eyebrow">Explore the live lab</p>
            <h2>Open all seven demos and test the complete interactions.</h2>
            <p>
              The gallery links to every working page and includes real paths to book a project call or send Mark a structured inquiry.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="https://funnels.markbadong.com" target="_blank" rel="noreferrer">Open live gallery</a>
              <a className="button button-outline-light" href="https://funnels.markbadong.com/#contact" target="_blank" rel="noreferrer">Contact through Funnel Lab</a>
              <a className="button button-outline-light" href="https://github.com/markanton13/landing-funnel-portfolio-lab" target="_blank" rel="noreferrer">View repository</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
