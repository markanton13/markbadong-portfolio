import { clientStudioScope } from '../../data/markverseContent'

export function ClientStudioSection() {
  return (
    <section className="section client-studio-section" id="client-studio" aria-labelledby="client-studio-heading">
      <div className="markverse-section-heading">
        <p className="eyebrow">Client Studio · Independent work</p>
        <div>
          <h2 id="client-studio-heading">A responsive website, built for Childcare Culture &amp; Co.</h2>
          <p>A six-page GoHighLevel implementation using custom HTML/CSS, with responsive design, UX, and QA.</p>
        </div>
      </div>
      <article className="client-studio-banner">
        <div className="client-studio-identity">
          <span className="client-studio-sigil" aria-hidden="true">C<span>+</span></span>
          <p className="eyebrow">Website implementation</p>
        </div>
        <div className="client-studio-intro">
          <p className="client-studio-client">Childcare Culture &amp; Co.</p>
          <h3>{clientStudioScope.role}</h3>
          <div className="client-studio-tags"><span>GoHighLevel</span><span>Custom HTML/CSS</span><span>Responsive design · UX · QA</span></div>
          <p>{clientStudioScope.summary}</p>
          <p><a href={clientStudioScope.website} target="_blank" rel="noreferrer">Visit childcarecultureco.com <span aria-hidden="true">↗</span></a></p>
        </div>
      </article>
    </section>
  )
}
