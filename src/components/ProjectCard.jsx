import { ExpandableImage } from './ExpandableImage'

export function ProjectCard({ project, index }) {
  const hasRealImage = Boolean(project.image)
  const caseStudyLabel = project.caseStudyLabel || (project.caseStudyUrl ? 'View case study' : 'Case study coming in Phase 2')

  return (
    <article className={`project-card project-card-${project.slug}`}>
      <div
        className={hasRealImage ? 'project-visual project-visual-real' : 'project-visual'}
        aria-hidden={hasRealImage ? undefined : true}
      >
        <span className="project-index">0{index + 1}</span>
        {hasRealImage ? (
          <ExpandableImage
            src={project.image}
            alt={project.imageAlt}
            loading={index === 0 ? 'eager' : 'lazy'}
            label={`Expand ${project.name} screenshot`}
          />
        ) : (
          <div className="visual-window">
            <div className="visual-topbar"><i /><i /><i /></div>
            <div className="visual-body">
              <div className="visual-sidebar" />
              <div className="visual-content">
                <span />
                <span />
                <span />
                <div className="visual-panels"><b /><b /><b /></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="project-content">
        <div className="project-heading">
          <div>
            <p className="eyebrow">{project.eyebrow}</p>
            <h3>{project.name}</h3>
          </div>
          <span className="status-pill">{project.status}</span>
        </div>
        <p className="project-summary">{project.summary}</p>
        <p className="project-outcome">{project.outcome}</p>
        <dl className="project-meta">
          <div><dt>My role</dt><dd>{project.role}</dd></div>
          <div><dt>Proof point</dt><dd>{project.metric}</dd></div>
        </dl>
        <div className="tool-list" aria-label={`${project.name} tools`}>
          {project.tools.map((tool) => <span key={tool}>{tool}</span>)}
        </div>
        {project.caseStudyUrl ? (
          <a className="text-link" href={project.caseStudyUrl} aria-label={`${caseStudyLabel} for ${project.name}`}>
            {caseStudyLabel} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="text-link text-link-static">
            {caseStudyLabel} <span aria-hidden="true">↗</span>
          </span>
        )}
      </div>
    </article>
  )
}
