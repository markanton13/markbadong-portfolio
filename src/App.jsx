import { lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { AboutSection } from './components/AboutSection'
import { ProjectCard } from './components/ProjectCard'
import { SectionHeading } from './components/SectionHeading'
import { TestimonialsCarousel } from './components/TestimonialsCarousel'
import { Footer } from './components/Footer'
import { PageMeta } from './components/PageMeta'
import { featuredProjects, supportingProjects } from './data/projects'
import { capabilities } from './data/capabilities'
import './styles/site.css'

const PersonalVABotCaseStudy = lazy(() =>
  import('./pages/PersonalVABotCaseStudy').then((module) => ({
    default: module.PersonalVABotCaseStudy,
  })),
)

const MarkHQCaseStudy = lazy(() =>
  import('./pages/MarkHQCaseStudy').then((module) => ({
    default: module.MarkHQCaseStudy,
  })),
)

const LeaveFlowCaseStudy = lazy(() =>
  import('./pages/LeaveFlowCaseStudy').then((module) => ({
    default: module.LeaveFlowCaseStudy,
  })),
)

const ApplyLangCaseStudy = lazy(() =>
  import('./pages/ApplyLangCaseStudy').then((module) => ({
    default: module.ApplyLangCaseStudy,
  })),
)

const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

function HomePage() {
  return (
    <>
      <PageMeta pageKey="home" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell">
        <Header />
        <main id="main-content">
          <Hero />

          <section className="trust-strip" aria-label="Core strengths">
            <span>Workflow design</span>
            <span>Automation</span>
            <span>Web systems</span>
            <span>Quality assurance</span>
            <span>Training & SOPs</span>
          </section>

          <section id="work" className="section section-work">
            <SectionHeading
              eyebrow="Selected work"
              title="Systems designed around real work—not just screens."
              copy="My strongest projects combine operations thinking, practical technology, careful testing, and clear user flows."
            />
            <div className="projects-list">
              {featuredProjects.map((project, index) => (
                <ProjectCard key={project.slug} project={project} index={index} />
              ))}
            </div>
            <div className="supporting-work">
              <p className="eyebrow">Also in the portfolio</p>
              <div>{supportingProjects.map((project) => <span key={project}>{project}</span>)}</div>
            </div>
          </section>

          <section id="capabilities" className="section section-capabilities">
            <SectionHeading
              eyebrow="Capabilities"
              title="A versatile operator with technical depth."
              copy="I bridge day-to-day execution and systems improvement—so the work gets done while the process gets better."
            />
            <div className="capability-grid">
              {capabilities.map((capability) => (
                <article key={capability.number} className="capability-card">
                  <span>{capability.number}</span>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section process-section">
            <SectionHeading eyebrow="How I work" title="Clear thinking. Visible progress. Reliable handoff." />
            <ol className="process-list">
              <li><span>01</span><div><h3>Understand</h3><p>I map the real goal, users, constraints, and current workflow before changing anything.</p></div></li>
              <li><span>02</span><div><h3>Structure</h3><p>I turn scattered requirements into an organized plan, system, or repeatable operating flow.</p></div></li>
              <li><span>03</span><div><h3>Build & test</h3><p>I implement carefully, validate edge cases, and improve the experience across devices and roles.</p></div></li>
              <li><span>04</span><div><h3>Document</h3><p>I leave clear guidance, project records, and next steps so the work remains manageable.</p></div></li>
            </ol>
          </section>

          <AboutSection />

          <TestimonialsCarousel />


          <section id="contact" className="contact-section">
            <div className="contact-copy">
              <p className="eyebrow">Let’s work together</p>
              <h2>Need someone who can support the work—and improve the system behind it?</h2>
              <p>
                I’m open to remote opportunities in virtual assistance, operations, CRM,
                automation, quality assurance, and practical web systems.
              </p>

              <div className="contact-availability" aria-label="Location and availability">
                <span>Quezon City, Philippines</span>
                <span>Open to remote opportunities</span>
              </div>
            </div>

            <div className="contact-panel" aria-label="Professional contact options">
              <div className="contact-primary">
                <span>Primary email</span>
                <strong>markantonbadong@gmail.com</strong>
                <small>Best for job opportunities, project inquiries, and collaborations.</small>

                <div className="contact-email-actions">
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=markantonbadong@gmail.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Compose in Gmail <span aria-hidden="true">↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText('markantonbadong@gmail.com')
                      } catch {
                        window.prompt('Copy this email address:', 'markantonbadong@gmail.com')
                      }
                    }}
                  >
                    Copy address
                  </button>
                </div>
              </div>

              <div className="contact-direct-grid">
                <div className="contact-secondary">
                  <span>Alternate email</span>
                  <strong>markantonbadong13@gmail.com</strong>

                  <div className="contact-email-actions">
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=markantonbadong13@gmail.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Compose in Gmail <span aria-hidden="true">↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText('markantonbadong13@gmail.com')
                        } catch {
                          window.prompt('Copy this email address:', 'markantonbadong13@gmail.com')
                        }
                      }}
                    >
                      Copy address
                    </button>
                  </div>
                </div>

                <div className="contact-messaging">
                  <span>Messaging</span>
                  <strong>@markanton13</strong>
                  <small>WhatsApp · Telegram · Discord</small>
                  <a href="https://t.me/markanton13" target="_blank" rel="noreferrer">
                    Open Telegram <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div className="contact-link-grid">
                <a href="https://linkedin.com/in/markanton13" target="_blank" rel="noreferrer">
                  <span>LinkedIn</span>
                  <strong>Professional profile</strong>
                </a>

                <a href="https://github.com/markanton13" target="_blank" rel="noreferrer">
                  <span>GitHub</span>
                  <strong>Repositories and proof</strong>
                </a>

                <a href="/files/Mark-Anton-Badong-Resume.pdf" target="_blank" rel="noreferrer">
                  <span>Résumé</span>
                  <strong>View public résumé</strong>
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

function renderLazyPage(PageComponent) {
  return (
    <Suspense fallback={null}>
      <PageComponent />
    </Suspense>
  )
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/projects/personalvabot') {
    return renderLazyPage(PersonalVABotCaseStudy)
  }

  if (pathname === '/projects/markhq') {
    return renderLazyPage(MarkHQCaseStudy)
  }

  if (pathname === '/projects/leaveflow') {
    return renderLazyPage(LeaveFlowCaseStudy)
  }

  if (pathname === '/projects/applylang') {
    return renderLazyPage(ApplyLangCaseStudy)
  }

  if (pathname === '/') {
    return <HomePage />
  }

  return renderLazyPage(NotFoundPage)
}

export default App
