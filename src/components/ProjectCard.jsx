import { ExpandableImage } from './ExpandableImage'
import { requestAskMarkOpen } from './assistant/askMarkEvents'
import { markverseProjectStatus } from '../data/markverseContent'

function ProjectLink({ href, label, projectName, external = false, onClick }) {
  return (
    <a
      className="text-link"
      href={href}
      aria-label={`${label} for ${projectName}`}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {label} <span aria-hidden="true">↗</span>
    </a>
  )
}

export function ProjectCard({ project, index }) {
  const hasRealImage = Boolean(project.image)
  const status = markverseProjectStatus[project.slug]?.status || project.status
  const caseStudyLabel = project.caseStudyLabel || (project.caseStudyUrl ? 'View case study' : null)
  const openProjectDetails = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = project.detailUrl?.startsWith('#')
      ? document.getElementById(project.detailUrl.slice(1))
      : null
    if (!target) return
    event.preventDefault()
    const url = new URL(window.location.href)
    url.hash = project.detailUrl
    window.history.pushState({}, '', url)
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  }

  return (
    <article className={`project-card project-card-${project.slug}${project.featured ? ' is-flagship' : ''}`}>
      <div
        className={hasRealImage ? 'project-visual project-visual-real' : 'project-visual'}
        aria-hidden={hasRealImage ? undefined : true}
      >
        <span className="project-index">0{index + 1}</span>
        {hasRealImage ? (
          <ExpandableImage
            src={project.image}
            alt={project.imageAlt}
            loading="lazy"
            label={`Expand ${project.name} image`}
          />
        ) : (
          <div className="project-card-poster">
            <span>{project.eyebrow}</span>
            <strong>{project.name}</strong>
            <small>{project.status}</small>
          </div>
        )}
      </div>

      <div className="project-content">
        <div className="project-heading">
          <div>
            <p className="eyebrow">{project.eyebrow}</p>
            <h3>{project.name}</h3>
          </div>
          <span className="status-pill">{status}</span>
        </div>
        <p className="project-summary">{project.summary}</p>
        <p className="project-outcome">{project.outcome}</p>
        {(project.role || project.metric) && (
          <dl className="project-meta">
            {project.role && <div><dt>My role</dt><dd>{project.role}</dd></div>}
            {project.metric && <div><dt>Proof point</dt><dd>{project.metric}</dd></div>}
          </dl>
        )}
        {project.tools?.length > 0 && (
          <div className="tool-list" aria-label={`${project.name} tools`}>
            {project.tools.map((tool) => <span key={tool}>{tool}</span>)}
          </div>
        )}

        <div className="project-actions" aria-label={`${project.name} links`}>
          {project.caseStudyUrl ? (
            <ProjectLink
              href={project.caseStudyUrl}
              label={caseStudyLabel}
              projectName={project.name}
            />
          ) : caseStudyLabel ? (
            <span className="text-link text-link-static">
              {caseStudyLabel} <span aria-hidden="true">↗</span>
            </span>
          ) : null}

          {project.githubUrl && (
            <ProjectLink
              href={project.githubUrl}
              label="GitHub proof"
              projectName={project.name}
              external
            />
          )}

          {project.releaseUrl && (
            <ProjectLink
              href={project.releaseUrl}
              label={project.releaseLabel || 'View release'}
              projectName={project.name}
              external
            />
          )}

          {project.demoUrl && (
            <ProjectLink
              href={project.demoUrl}
              label="Watch demo"
              projectName={project.name}
            />
          )}

          {project.detailUrl && (
            <ProjectLink
              href={project.detailUrl}
              label={project.detailLabel || 'View project details'}
              projectName={project.name}
              onClick={openProjectDetails}
            />
          )}

          {project.externalUrl && (
            <ProjectLink
              href={project.externalUrl}
              label={project.externalLabel || 'Open project'}
              projectName={project.name}
              external
            />
          )}

          {project.assistantAction && (
            <button
              className="text-link project-try-button"
              type="button"
              onClick={(event) => requestAskMarkOpen(event.currentTarget)}
            >
              Try Ask Mark <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
