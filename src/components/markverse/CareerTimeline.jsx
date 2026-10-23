import { markverseCareer } from '../../data/markverseContent'

export function CareerTimeline() {
  return (
    <section className="section markverse-career-section" id="career" aria-labelledby="career-heading">
      <div className="markverse-section-heading">
        <p className="eyebrow">Operations HQ · Career path</p>
        <div><h2 id="career-heading">A career built by understanding the work.</h2><p>Support, geospatial quality, process training, and a current leadership title form the foundation for the systems I build.</p></div>
      </div>
      <ol className="markverse-career-timeline">
        {markverseCareer.map((stage, index) => (
          <li key={stage.title} className={index === markverseCareer.length - 1 ? 'is-current' : ''}>
            <span className="career-marker" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div className="career-content"><span className="career-period">{stage.period}</span><h3>{stage.title}</h3><p className="career-organization">{stage.organization}</p><p>{stage.summary}</p></div>
          </li>
        ))}
      </ol>
      <p className="markverse-career-note">Training Lead is the current official title confirmed in October 2026. Its effective date and updated responsibilities have not been documented.</p>
    </section>
  )
}
