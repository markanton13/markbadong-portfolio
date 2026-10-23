import { clientStudioScope } from '../../data/markverseContent'

export function ClientStudioSection() {
  return (
    <section className="section client-studio-section" id="client-studio" aria-labelledby="client-studio-heading">
      <div className="markverse-section-heading">
        <p className="eyebrow">Client Studio · Independent work</p>
        <div>
          <h2 id="client-studio-heading">A connected client experience, from website to workflow.</h2>
          <p>
            A practical GoHighLevel engagement across website development, CRM systems, automation,
            and technical QA. The summary separates delivered implementation, configuration,
            selected manual tests, and work that remained in draft or dependent on approval.
          </p>
        </div>
      </div>

      <article className="client-studio-banner">
        <div className="client-studio-identity">
          <span className="client-studio-sigil" aria-hidden="true">C<span>+</span></span>
          <p className="eyebrow">Independent client engagement</p>
        </div>
        <div className="client-studio-intro">
          <p className="client-studio-client">{clientStudioScope.client}</p>
          <h3>{clientStudioScope.role}</h3>
          <div className="client-studio-tags">
            <span>{clientStudioScope.engagement}</span>
            <span>{clientStudioScope.specialization}</span>
          </div>
          <p>{clientStudioScope.summary}</p>
        </div>
        <figure className="client-studio-map">
          <img
            src="/images/projects/ccc-digital-operations-map.svg"
            alt="Sanitized overview diagram connecting a public website, GoHighLevel CRM, program workflows, and human review. It contains no client records or private dashboard data."
            loading="lazy"
          />
          <figcaption>Sanitized workflow overview · conceptual map, not a client-system screenshot</figcaption>
        </figure>
      </article>

      <div className="client-studio-overview" aria-label="Engagement overview">
        {clientStudioScope.overview.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <details className="client-studio-details">
        <summary>
          <span>Detailed work summary</span>
          <small>Implementation, configuration, testing, drafts, and dependencies by workstream</small>
        </summary>
        <div className="client-studio-grid">
          {clientStudioScope.workstreams.map((item, index) => (
            <article key={item.title} className="client-workstream-card">
              <span className="client-workstream-index">0{index + 1}</span>
              <p>{item.contribution}</p>
              <h3>{item.title}</h3>
              <div>{item.status}</div>
              {item.detail && <small>{item.detail}</small>}
            </article>
          ))}
        </div>
      </details>

      <article className="luma-demo-card">
        <div>
          <span className="eyebrow">Separate portfolio demo</span>
          <h3>{clientStudioScope.separateDemo.name}</h3>
          <p>{clientStudioScope.separateDemo.summary}</p>
        </div>
        <span className="status-pill">{clientStudioScope.separateDemo.status}</span>
      </article>
      <p className="client-studio-disclosure">
        No private client records, internal screenshots, agreement terms, payment details, or unpublished campaign assets are included.
        CCC&amp;C is independent client work and is separate from the Luma Home Care demo.
      </p>
    </section>
  )
}
