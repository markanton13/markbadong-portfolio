import { markverseSkillDomains } from '../../data/markverseContent'

export function SkillConstellation() {
  return (
    <div className="markverse-skill-constellation" aria-label="Professional skill areas">
      {markverseSkillDomains.map((domain, index) => (
        <article key={domain.title}>
          <span>NODE 0{index + 1}</span><h3>{domain.title}</h3>
          <ul>{domain.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
        </article>
      ))}
    </div>
  )
}
