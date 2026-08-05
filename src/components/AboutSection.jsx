import { imageDimensions } from '../data/imageDimensions'

const portraitSrc = '/images/about/mark-anton.webp'
const portraitDimensions = imageDimensions[portraitSrc]

export function AboutSection() {
  return (
    <section id="about" className="section about-section about-section-v2">
      <div className="about-portrait-column">
        <figure className="about-portrait-card">
          <div className="about-portrait-frame">
            <img
              src={portraitSrc}
              width={portraitDimensions?.width}
              height={portraitDimensions?.height}
              alt="Mark Anton wearing a navy shirt against a warm neutral background."
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </div>
          <figcaption>
            <span>Mark Anton</span>
            <strong>Operations · Automation · Systems</strong>
          </figcaption>
        </figure>

        <div className="about-direction-card">
          <span>Current direction</span>
          <strong>Operations, workflow support, GoHighLevel, QA, automation, client websites, and short-form content.</strong>
        </div>
      </div>

      <div className="about-story-card">
        <p className="eyebrow">About Mark</p>
        <h2>A systems builder shaped by operations—not just code.</h2>

        <p className="about-lead">
          My path spans customer and technical support, geospatial data operations, quality assurance, enterprise process training, client website implementation, CRM automation, and short-form content production. That mix taught me to understand the real work, people, policies, and decisions behind every deliverable.
        </p>

        <p>
          Today, I translate scattered requirements and operational problems into clear SOPs, trackers, dashboards, automations, role-based workflows, responsive client experiences, and practical internal tools—while keeping testing, documentation, and final quality under my ownership.
        </p>

        <blockquote className="about-quote">
          “I like systems that make work calmer, clearer, and easier for the next person to continue.”
        </blockquote>

        <div className="about-principles" aria-label="How Mark approaches systems work">
          <article>
            <span>01</span>
            <h3>Understand the real workflow</h3>
            <p>Start with users, constraints, edge cases, and the way the work actually moves.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Make progress visible</h3>
            <p>Create clear states, ownership, records, and feedback so work does not disappear.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Leave a reliable handoff</h3>
            <p>Test carefully and document decisions so the system remains manageable after delivery.</p>
          </article>
        </div>

        <dl className="about-facts">
          <div>
            <dt>Based in</dt>
            <dd>Philippines</dd>
          </div>
          <div>
            <dt>Best fit</dt>
            <dd>Operations, CRM, QA, automation, and client-delivery roles</dd>
          </div>
          <div>
            <dt>Working style</dt>
            <dd>Structured, curious, documentation-first</dd>
          </div>
          <div>
            <dt>Outside work</dt>
            <dd>Anime, games, reading, and learning new tools</dd>
          </div>
        </dl>

        <div className="about-actions">
          <a
            className="button button-primary"
            href="/files/Mark-Anton-Badong-Resume.pdf"
            target="_blank"
            rel="noreferrer"
          >
            View résumé
          </a>
          <a className="button button-secondary" href="#contact">Start a conversation</a>
        </div>
      </div>
    </section>
  )
}
