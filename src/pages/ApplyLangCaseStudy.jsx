import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'

const imageBase = '/images/projects/applylang'

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

const decisions = [
  {
    title: 'Career sources remain authoritative',
    copy: 'Tailoring begins with the registered résumé and Master Career Profile. The system directs the user to emphasize supported evidence without inventing employers, dates, tools, metrics, credentials, or experience.',
  },
  {
    title: 'Every application keeps a frozen snapshot',
    copy: 'The résumé and career profile used at the time of application remain connected to that record, even when newer master versions are registered later.',
  },
  {
    title: 'No paid AI API is required',
    copy: 'ApplyLang prepares structured, role-matched prompt files and the exact source documents to use. The user can take that package to ChatGPT without sending résumé data through a bot-managed external AI API.',
  },
  {
    title: 'Discord proves the workflow before the web app',
    copy: 'The complete Discord product validates application capture, records, prompts, dashboards, source control, and follow-ups. The planned web app will expand the same model through RBAC and full CRUD interfaces.',
  },
]

const validationItems = [
  'Registered a reusable master résumé and detailed Master Career Profile',
  'Created application records with unique IDs and frozen source snapshots',
  'Captured role, company, platform, status, date, and job responsibilities',
  'Generated ATS-match, résumé-tailoring, cover-letter, interview, and full-pack actions',
  'Produced saved Markdown prompt files with the correct résumé and career source',
  'Verified role-profile detection and visible confidence reporting',
  'Tracked application metrics, conversion stages, statuses, and follow-up aging',
  'Preserved master versions and integrity references inside the résumé vault',
  'Tested guided onboarding and private workspace channel setup',
  'Confirmed that existing application snapshots are not rewritten by later master updates',
]

export function ApplyLangCaseStudy() {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content')

    document.title = 'ApplyLang Case Study | Mark Anton'
    description?.setAttribute(
      'content',
      'A case study of ApplyLang, a complete Discord career operations system for truth-safe application records, resume tailoring prompts, dashboards, source snapshots, and a planned RBAC web platform.',
    )
    window.scrollTo(0, 0)

    return () => {
      document.title = previousTitle
      if (description && previousDescription) description.setAttribute('content', previousDescription)
    }
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell case-study-shell">
        <Header mode="case-study" />

        <main id="main-content" className="case-study-main">
          <section className="case-hero applylang-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Complete Discord career operations system</p>
                <h1>ApplyLang <em>Career Workspace</em></h1>
                <p className="case-hero-intro">
                  A complete Discord product that connects reusable career sources, structured application records, role-matched prompt packages, résumé snapshots, follow-ups, and career tracking in one private workspace.
                </p>

                <div className="case-tag-list" aria-label="Project highlights">
                  <span>Complete Discord bot</span>
                  <span>Truth-safe tailoring</span>
                  <span>Frozen source snapshots</span>
                  <span>RBAC web app planned</span>
                </div>

                <div className="hero-actions">
                  <a className="button button-primary" href="#case-overview">Explore the case study</a>
                  <a className="button button-secondary" href="/#contact">Discuss similar work</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Personal product</strong></div>
                <div><span>My role</span><strong>Creator & workflow designer</strong></div>
                <div><span>Current product</span><strong>Complete Discord bot</strong></div>
                <div><span>Next evolution</span><strong>Standalone RBAC web app</strong></div>
              </aside>
            </div>

            <CaseFigure
              className="case-hero-figure"
              src="application-record.webp"
              alt="ApplyLang Discord application record for a fictional Product Tester role at ABC Company, showing the saved resume, career source snapshot, application details, statuses, and workflow actions."
              caption="A complete application record keeps the role, source résumé, frozen career profile, status, responsibilities, and next actions connected under one application ID."
              eager
            />

            <p className="applylang-interface-note">
              Interface note: these release screenshots retain the existing ApplyHQ bot label used inside Discord. ApplyLang is the public product identity and the name of the planned standalone platform.
            </p>
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>Application tailoring works better when the workflow is as organized as the résumé.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  ApplyLang treats every job application as an operational record—not only a document-generation request.
                </p>
                <p>
                  The system preserves the job context, exact source materials, role guidance, generated prompt files, statuses, notes, and follow-up history. That structure makes repeated applications faster while protecting accuracy and traceability.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Current interface</dt><dd>Private Discord career workspace</dd></div>
                <div><dt>Core records</dt><dd>Applications, résumé versions, career profiles, prompts, notes, and follow-ups</dd></div>
                <div><dt>AI model</dt><dd>No paid bot-managed AI API required</dd></div>
                <div><dt>Product direction</dt><dd>Standalone web app with RBAC, CRUD, dashboards, and optional Discord integration</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The problem</p>
              <h2>Job-search work becomes fragmented and difficult to verify.</h2>
              <p>
                Job posts live in tabs, résumé versions in different folders, application notes in chat, and follow-ups in memory. Repeated tailoring can also introduce unsupported claims when the source of truth is unclear.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The solution</p>
              <h2>One traceable workflow from career source to application record.</h2>
              <p>
                ApplyLang connects registered master files, application details, role-specific guidance, prompt packages, status actions, and career tracking inside the same private workspace.
              </p>
            </article>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Guided setup</p>
              <h2>The workspace explains its own operating model.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">01</span>
                <h3>Quick Start and private workspace structure</h3>
                <p>
                  The onboarding guide shows the first-time source setup and the daily flow from application capture to prompt generation, document registration, status updates, and follow-ups.
                </p>
                <ul className="case-bullet-list">
                  <li>Master résumé and career-profile setup</li>
                  <li>Dedicated applications and résumé-vault channels</li>
                  <li>Prompt, dashboard, reminder, and archive areas</li>
                  <li>Private user-specific career workspaces</li>
                </ul>
              </div>

              <CaseFigure
                src="quick-start.webp"
                alt="ApplyLang Discord Quick Start guide showing first-time resume and profile setup, daily application workflow, workspace channels, safety notes, and handbook links."
                caption="The Quick Start guide gives users one visible path through source setup, daily application work, saved outputs, statuses, and follow-ups."
              />
            </div>
          </section>

          <section className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Prompt bridge</p>
              <h2>Role-matched prompts without silently sending résumé data to an external AI API.</h2>
            </div>

            <div className="case-feature case-feature-dark">
              <div className="case-feature-copy">
                <span className="case-number">02</span>
                <h3>Career Prompt Bridge and truthfulness guardrails</h3>
                <p>
                  ApplyLang prepares a saved Markdown prompt, identifies the correct source résumé, and attaches the registered Master Career Profile. The user then reviews and uses that package in ChatGPT.
                </p>
                <p>
                  Every prompt explicitly warns against invented skills, employers, dates, metrics, certifications, or experience.
                </p>
              </div>

              <CaseFigure
                src="career-prompts.webp"
                alt="ApplyLang career-prompts channel explaining the no-paid-AI-API workflow, truthfulness guardrail, and confirmation that application APP-2026-0001 was saved with frozen source snapshots."
                caption="The prompt bridge separates structured preparation from final AI use while keeping truth rules visible."
              />
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Application operations</p>
              <h2>The record retains the source, the role context, and every next action.</h2>
            </div>

            <div className="case-gallery case-gallery-two">
              <CaseFigure
                src="application-record.webp"
                alt="ApplyLang Discord application thread with the fictional Product Tester application record, saved source files, status, platform, date, responsibilities, and workflow buttons."
                caption="Application records expose status, platform, date, source snapshot, résumé used, responsibilities, and actions for prompts, notes, follow-ups, archive, and deletion."
              />

              <CaseFigure
                src="tailoring-output.webp"
                alt="ApplyLang generated Tailor Existing Resume Markdown prompt for the fictional Product Tester role, with attached resume and career profile, role profile, match confidence, and next-step instructions."
                caption="A tailoring action produces a saved prompt file, the exact résumé snapshot, the career source, detected role profile, confidence, and review instructions."
              />
            </div>
          </section>

          <section className="case-section case-local-section">
            <div className="case-section-heading">
              <p className="eyebrow">Operational proof</p>
              <h2>Dashboards and source control turn the bot into a complete career workspace.</h2>
            </div>

            <div className="case-gallery case-gallery-two case-gallery-tall">
              <CaseFigure
                src="career-dashboard.webp"
                alt="ApplyLang career dashboard showing tracked applications, response rate, active interviews, weekly activity, conversion funnel, follow-up aging, platform metrics, and status breakdown."
                caption="The bot-maintained dashboard summarizes applications, conversion stages, statuses, platforms, interviews, and follow-up aging."
              />

              <CaseFigure
                src="resume-vault.webp"
                alt="ApplyLang resume vault showing the active master resume and Master Career Profile, version numbers, integrity references, and confirmation that older application snapshots are never rewritten."
                caption="The résumé vault maintains active master versions, integrity references, and immutable historical application snapshots."
              />
            </div>
          </section>

          <section className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Web product roadmap</p>
              <h2>The complete bot is the foundation—not the final interface.</h2>
            </div>

            <div className="applylang-roadmap-grid">
              <article>
                <span>Proven now</span>
                <h3>Complete Discord career operations</h3>
                <ul className="case-bullet-list">
                  <li>Private user workspaces</li>
                  <li>Application and source records</li>
                  <li>Prompt packages and document actions</li>
                  <li>Dashboards, statuses, reminders, and archives</li>
                </ul>
              </article>

              <article>
                <span>Planned evolution</span>
                <h3>Standalone role-based web application</h3>
                <ul className="case-bullet-list">
                  <li>Role-based access control</li>
                  <li>Full CRUD across users, sources, applications, and outputs</li>
                  <li>Searchable dashboards, filters, and record histories</li>
                  <li>Discord as an optional companion integration</li>
                </ul>
              </article>
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Product decisions</p>
              <h2>Speed matters, but trust and traceability matter more.</h2>
            </div>

            <div className="case-decision-grid">
              {decisions.map((decision, index) => (
                <article key={decision.title}>
                  <span>0{index + 1}</span>
                  <h3>{decision.title}</h3>
                  <p>{decision.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="case-section case-validation-section">
            <div className="case-section-heading">
              <p className="eyebrow">Validation</p>
              <h2>Tested through complete application-shaped workflows.</h2>
            </div>

            <div className="case-validation-grid">
              {validationItems.map((item) => (
                <div key={item}><span aria-hidden="true">✓</span><p>{item}</p></div>
              ))}
            </div>
          </section>

          <section className="case-section case-role-section">
            <div className="case-role-card">
              <p className="eyebrow">My role</p>
              <h2>Product direction grounded in a real job-search workflow.</h2>
              <p>
                I defined the workspace model, application lifecycle, truth rules, source-version behavior, prompt system, dashboards, validation scenarios, and product roadmap. The complete Discord release now serves as the proven functional foundation for the future ApplyLang web platform.
              </p>
            </div>
          </section>

          <section className="case-cta">
            <p className="eyebrow">Need a structured workflow?</p>
            <h2>I design systems that make repeated work easier to trust, track, and improve.</h2>
            <div className="hero-actions">
              <a className="button button-light" href="mailto:markantonbadong13@gmail.com">Email Mark</a>
              <a className="button button-outline-light" href="/#work">View more work</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
