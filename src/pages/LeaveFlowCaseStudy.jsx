import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'
import { PageMeta } from '../components/PageMeta'

const imageBase = '/images/projects/leaveflow'

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
    title: 'Each role sees the work it needs',
    copy: 'Employees focus on requests and balances, managers review team leave, and administrators manage people, roles, and reporting relationships.',
  },
  {
    title: 'Statuses stay visible across views',
    copy: 'Pending, approved, rejected, and cancelled records remain traceable in dashboards, tables, and calendars instead of disappearing after an action.',
  },
  {
    title: 'Calendars provide shared context',
    copy: 'Leave records are not limited to a request table. Calendar visibility helps employees and managers understand timing and team availability.',
  },
  {
    title: 'Validation protects the workflow',
    copy: 'Request details, dates, roles, and lifecycle actions are checked before records are accepted or changed.',
  },
]

const validationItems = [
  'Authenticated employee, manager, and administrator accounts',
  'Submitted leave requests with type, date range, and reason',
  'Validated required fields and request-date behavior',
  'Reviewed pending requests from the manager experience',
  'Approved and rejected leave requests',
  'Confirmed status changes across dashboards and calendars',
  'Cancelled an employee request and retained its history',
  'Checked vacation and sick-leave balance visibility',
  'Created users and assigned manager relationships',
  'Tested responsive behavior on a mobile viewport',
]

export function LeaveFlowCaseStudy() {
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
      <PageMeta pageKey="leaveflow" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell case-study-shell">
        <Header mode="case-study" />

        <main id="main-content" className="case-study-main">
          <section className="case-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Role-based full-stack web application</p>
                <h1>LeaveFlow <em>Management System</em></h1>
                <p className="case-hero-intro">
                  A connected leave-management workflow for employee requests, manager decisions, balance visibility, shared calendars, and administrator-controlled user access.
                </p>
                <div className="case-tag-list" aria-label="Project highlights">
                  <span>React frontend</span>
                  <span>Node.js + Express API</span>
                  <span>MySQL data layer</span>
                  <span>Three role-based experiences</span>
                </div>
                <div className="hero-actions">
                  <a className="button button-primary" href="#case-overview">Explore the case study</a>
                  <a className="button button-secondary" href="#leaveflow-demo">Watch the demo</a>
                  <a className="button button-secondary" href="https://github.com/markanton13/leaveflow" target="_blank" rel="noreferrer">View GitHub proof</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Full-stack portfolio application</strong></div>
                <div><span>My role</span><strong>System design, development & QA</strong></div>
                <div><span>Status</span><strong>Functional application</strong></div>
                <div><span>Primary workflow</span><strong>Request → review → decision</strong></div>
              </aside>
            </div>

            <CaseFigure
              className="case-hero-figure"
              src="employee-dashboard.webp"
              alt="LeaveFlow employee dashboard showing request status summaries, leave balances, and a leave request form."
              caption="The employee dashboard combines current request status, available leave balances, and a structured submission form."
              eager
            />
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>A manual approval process rebuilt as one connected system.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  LeaveFlow replaces scattered messages and spreadsheet tracking with a structured application shared by employees, managers, and administrators.
                </p>
                <p>
                  Employees can submit requests and monitor balances, managers can review team leave and record decisions, and administrators can manage accounts, roles, and reporting relationships. The same records remain visible across dashboards, request history, and calendar views.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Users</dt><dd>Employees, managers, and administrators</dd></div>
                <div><dt>Frontend</dt><dd>React interface with responsive role-based views</dd></div>
                <div><dt>Backend</dt><dd>Node.js and Express API with validated requests</dd></div>
                <div><dt>Data</dt><dd>MySQL records for users, requests, balances, and relationships</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The problem</p>
              <h2>Leave requests become hard to track when every role uses a different process.</h2>
              <p>
                Employees need clarity on balances and status, managers need an organized review queue, and administrators need control over access and reporting relationships. Manual handling makes those views inconsistent and difficult to audit.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The solution</p>
              <h2>One workflow with role-specific interfaces and shared records.</h2>
              <p>
                LeaveFlow keeps submission, review, decisions, balances, calendars, and user administration connected through the same application and database.
              </p>
            </article>
          </section>

          <section id="leaveflow-demo" className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">End-to-end proof</p>
              <h2>See the employee and manager workflow in action.</h2>
            </div>

            <figure className="case-video-card">
              <video
                controls
                playsInline
                preload="metadata"
                poster={`${imageBase}/employee-dashboard.webp`}
                aria-label="LeaveFlow application demo"
                aria-describedby="leaveflow-demo-description"
              >
                <source src={`${imageBase}/demo.mp4`} type="video/mp4" />
                Your browser does not support the embedded video.
              </video>
              <p id="leaveflow-demo-description" className="case-video-description">
                This portfolio demo is designed to be understandable as a silent visual walkthrough. The complete text alternative below covers the workflow shown on screen.
              </p>
              <details className="case-video-transcript">
                <summary>Read the demo text alternative</summary>
                <ol>
                  <li>Sign in and open the employee dashboard.</li>
                  <li>Review request-status summaries and available vacation and sick-leave balances.</li>
                  <li>Complete the leave request form with a leave type, date range, and reason.</li>
                  <li>Review the submitted request in history and calendar views.</li>
                  <li>Open the manager queue, inspect the request, and record an approval or rejection decision.</li>
                  <li>Confirm the updated status remains visible to the employee across the connected views.</li>
                  <li>Open administrator controls for users, roles, and manager relationships.</li>
                </ol>
              </details>
              <figcaption>
                The recorded demo moves through login, employee balances, leave submission, request history, manager review, decision controls, calendar updates, and user administration.
              </figcaption>
            </figure>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Employee experience</p>
              <h2>Requests, balances, and history remain understandable from one place.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">01</span>
                <h3>Structured leave submission</h3>
                <p>
                  Employees can choose a leave type, set a date range, provide a reason, and submit the request through a focused form. Summary cards keep pending, approved, rejected, and cancelled counts visible alongside vacation and sick-leave balances.
                </p>
                <ul className="case-bullet-list">
                  <li>Leave-type and date selection</li>
                  <li>Reason and validation controls</li>
                  <li>Balance visibility</li>
                  <li>Clear request-status summaries</li>
                </ul>
              </div>
              <CaseFigure
                src="employee-dashboard.webp"
                alt="Employee dashboard with pending, approved, rejected, and cancelled summaries, leave balances, and request form."
                caption="The submission form sits beside the information an employee needs before requesting time off."
              />
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">02</span>
                <h3>Calendar and request history</h3>
                <p>
                  Employees can review leave dates visually and inspect the status of past requests, including manager comments and cancellation state. The calendar turns individual records into a timeline that is easier to understand at a glance.
                </p>
              </div>
              <CaseFigure
                src="employee-calendar.webp"
                alt="LeaveFlow employee calendar and request history showing dated leave records, statuses, comments, and cancellation controls."
                caption="Calendar and table views keep the complete request history visible after submission."
              />
            </div>
          </section>

          <section className="case-section case-local-section">
            <div className="case-section-heading">
              <p className="eyebrow">Manager experience</p>
              <h2>Review decisions stay connected to team availability.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">03</span>
                <h3>A focused approval queue</h3>
                <p>
                  Managers can inspect employee, leave type, requested dates, duration, reason, and current status before approving or rejecting a request. The interface keeps decision actions close to the context needed to make them.
                </p>
                <ul className="case-bullet-list">
                  <li>Team request filtering</li>
                  <li>Approve and reject actions</li>
                  <li>Request detail visibility</li>
                  <li>Status updates shared across roles</li>
                </ul>
              </div>
              <CaseFigure
                src="manager-review.webp"
                alt="Manager request table showing employee leave requests, dates, reasons, status, and approval or rejection controls."
                caption="The manager table turns pending requests into a clear and actionable review queue."
              />
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">04</span>
                <h3>Team leave on a shared calendar</h3>
                <p>
                  Managers can switch from individual request records to a calendar view that shows approved and pending leave across the team. This adds scheduling context to the approval process.
                </p>
              </div>
              <CaseFigure
                src="manager-calendar.webp"
                alt="Manager calendar showing team leave records and status information across dates."
                caption="The shared calendar helps managers review requests with team timing and availability in mind."
              />
            </div>
          </section>

          <section className="case-section">
            <div className="case-section-heading">
              <p className="eyebrow">Administrator controls</p>
              <h2>User access and reporting structure are managed inside the product.</h2>
            </div>

            <div className="case-feature">
              <div className="case-feature-copy">
                <span className="case-number">05</span>
                <h3>People, roles, and manager assignment</h3>
                <p>
                  Administrators can create user accounts, assign employee or manager roles, connect employees to their managers, and enable or disable access. These relationships determine which records each role can see and manage.
                </p>
              </div>
              <CaseFigure
                src="user-management.webp"
                alt="LeaveFlow administrator user-management screen with account creation, roles, manager assignment, and enable or disable controls."
                caption="Administrative controls keep access and reporting relationships tied to the same operational system."
              />
            </div>

            <div className="case-gallery case-gallery-two">
              <CaseFigure
                src="login.webp"
                alt="LeaveFlow sign-in screen with email and password fields."
                caption="Authentication provides the entry point for each role-specific experience."
              />
              <CaseFigure
                className="leaveflow-mobile-figure"
                src="mobile.webp"
                alt="LeaveFlow mobile employee dashboard showing responsive navigation, status cards, and leave balances."
                caption="The employee dashboard adapts to a narrow mobile viewport without losing the core workflow."
              />
            </div>
          </section>

          <section className="case-section case-architecture-section">
            <div className="case-section-heading">
              <p className="eyebrow">System structure</p>
              <h2>Frontend, API, and database responsibilities stay clearly separated.</h2>
            </div>

            <div className="case-architecture-grid">
              <article>
                <span>01</span>
                <h3>React frontend</h3>
                <p>Role-aware dashboards, forms, tables, calendars, responsive layouts, and visible request states.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Express API</h3>
                <p>Authentication, request validation, lifecycle actions, role checks, and application business rules.</p>
              </article>
              <article>
                <span>03</span>
                <h3>MySQL database</h3>
                <p>Persistent users, manager relationships, leave requests, balances, comments, and status history.</p>
              </article>
            </div>

            <div className="tool-list case-stack-list" aria-label="LeaveFlow technology stack">
              <span>React</span>
              <span>Node.js</span>
              <span>Express</span>
              <span>MySQL</span>
              <span>JWT authentication</span>
              <span>FullCalendar</span>
              <span>Zod validation</span>
            </div>
          </section>

          <section className="case-section case-decisions-section">
            <div className="case-section-heading">
              <p className="eyebrow">Product decisions</p>
              <h2>The workflow is defined by permissions, visibility, and state.</h2>
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
              <h2>Validated as a connected workflow—not a collection of static screens.</h2>
            </div>

            <div className="case-validation-grid">
              <ul className="case-check-list">
                {validationItems.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="case-result-grid" aria-label="LeaveFlow project results">
                <article><strong>3</strong><span>role-based experiences</span></article>
                <article><strong>4</strong><span>visible request lifecycle states</span></article>
                <article><strong>2</strong><span>calendar perspectives: employee and manager</span></article>
                <article><strong>1</strong><span>connected end-to-end workflow</span></article>
              </div>
            </div>
          </section>

          <section className="case-section case-role-section">
            <div className="case-role-card">
              <div>
                <p className="eyebrow">My role</p>
                <h2>System designer, full-stack developer, and workflow tester.</h2>
                <p>
                  I designed the role model, request lifecycle, balance visibility, calendar experiences, manager-review flow, administrator controls, frontend structure, backend routes, data relationships, and validation behavior.
                </p>
                <p>
                  I also tested the application across employee, manager, and administrator scenarios to confirm that actions remained synchronized across dashboards, tables, and calendars.
                </p>
                <div className="tool-list" aria-label="LeaveFlow responsibilities">
                  <span>System design</span>
                  <span>React frontend</span>
                  <span>Express backend</span>
                  <span>MySQL workflows</span>
                  <span>Role-based access</span>
                  <span>Responsive QA</span>
                </div>
              </div>

              <CaseFigure
                src="employee-calendar.webp"
                alt="LeaveFlow employee calendar and request history interface."
                caption="The final workflow keeps request history, decision status, comments, and calendar context accessible to the user."
              />
            </div>
          </section>

          <section className="case-cta">
            <p className="eyebrow">Full-stack proof</p>
            <h2>A role-based workflow built from interface to database.</h2>
            <p>
              LeaveFlow demonstrates how clear permissions, validated actions, shared records, and responsive views can replace an inconsistent manual process with a dependable web application.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="https://github.com/markanton13/leaveflow" target="_blank" rel="noreferrer">View GitHub proof</a>
              <a className="button button-outline-light" href="/#work">View more projects</a>
              <a className="button button-outline-light" href="mailto:markantonbadong@gmail.com">Contact Mark</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
