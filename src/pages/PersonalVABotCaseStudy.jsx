import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'
import { PageMeta } from '../components/PageMeta'

const imageBase = '/images/projects/personalvabot'

function CaseFigure({ src, alt, caption, className = '', eager = false }) {
  return (
    <figure className={`case-figure ${className}`.trim()}>
      <ExpandableImage src={`${imageBase}/${src}`} alt={alt} loading={eager ? 'eager' : 'lazy'} />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

const decisions = [
  {
    title: 'Archive before permanent deletion',
    copy: 'Historical records remain recoverable by default. Permanent deletion is treated as a deliberate, protected action.',
  },
  {
    title: 'Attendance stays optional',
    copy: 'Task timers and attendance records remain separate unless a client billing agreement explicitly connects them.',
  },
  {
    title: 'Billing logic must be explainable',
    copy: 'The system identifies which records are eligible, which source drives the calculation, and why other time is excluded.',
  },
  {
    title: 'Suggestions never silently create work',
    copy: 'Recommended actions assist the user, but creating or changing operational records remains a visible user decision.',
  },
]

const validationItems = [
  'Created and separated multiple client workspaces',
  'Captured tasks and moved them across lifecycle states',
  'Tracked task time and linked generated outputs',
  'Archived, restored, and permanently deleted protected records',
  'Created attendance entries and validated approval controls',
  'Configured billing agreements and earnings eligibility',
  'Generated working documents and export records',
  'Created and restored local backups',
  'Restarted the launcher without losing stable data',
  'Installed and launched the Windows desktop beta',
]

export function PersonalVABotCaseStudy() {
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
      <PageMeta pageKey="personalvabot" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell case-study-shell">
        <Header mode="case-study" />

        <main id="main-content" className="case-study-main">
          <section className="case-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Desktop operations workspace</p>
                <h1>PersonalVABot <em>Operations Platform</em></h1>
                <p className="case-hero-intro">
                  A local-first Windows system that connects Discord workflows, client operations, task management, attendance, billing, document generation, automation, and workspace health.
                </p>
                <div className="case-tag-list" aria-label="Project highlights">
                  <span>Windows desktop beta</span>
                  <span>Discord integration</span>
                  <span>Local SQLite data</span>
                  <span>72 built-in templates</span>
                </div>
                <div className="hero-actions">
                  <a className="button button-primary" href="#case-overview">Explore the case study</a>
                  <a className="button button-secondary" href="https://github.com/markanton13/personalvabot" target="_blank" rel="noreferrer">View GitHub proof</a>
                  <a className="button button-secondary" href="https://github.com/markanton13/personalvabot/releases/tag/v0.3.12-beta" target="_blank" rel="noreferrer">Download Windows beta</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Personal product</strong></div>
                <div><span>My role</span><strong>Creator & product director</strong></div>
                <div><span>Status</span><strong>Windows Desktop Beta</strong></div>
                <div><span>Version shown</span><strong>0.3.12</strong></div>
              </aside>
            </div>

            <CaseFigure
              className="case-hero-figure"
              src="dashboard.webp"
              alt="PersonalVABot launcher dashboard showing client, task, attendance, billing, automation, backup, and activity information."
              caption="The desktop control center combines daily workload, operational health, automation status, and recommended next actions."
              eager
            />
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>From a Discord assistant to a complete local operations platform.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  PersonalVABot began as a way to organize virtual-assistant work inside Discord. It evolved into a broader Windows workspace with its own dashboard, shared local database, operational modules, and safety controls.
                </p>
                <p>
                  The product was designed for people who manage client tasks, attendance, rates, documents, reminders, and proof of work across disconnected tools. Instead of replacing every working habit, it brings those workflows into one structured system with Discord as an optional companion interface.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Core users</dt><dd>Virtual assistants, independent operators, and small remote teams</dd></div>
                <div><dt>Primary interface</dt><dd>Windows desktop launcher with Discord workflows</dd></div>
                <div><dt>Data model</dt><dd>Local-first storage with stable backups and restore controls</dd></div>
                <div><dt>Product direction</dt><dd>Future standalone web platform with optional team integrations</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The problem</p>
              <h2>Important client work becomes scattered and difficult to audit.</h2>
              <p>
                Tasks live in messages, attendance in another tool, billing rules in spreadsheets, and generated files in local folders. That fragmentation creates missed follow-ups, unclear ownership, weak historical records, and avoidable billing mistakes.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The solution</p>
              <h2>One operating layer for work, records, and daily decisions.</h2>
              <p>
                PersonalVABot connects visual desktop controls with quick Discord commands around the same client, project, task, document, attendance, and billing records.
              </p>
            </article>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Workflow proof</p>
              <h2>Structured task execution with visible history.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">01</span>
                <h3>Task lifecycle and time awareness</h3>
                <p>
                  Tasks move through Inbox, Active, Blocked, Review, Done, and Archived. Each record can retain client and project context, due dates, assignees, tracked time, linked documents, linked prompts, and lifecycle history.
                </p>
                <ul className="case-bullet-list">
                  <li>Interactive lifecycle actions</li>
                  <li>Historical status footprint</li>
                  <li>Linked output visibility</li>
                  <li>Desktop and Discord access</li>
                </ul>
              </div>
              <CaseFigure
                src="task-lifecycle.webp"
                alt="Discord project pipeline task showing status, priority, client, project, due date, tracked time, linked outputs, action buttons, and status history."
                caption="The task thread preserves operational context and a visible audit footprint across lifecycle changes."
              />
            </div>

            <div className="case-gallery case-gallery-two">
              <CaseFigure
                src="task-dashboard.webp"
                alt="PersonalVABot desktop task dashboard with status summaries, filters, tracked time, task details, and actions."
                caption="The desktop task dashboard supports filtering, time awareness, and direct actions."
              />
              <CaseFigure
                src="client-management.webp"
                alt="Discord commands creating a sample client and listing clients and projects."
                caption="Discord commands provide quick client and project administration without leaving the workspace."
              />
            </div>
          </section>

          <section className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Document operations</p>
              <h2>From template discovery to a working, tracked output.</h2>
            </div>

            <div className="case-feature case-feature-dark">
              <div className="case-feature-copy">
                <span className="case-number">02</span>
                <h3>Reusable templates and generated drafts</h3>
                <p>
                  The built-in library covers recurring work across communication, executive assistance, operations, finance, agreements, recruitment, sales, CRM, marketing, travel, and personal productivity.
                </p>
                <p>
                  A user can browse relevant templates, generate a structured draft, retain a versioned document record, and export supported file formats for review or delivery.
                </p>
              </div>
              <CaseFigure
                src="document-generator.webp"
                alt="Discord template browser and generated Mutual NDA draft with an attached text export and structured document preview."
                caption="The workflow moves from template selection to a generated draft and downloadable file."
              />
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Workforce and billing</p>
              <h2>Optional attendance, flexible rates, and explainable earnings.</h2>
            </div>

            <div className="case-gallery case-gallery-two case-gallery-tall">
              <CaseFigure
                src="attendance-dtr.webp"
                alt="Attendance dashboard showing clock-in controls, expected and actual hours, breaks, task time, DTR history, and approval actions."
                caption="Attendance remains optional and separate from task timers unless a client agreement requires it."
              />
              <CaseFigure
                src="billing-agreement.webp"
                alt="Billing agreement registry showing a sample client, hourly rate, weekly billing cycle, eligibility source, archive, and delete actions."
                caption="Client agreements define rates, cycles, calculation sources, and lifecycle controls."
              />
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">03</span>
                <h3>Earnings with visible assumptions</h3>
                <p>
                  The earnings view can convert reference amounts into a preferred display currency while preserving each record’s original currency. Eligibility cards explain which source was used and why other time was excluded.
                </p>
                <p>
                  This keeps projections useful without presenting estimates as guaranteed income, tax advice, or final settlement amounts.
                </p>
              </div>
              <CaseFigure
                src="earnings.webp"
                alt="Earnings dashboard showing a sample projected Philippine peso amount, approved DTR hours, task timer time, eligible records, and conversion information."
                caption="Projected earnings remain transparent about billing source, eligible records, conversion source, and limitations."
              />
            </div>
          </section>

          <section className="case-section case-local-section">
            <div className="case-section-heading">
              <p className="eyebrow">Local-first safety</p>
              <h2>Health, backups, exports, and diagnostics are part of the product—not an afterthought.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">04</span>
                <h3>A visible operational safety layer</h3>
                <p>
                  The launcher surfaces the state of the scheduler, Discord connection, secure credential configuration, local database, backup archive, export health, and document files.
                </p>
                <p>
                  Stable local data is designed to survive normal application upgrades, while backup and restore actions remain directly accessible to the user.
                </p>
              </div>
              <CaseFigure
                src="health-center.webp"
                alt="PersonalVABot health section showing scheduler status, secure Discord configuration, database health, backups, restore controls, and export archive health."
                caption="The health center makes local data safety and integration status visible without exposing credentials."
              />
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Cross-interface workflow</p>
              <h2>Discord remains useful without becoming the entire product.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">05</span>
                <h3>Fast capture, connected records</h3>
                <p>
                  Quick commands support client and project administration, template workflows, task capture, status changes, and operational notifications. The desktop launcher provides the deeper management and reporting layer.
                </p>
                <p>
                  Capturing a task in Discord immediately returns a linked project-pipeline record, keeping fast input connected to a structured workflow.
                </p>
              </div>
              <CaseFigure
                src="discord-task-capture.webp"
                alt="Discord PersonalVABot commands showing a captured task and a direct link to the new task forum post."
                caption="A quick Discord capture creates and links a structured task record in the project pipeline."
              />
            </div>
          </section>

          <section className="case-section case-decisions-section">
            <div className="case-section-heading">
              <p className="eyebrow">Product decisions</p>
              <h2>The strongest features came from rules—not just screens.</h2>
            </div>

            <div className="case-decision-grid">
              {decisions.map((decision, index) => (
                <article key={decision.title} className="case-decision-card">
                  <span>0{index + 1}</span>
                  <h3>{decision.title}</h3>
                  <p>{decision.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="case-section case-validation-section">
            <div className="case-section-heading">
              <p className="eyebrow">Testing and validation</p>
              <h2>Validated through complete operational scenarios.</h2>
            </div>

            <div className="case-validation-grid">
              <ul className="case-check-list">
                {validationItems.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="case-result-grid" aria-label="Current beta results">
                <article><strong>72</strong><span>built-in VA templates</span></article>
                <article><strong>10+</strong><span>connected operational modules</span></article>
                <article><strong>2</strong><span>working interfaces: launcher and Discord</span></article>
                <article><strong>1</strong><span>installer-validated Windows beta</span></article>
              </div>
            </div>
          </section>

          <section className="case-section case-role-section">
            <div className="case-role-card">
              <div>
                <p className="eyebrow">My role</p>
                <h2>Creator, product director, workflow designer, and QA owner.</h2>
                <p>
                  I defined the product vision, workflow rules, feature priorities, interface structure, safety requirements, testing scenarios, release milestones, and final product decisions.
                </p>
                <p>
                  Development used an AI-assisted workflow. Product direction, requirements, workflow design, validation, and release decisions remained under my ownership.
                </p>
                <div className="tool-list" aria-label="PersonalVABot capabilities">
                  <span>Product direction</span>
                  <span>Workflow architecture</span>
                  <span>QA and edge-case testing</span>
                  <span>Release documentation</span>
                  <span>Windows packaging</span>
                </div>
              </div>

              <CaseFigure
                src="about.webp"
                alt="PersonalVABot About page showing product scope, creator credit for Mark Anton, AI-assisted development disclosure, and version 0.3.12."
                caption="The in-product About page documents ownership, scope, beta status, and the AI-assisted development approach."
              />
            </div>
          </section>

          <section className="case-cta">
            <p className="eyebrow">Next project</p>
            <h2>Built from operations experience—and designed to grow beyond Discord.</h2>
            <p>
              The longer-term roadmap includes role-based team workspaces, client approvals, workforce reporting, web access, and optional integrations while preserving the proven workflow foundation.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="https://github.com/markanton13/personalvabot" target="_blank" rel="noreferrer">View GitHub proof</a>
              <a className="button button-outline-light" href="https://github.com/markanton13/personalvabot/releases/tag/v0.3.12-beta" target="_blank" rel="noreferrer">Download Windows beta</a>
              <a className="button button-outline-light" href="/#contact">Contact Mark</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
