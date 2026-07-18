import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'

const imageBase = '/images/projects/markhq'

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
    title: 'Private workspaces require approval',
    copy: 'Community access remains open, while private productivity workspaces are provisioned through a visible request and administrator approval flow.',
  },
  {
    title: 'System guides stay separate from personal notes',
    copy: 'Bot-managed handbooks can refresh safely without rewriting the user’s own planning, reference, meeting, or decision records.',
  },
  {
    title: 'Archive before permanent deletion',
    copy: 'Completed work remains recoverable and auditable. Permanent deletion is exposed as a separate, deliberate action.',
  },
  {
    title: 'Operational health must be visible',
    copy: 'Runtime, database integrity, backups, permissions, endpoints, and deployment readiness are surfaced through explicit diagnostic commands.',
  },
]

const validationItems = [
  'Captured tasks into workspace-specific project pipelines',
  'Started, paused, resumed, completed, archived, and reopened tasks',
  'Validated persistent SQLite task and workspace records',
  'Synced current-focus dashboards and system-managed guides',
  'Tested workspace rename behavior with preserved task history',
  'Verified request-center ticket and approval workflows',
  'Ran repository safety, smoke, lint, and production build checks',
  'Validated automated backup creation and health reporting',
  'Confirmed Railway deployment, readiness, and health endpoints',
  'Tested onboarding and workspace guidance in live Discord channels',
]

export function MarkHQCaseStudy() {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content')

    document.title = 'MarkHQ Assistant Case Study | Mark Anton'
    description?.setAttribute(
      'content',
      'A case study of MarkHQ Assistant, a Railway-hosted Discord operations system for task pipelines, workspaces, onboarding, requests, documentation, automation, backups, and deployment health.',
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
          <section className="case-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Production Discord operations system</p>
                <h1>MarkHQ <em>Assistant</em></h1>
                <p className="case-hero-intro">
                  A Railway-hosted workspace system that turns Discord into a structured operating environment for tasks, private workspaces, onboarding, requests, documentation, reminders, and production health.
                </p>
                <div className="case-tag-list" aria-label="Project highlights">
                  <span>Railway production hosting</span>
                  <span>Persistent SQLite data</span>
                  <span>Multi-workspace operations</span>
                  <span>Automated backups</span>
                </div>
                <div className="hero-actions">
                  <a className="button button-primary" href="#case-overview">Explore the case study</a>
                  <a className="button button-secondary" href="/#contact">Discuss similar work</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Personal production system</strong></div>
                <div><span>My role</span><strong>Creator & product director</strong></div>
                <div><span>Status</span><strong>Live production deployment</strong></div>
                <div><span>Primary platform</span><strong>Discord + Railway</strong></div>
              </aside>
            </div>

            <CaseFigure
              className="case-hero-figure"
              src="guided-onboarding.webp"
              alt="MarkHQ Discord welcome channel showing guided onboarding, private workspace information, community navigation, and action buttons."
              caption="The guided entry point explains how the community, private workspaces, support channels, and operating guides fit together."
              eager
            />
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>Discord became the interface for a complete personal operations system.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  MarkHQ began as a personal productivity workspace and evolved into a hosted assistant that manages structured work across community channels and separate private workspaces.
                </p>
                <p>
                  The system handles task capture, project pipelines, time tracking, current-work dashboards, notes, onboarding, access requests, recurring work, reminders, documentation, backups, and reliability checks. The goal was not simply to add commands to Discord, but to create consistent operating rules around everyday work.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Core users</dt><dd>Workspace owner, collaborators, viewers, and approved workspace members</dd></div>
                <div><dt>Primary interface</dt><dd>Discord channels, forum posts, buttons, modals, and slash commands</dd></div>
                <div><dt>Runtime</dt><dd>Node.js application hosted continuously on Railway</dd></div>
                <div><dt>Data model</dt><dd>Persistent SQLite records with automated backup and recovery safeguards</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The problem</p>
              <h2>Flexible Discord servers can become difficult to operate consistently.</h2>
              <p>
                Tasks disappear in chat, channels lack shared rules, private workspaces require manual setup, documentation becomes outdated, and operational health is invisible until something fails.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The solution</p>
              <h2>A bot-managed operating layer with visible workflows and safeguards.</h2>
              <p>
                MarkHQ Assistant connects tasks, workspaces, permissions, guides, reminders, requests, database records, and deployment checks through one structured Discord experience.
              </p>
            </article>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Task operations</p>
              <h2>Capture quickly, then manage the complete lifecycle.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">01</span>
                <h3>Structured capture with project context</h3>
                <p>
                  A task can be captured with a title, workspace, project, priority, due date, and next action. The assistant saves it to the persistent database and returns a direct link to the generated project-pipeline post.
                </p>
                <ul className="case-bullet-list">
                  <li>Workspace and project association</li>
                  <li>Due-date and priority capture</li>
                  <li>Persistent database storage</li>
                  <li>Direct task-thread navigation</li>
                </ul>
              </div>
              <CaseFigure
                src="task-capture.webp"
                alt="MarkHQ Discord inbox showing a project added and a task captured with workspace, project, priority, due date, database confirmation, and a linked task post."
                caption="A captured task is saved permanently and linked to its dedicated project-pipeline record."
              />
            </div>

            <div className="case-gallery case-gallery-two">
              <CaseFigure
                src="active-task.webp"
                alt="Active MarkHQ task showing a running timer, tracked sessions, next action, task metadata, and lifecycle buttons for pause, block, review, edit, and complete."
                caption="Active tasks expose time tracking, next actions, metadata, and controlled lifecycle changes."
              />
              <CaseFigure
                src="archived-task.webp"
                alt="Completed and archived MarkHQ task showing total tracked time, session count, completion date, reopen action, and permanent delete control."
                caption="Completed work stays recoverable through an archive-first lifecycle with a direct reopen action."
              />
            </div>
          </section>

          <section className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Access and support</p>
              <h2>Requests become private, categorized, and actionable.</h2>
            </div>

            <div className="case-feature case-feature-dark">
              <div className="case-feature-copy">
                <span className="case-number">02</span>
                <h3>A request center for workspace operations</h3>
                <p>
                  Members can request a private workspace, report a bug, raise an access issue, ask for support, submit a collaboration inquiry, or request ApplyLang setup from a single guided panel.
                </p>
                <p>
                  Each request creates a private ticket visible only to the requester, administrators, and the bot, keeping operational support separate from normal workspace activity.
                </p>
              </div>
              <CaseFigure
                src="request-center.webp"
                alt="MarkHQ request center showing buttons for personal workspace, support, bug, access, collaboration, and ApplyLang setup requests."
                caption="The request center standardizes support and approval flows without exposing private concerns in public channels."
              />
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Workspace management</p>
              <h2>Configuration changes preserve the work already inside the system.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">03</span>
                <h3>Safe workspace rename and refresh behavior</h3>
                <p>
                  Workspace customization is treated as an operational migration rather than a cosmetic label change. Tasks, members, permissions, timers, reports, reminders, recurring work, and history remain preserved while the workspace name is updated.
                </p>
                <p>
                  The command also reports non-blocking refresh conditions so an administrator knows when a guide or access role needs a follow-up sync.
                </p>
              </div>
              <CaseFigure
                src="workspace-rename.webp"
                alt="MarkHQ workspace rename result showing the previous and new workspace names, category update, preserved records, and a non-blocking refresh notice."
                caption="Rename operations preserve workspace records and surface follow-up conditions instead of hiding them."
              />
            </div>
          </section>

          <section className="case-section case-local-section">
            <div className="case-section-heading">
              <p className="eyebrow">Production reliability</p>
              <h2>Health, backups, and deployment readiness are visible from inside Discord.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">04</span>
                <h3>Operational diagnostics for a hosted bot</h3>
                <p>
                  Health commands report Discord connectivity, uptime, memory, database integrity, permissions, timezone, maintenance mode, automatic backups, log sizes, hosting mode, readiness, and public health endpoints.
                </p>
                <p>
                  This gives administrators a fast way to distinguish a Discord issue, storage problem, permission failure, or deployment problem before changing production configuration.
                </p>
              </div>
              <CaseFigure
                src="health-preflight.webp"
                alt="MarkHQ system health and deployment preflight results showing runtime, database integrity, permissions, backups, Railway hosting, region, volume, and health endpoints."
                caption="System health and deployment preflight commands expose the production state without requiring shell access."
              />
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">05</span>
                <h3>Continuous Railway deployment</h3>
                <p>
                  The production service starts from the connected repository, mounts persistent storage, registers the workspace, refreshes task cards, syncs dashboards and references, starts schedulers, and marks deployment readiness healthy.
                </p>
                <p>
                  Deployment logs also provide a traceable startup sequence for troubleshooting releases and validating that every production subsystem returned online.
                </p>
              </div>
              <CaseFigure
                src="railway-production.webp"
                alt="Railway production deployment showing the MarkHQ service online and startup logs for workspace registration, task refresh, guide sync, schedulers, backups, and deployment readiness."
                caption="The hosted service reports each startup and synchronization step before marking production readiness healthy."
              />
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Documentation system</p>
              <h2>Guides stay current without rewriting personal records.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">06</span>
                <h3>A system-managed workspace handbook</h3>
                <p>
                  The assistant maintains official reference posts for workspace channels, access levels, help routes, task commands, and operating expectations. These guides can refresh automatically as the system evolves.
                </p>
                <p>
                  Personal notes remain separate from system-managed references, protecting the user’s planning and historical records from documentation sync changes.
                </p>
              </div>
              <CaseFigure
                src="workspace-handbook.webp"
                alt="MarkHQ workspace handbook showing channel descriptions, access levels, help routes, and command guidance in a system-managed reference post."
                caption="The workspace handbook provides a stable source of truth for navigation, permissions, commands, and support."
              />
            </div>
          </section>

          <section className="case-section case-decisions-section">
            <div className="case-section-heading">
              <p className="eyebrow">Product decisions</p>
              <h2>The system is held together by operating rules—not just commands.</h2>
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
              <h2>Production changes were verified across code, data, Discord, and hosting.</h2>
            </div>

            <div className="case-validation-grid">
              <ul className="case-check-list">
                {validationItems.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="case-result-grid" aria-label="Production snapshot results">
                <article><strong>3</strong><span>active workspaces in the captured health snapshot</span></article>
                <article><strong>30</strong><span>task cards refreshed during the captured deployment</span></article>
                <article><strong>9/9</strong><span>official note references synchronized</span></article>
                <article><strong>24/7</strong><span>Railway-hosted production availability target</span></article>
              </div>
            </div>
          </section>

          <section className="case-section case-role-section">
            <div className="case-role-card">
              <div>
                <p className="eyebrow">My role</p>
                <h2>Creator, product director, workflow architect, and QA owner.</h2>
                <p>
                  I defined the workspace model, task lifecycle, request categories, onboarding structure, documentation rules, permission-sensitive actions, reliability requirements, test scenarios, and release priorities.
                </p>
                <p>
                  Development used an AI-assisted workflow. Product vision, architecture decisions, workflow design, QA direction, deployment validation, documentation, and final release decisions remained under my ownership.
                </p>
                <div className="tool-list" aria-label="MarkHQ capabilities">
                  <span>Product direction</span>
                  <span>Discord workflow design</span>
                  <span>Node.js operations</span>
                  <span>QA and smoke testing</span>
                  <span>Railway deployment</span>
                  <span>Release documentation</span>
                </div>
              </div>

              <CaseFigure
                src="workspace-handbook.webp"
                alt="MarkHQ system-managed handbook and reference posts inside the private workspace."
                caption="The live workspace reflects the same documentation-first operating model used throughout development and release management."
              />
            </div>
          </section>

          <section className="case-cta">
            <p className="eyebrow">Production proof</p>
            <h2>A Discord workspace designed like an operating system—not a collection of channels.</h2>
            <p>
              MarkHQ demonstrates how structured workflows, clear permissions, persistent records, guided onboarding, automation, and visible reliability can turn a familiar collaboration tool into a dependable operations environment.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="/#work">View more projects</a>
              <a className="button button-outline-light" href="mailto:markantonbadong13@gmail.com">Contact Mark</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
