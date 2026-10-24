import { featuredProjects } from './projects.js'

export const markverseCareer = [
  {
    period: '2017–2021',
    title: 'Customer & Technical Support',
    organization: 'Financial-services and telecommunications programs',
    summary: 'Structured account, billing, service, device, and technical troubleshooting with documentation, verification, and escalation.',
  },
  {
    period: '2022–2023',
    title: 'AA – Production Specialist',
    organization: 'Wipro · supporting Google operations',
    summary: 'Geospatial data operations, source validation, policy interpretation, and data-quality review.',
  },
  {
    period: '2023–2026',
    title: 'Senior Executive – Trainer',
    organization: 'Wipro · supporting Google operations',
    summary: 'Process training, documentation, assessments, QA, reporting, and workflow improvement.',
  },
  {
    period: 'Current',
    title: 'Training Lead',
    organization: 'Wipro',
    summary: 'Current official title confirmed October 2026. Effective date and updated responsibilities have not been documented.',
  },
]

export const markverseSkillDomains = [
  {
    title: 'Operations & enablement',
    skills: ['Process training', 'Policy interpretation', 'SOPs', 'Reporting', 'Quality assurance'],
  },
  {
    title: 'Automation & AI-assisted tools',
    skills: ['Google Sheets', 'Apps Script', 'Workflow design', 'Source-grounded assistants', 'AI-assisted development'],
  },
  {
    title: 'Web, CRM & systems',
    skills: ['GoHighLevel', 'React', 'JavaScript', 'Node.js', 'SQL data systems'],
  },
  {
    title: 'Cloud & interactive systems',
    skills: ['Cloudflare Workers', 'D1', 'Durable Objects', 'Three.js', 'Multiplayer prototypes'],
  },
]

export const markverseProjectStatus = {
  'ask-mark': { status: 'Live portfolio feature · flagship project', district: 'Automation Lab' },
  personalvabot: { status: 'Windows beta', district: 'Automation Lab' },
  markhq: { status: 'Production', district: 'Automation Lab' },
  applylang: { status: 'Complete Discord product', district: 'Automation Lab' },
  'learning-library': { status: 'Live portfolio demo · test integrations', district: 'Developer Studio' },
  'funnel-lab': { status: 'Live portfolio showcase', district: 'Client Studio' },
  'childcare-culture': { status: 'Owner-approved high-level website project', district: 'Client Studio' },
  leaveflow: { status: 'Functional application · portfolio proof', district: 'Developer Studio' },
  'enterprise-assessment': { status: 'Internal workflow · sanitized proof only', district: 'Operations HQ' },
  'lilo-live': { status: 'Internal workflow proof · confidentiality review', district: 'Operations HQ' },
  'luma-home-care': { status: 'Separate GoHighLevel portfolio demo', district: 'Client Studio' },
  'tambayan-royale': { status: 'Staging / active QA · personal project', district: 'Arcade District' },
  'tambayan-royale-play': { status: 'Developing public preview · personal project', district: 'Arcade District' },
  ledger: { status: 'Early real-world use · access-gated', district: 'Developer Studio' },
}

export const clientStudioScope = {
  client: 'Childcare Culture & Co.',
  role: 'Website implementation, responsive design, UX, and QA',
  engagement: 'Independent client project',
  specialization: 'GoHighLevel · Custom HTML/CSS · Responsive design · UX · QA',
  title: 'Six-page responsive website implementation.',
  summary: 'Mark implemented a six-page responsive website for Childcare Culture & Co. using GoHighLevel and custom HTML/CSS, with responsive design, user experience, and quality assurance.',
  website: 'https://childcarecultureco.com/',
}

export const automationTerminalProjects = featuredProjects.filter((project) =>
  ['personalvabot', 'markhq'].includes(project.slug),
)
