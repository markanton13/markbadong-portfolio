import { useEffect } from 'react'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { ExpandableImage } from '../components/ExpandableImage'
import { PageMeta } from '../components/PageMeta'

const imageBase = '/images/projects/short-form-video'
const videoBase = '/videos/short-form-video'

function CaseFigure({ src, alt, caption, eager = false }) {
  return (
    <figure className="case-figure short-form-hero-figure">
      <ExpandableImage
        src={`${imageBase}/${src}`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
      />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function VideoReel({ id, number, title, duration, source, poster, summary, featured = false }) {
  return (
    <article className={`short-form-reel-card${featured ? ' is-featured' : ''}`}>
      <div className="short-form-reel-heading">
        <span>{number}</span>
        <div>
          <p>{duration}</p>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="short-form-video-frame">
        <video
          controls
          playsInline
          preload={featured ? 'metadata' : 'none'}
          poster={`${imageBase}/${poster}`}
          aria-describedby={`${id}-summary`}
        >
          <source src={`${videoBase}/${source}`} type="video/mp4" />
          Your browser does not support the embedded video.
        </video>
      </div>

      <details className="short-form-reel-summary">
        <summary>Read the reel summary</summary>
        <p id={`${id}-summary`}>{summary}</p>
      </details>
    </article>
  )
}

const workflowSteps = [
  {
    title: 'Interpret the brief',
    copy: 'Identify the hook, emotional direction, audience, required lines, visual rhythm, and closing action before opening the timeline.',
  },
  {
    title: 'Build the visual sequence',
    copy: 'Select or generate vertical footage that supports each line while keeping the subject, setting, wardrobe, and campaign tone visually consistent.',
  },
  {
    title: 'Edit for mobile attention',
    copy: 'Tighten clip timing, synchronize voiceover, style readable captions, highlight key words, add music, and preserve safe spacing for the Reels interface.',
  },
  {
    title: 'Review and deliver',
    copy: 'Check pacing, spelling, audio balance, transitions, frame accuracy, export quality, and stakeholder feedback before final delivery.',
  },
]

const validationItems = [
  'Original delivery format: 1080 × 1920 vertical video at 30 FPS',
  'Web playback copies optimized to browser-compatible H.264 MP4',
  'Readable captions and highlighted phrases designed for mobile viewing',
  'Voiceover, visual changes, music, and final calls to action synchronized',
  'Consistent campaign subject and visual tone across all three reels',
  'Approved deliverables presented with generalized client attribution',
]

export function ShortFormVideoCaseStudy() {
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
      <PageMeta pageKey="shortFormVideo" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div id="top" className="page-shell case-study-shell">
        <Header mode="case-study" />

        <main id="main-content" className="case-study-main">
          <section className="case-hero short-form-case-hero">
            <div className="case-hero-grid">
              <div>
                <a className="case-back-link" href="/#work">← Back to selected work</a>
                <p className="eyebrow">Approved client campaign work</p>
                <h1>Short-form <em>video editing</em></h1>
                <p className="case-hero-intro">
                  Three vertical promotional reels developed from concise creative directions into polished social videos with AI-assisted visuals, voiceover timing, captions, music, pacing, and clear final calls to action.
                </p>
                <div className="case-tag-list" aria-label="Project highlights">
                  <span>3 approved reels</span>
                  <span>Instagram Reels</span>
                  <span>1080 × 1920 originals</span>
                  <span>CapCut Pro + AI workflow</span>
                </div>
                <div className="hero-actions">
                  <a className="button button-primary" href="#reels">Watch the reels</a>
                  <a className="button button-secondary" href="#workflow">View the workflow</a>
                  <a className="button button-secondary" href="/#contact">Discuss video work</a>
                </div>
              </div>

              <aside className="case-hero-meta" aria-label="Project details">
                <div><span>Project type</span><strong>Three-reel promotional campaign</strong></div>
                <div><span>My role</span><strong>Video editor and AI-assisted visual producer</strong></div>
                <div><span>Status</span><strong>All three reels approved</strong></div>
                <div><span>Attribution</span><strong>Childcare industry client · generalized</strong></div>
              </aside>
            </div>

            <CaseFigure
              src="short-form-video-overview.webp"
              alt="Short-form video editing portfolio overview showing three vertical promotional reels and campaign delivery details."
              caption="Three approved campaign reels demonstrating direct-response pacing, brand storytelling, and longer mission-led social content."
              eager
            />
          </section>

          <section id="case-overview" className="case-section case-overview">
            <div className="case-section-heading">
              <p className="eyebrow">Project overview</p>
              <h2>Turning a written direction into a complete mobile-first campaign sequence.</h2>
            </div>

            <div className="case-overview-grid">
              <div className="case-copy">
                <p className="case-lead">
                  Each reel began with a short campaign concept rather than a finished storyboard, shot list, or supplied edit timeline.
                </p>
                <p>
                  I translated the messaging into a scene sequence, coordinated AI-assisted visual generation, synchronized the selected footage with voiceover, created caption hierarchy, emphasized key phrases, selected music, tightened pacing, and revised the final cuts based on stakeholder feedback.
                </p>
                <p>
                  The client name is intentionally omitted from the written case study. The work is positioned as a childcare-industry promotional campaign while preserving the actual approved deliverables.
                </p>
              </div>

              <dl className="case-facts">
                <div><dt>Deliverables</dt><dd>3 vertical social reels</dd></div>
                <div><dt>Durations</dt><dd>14.7, 17.8, and 33.3 seconds</dd></div>
                <div><dt>Original format</dt><dd>1080 × 1920 · 30 FPS</dd></div>
                <div><dt>Primary editor</dt><dd>CapCut Pro</dd></div>
              </dl>
            </div>
          </section>

          <section className="case-section case-dual-section">
            <article className="case-panel case-panel-problem">
              <p className="eyebrow">The challenge</p>
              <h2>Make AI-assisted footage feel like one intentional campaign—not disconnected generated clips.</h2>
              <p>
                The reels needed consistent character styling, believable business environments, readable messaging, strong pacing, and a polished campaign tone despite being assembled from multiple generated and curated visual sources.
              </p>
            </article>

            <article className="case-panel case-panel-solution">
              <p className="eyebrow">The approach</p>
              <h2>Use the message as the edit spine, then make every visual and sound decision support it.</h2>
              <p>
                I treated the spoken script as the structural timeline, matched each line with the clearest visual beat, controlled caption emphasis, balanced music beneath the voiceover, and built momentum toward the final question or call to action.
              </p>
            </article>
          </section>

          <section id="reels" className="case-section case-section-dark short-form-reels-section">
            <div className="case-section-heading">
              <p className="eyebrow">Approved deliverables</p>
              <h2>Three reels with different pacing goals inside one campaign world.</h2>
            </div>

            <div className="short-form-reel-grid">
              <VideoReel
                id="sponsor-reel"
                number="01"
                title="Sponsor-focused promotional reel"
                duration="14.7 seconds"
                source="sponsor-promotional-reel.mp4"
                poster="sponsor-promotional-reel.webp"
                summary="A direct-response reel built around an owner’s investment mindset. Short statements escalate from uncertainty to action, then resolve with the closing question: will they spend it with you?"
                featured
              />
              <VideoReel
                id="storytelling-reel"
                number="02"
                title="Defining-moment brand story"
                duration="17.8 seconds"
                source="brand-storytelling-reel.mp4"
                poster="brand-storytelling-reel.webp"
                summary="A concise brand-storytelling reel moving from industry change to relationships, partnerships, trusted solutions, and a final invitation for companies to take part."
              />
              <VideoReel
                id="mission-reel"
                number="03"
                title="Mission-driven campaign reel"
                duration="33.3 seconds"
                source="mission-driven-reel.mp4"
                poster="mission-driven-reel.webp"
                summary="A longer mission-led reel contrasting ordinary exhibitors with innovators and visionaries who value conversations, relationships, and impact over transactions, leads, and impressions."
              />
            </div>
          </section>

          <section id="workflow" className="case-section short-form-workflow-section">
            <div className="case-section-heading">
              <p className="eyebrow">Editing workflow</p>
              <h2>A repeatable process from creative direction to approved vertical delivery.</h2>
            </div>

            <div className="short-form-workflow-grid">
              {workflowSteps.map((step, index) => (
                <article key={step.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="validation" className="case-section case-section-dark">
            <div className="case-section-heading">
              <p className="eyebrow">Delivery quality</p>
              <h2>Completion included technical, visual, and message-level checks.</h2>
            </div>

            <ul className="case-check-list">
              {validationItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="case-section">
            <div className="case-role-card">
              <div>
                <p className="eyebrow">My contribution</p>
                <h2>Creative interpretation, visual sequencing, editing, caption design, audio timing, revisions, and final delivery.</h2>
              </div>
              <div>
                <p>
                  I handled the edit from brief interpretation through final export: arranging footage, refining timing, synchronizing voiceover, styling captions, emphasizing selected words, choosing and balancing music, checking mobile readability, and applying feedback until approval.
                </p>
                <div className="tool-list" aria-label="Project tools">
                  <span>CapCut Pro</span>
                  <span>Google Flow</span>
                  <span>ElevenLabs</span>
                  <span>Canva</span>
                  <span>AI-assisted visuals</span>
                  <span>Responsive caption QA</span>
                </div>
              </div>
            </div>
          </section>

          <section className="case-cta">
            <p className="eyebrow">Need vertical content?</p>
            <h2>I can turn a clear campaign direction into polished short-form social video.</h2>
            <p>
              This project demonstrates hands-on editing, message interpretation, AI-assisted visual production, stakeholder revisions, and dependable final delivery.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="/#contact">Contact Mark</a>
              <a className="button button-outline-light" href="/#work">View more work</a>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
