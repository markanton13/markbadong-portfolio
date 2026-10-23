import { markverseCareer } from '../../../data/markverseContent.js'
import { featuredProjects } from '../../../data/projects.js'

const careerIds = ['career-support', 'career-production', 'career-trainer', 'career-training-lead']

export const OPERATIONS_HQ_CAREER_ITEMS = Object.freeze(markverseCareer.map((stage, index) => Object.freeze({
  id: careerIds[index],
  type: 'career',
  title: stage.title,
  period: stage.period,
  organization: stage.organization,
  summary: index === 3 ? 'Current official Wipro title.' : stage.summary,
  note: index === 3 ? 'The effective date and responsibilities assigned with this title have not been documented.' : '',
})))

const projectBySlug = new Map(featuredProjects.map((project) => [project.slug, project]))
const projectEvidence = (slug) => {
  const project = projectBySlug.get(slug)
  return Object.freeze({
    id: project.slug,
    title: project.name,
    status: project.status,
    summary: project.outcome,
    href: project.caseStudyUrl,
  })
}

export const OPERATIONS_HQ_STATION_CONTENT = Object.freeze({
  'training-command': Object.freeze({
    id: 'training-command',
    type: 'station',
    title: 'Training Command Center',
    eyebrow: 'Prior Wipro role · Senior Executive – Trainer',
    summary: 'Documented process-trainer experience supporting Google geospatial operations.',
    points: Object.freeze([
      'Training delivery, facilitation, and knowledge transfer.',
      'Documentation, SOPs, assessments, and policy interpretation.',
      'Quality reviews, reporting, operational support, and workflow improvement.',
    ]),
    note: 'These details describe the earlier trainer role. They do not add responsibilities to the current Training Lead title.',
    related: Object.freeze([projectEvidence('learning-library')]),
  }),
  'quality-process': Object.freeze({
    id: 'quality-process',
    type: 'station',
    title: 'Quality & Process Station',
    eyebrow: 'Operations practice · evidence-led and privacy-safe',
    summary: 'Experience includes geospatial source validation, data-quality review, policy interpretation, discrepancy investigation, and workflow documentation.',
    points: Object.freeze([
      'Validate inputs and review work against documented requirements.',
      'Investigate discrepancies and support practical operational problem-solving.',
      'Document repeatable workflows and identify opportunities to improve them.',
    ]),
    note: 'The diagrams and examples in this room are synthetic. No employer data, proprietary tools, policies, or internal process material is shown.',
    related: Object.freeze([projectEvidence('personalvabot'), projectEvidence('leaveflow')]),
  }),
  'impact-evidence': Object.freeze({
    id: 'impact-evidence',
    type: 'station',
    title: 'Impact & Evidence',
    eyebrow: 'Public portfolio work · status shown per project',
    summary: 'Selected outcomes from existing portfolio case studies. These are personal or portfolio systems and are not presented as Wipro performance results.',
    points: Object.freeze([]),
    note: 'The internal assessment/reporting efficiency figure and internal workflow evidence are excluded pending source, methodology, confidentiality, and publication review.',
    related: Object.freeze([
      projectEvidence('markhq'),
      projectEvidence('personalvabot'),
      projectEvidence('applylang'),
      projectEvidence('learning-library'),
    ]),
  }),
})

export const OPERATIONS_HQ_CONTENT_BY_ID = Object.freeze(Object.fromEntries([
  ...OPERATIONS_HQ_CAREER_ITEMS.map((item) => [item.id, item]),
  ...Object.entries(OPERATIONS_HQ_STATION_CONTENT),
]))

export const OPERATIONS_HQ_DIRECT_ACCESS_ITEMS = Object.freeze([
  ...OPERATIONS_HQ_CAREER_ITEMS,
  OPERATIONS_HQ_STATION_CONTENT['training-command'],
  OPERATIONS_HQ_STATION_CONTENT['quality-process'],
  OPERATIONS_HQ_STATION_CONTENT['impact-evidence'],
])
