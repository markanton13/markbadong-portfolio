import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { AboutSection } from './components/AboutSection'
import { ProjectCard } from './components/ProjectCard'
import { SectionHeading } from './components/SectionHeading'
import { Footer } from './components/Footer'
import { PageMeta } from './components/PageMeta'
import { NotFoundPage } from './pages/NotFoundPage'
import { PersonalVABotCaseStudy } from './pages/PersonalVABotCaseStudy'
import { MarkHQCaseStudy } from './pages/MarkHQCaseStudy'
import { LeaveFlowCaseStudy } from './pages/LeaveFlowCaseStudy'
import { ApplyLangCaseStudy } from './pages/ApplyLangCaseStudy'
import { featuredProjects, supportingProjects } from './data/projects'
import { capabilities } from './data/capabilities'
import './styles/site.css'

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


          <section id="contact" className="contact-section">
            <p className="eyebrow">Let’s work together</p>
            <h2>Need someone who can support the work—and improve the system behind it?</h2>
            <p>I’m building toward remote opportunities in virtual assistance, operations, CRM, automation, quality, and practical web systems.</p>
            <div className="hero-actions">
              <a className="button button-light" href="mailto:markantonbadong13@gmail.com">Email Mark</a>
              <a className="button button-outline-light" href="https://github.com/markanton13" target="_blank" rel="noreferrer">View GitHub</a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/projects/personalvabot') {
    return <PersonalVABotCaseStudy />
  }

  if (pathname === '/projects/markhq') {
    return <MarkHQCaseStudy />
  }
  if (pathname === '/projects/leaveflow') {
    return <LeaveFlowCaseStudy />
  }

  if (pathname === '/projects/applylang') {
    return <ApplyLangCaseStudy />
  }

  if (pathname === '/') {
    return <HomePage />
  }

  return <NotFoundPage />
}

export default App
