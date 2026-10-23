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
  'childcare-culture': { status: 'Independent client work · status varies by workstream', district: 'Client Studio' },
  'short-form-video': { status: '3 client-approved reels · media approval-gated', district: 'Client Studio' },
  leaveflow: { status: 'Functional application · portfolio proof', district: 'Developer Studio' },
  'enterprise-assessment': { status: 'Internal workflow · sanitized proof only', district: 'Operations HQ' },
  'lilo-live': { status: 'Internal workflow proof · confidentiality review', district: 'Operations HQ' },
  'luma-home-care': { status: 'Separate GoHighLevel portfolio demo', district: 'Client Studio' },
  'tambayan-royale': { status: 'Staging / active QA · personal project', district: 'Arcade District' },
  'tambayan-royale-play': { status: 'Developing public preview · personal project', district: 'Arcade District' },
  ledger: { status: 'Early real-world use · access-gated', district: 'Developer Studio' },
}

export const clientStudioScope = {
  client: 'Childcare Culture & Co. (CCC&C)',
  role: 'GoHighLevel & Systems Specialist',
  engagement: 'Independent Contractor',
  specialization: 'Website Development · CRM Systems · Automation · Technical QA',
  title: 'Digital systems work across a client website and connected program operations.',
  summary: 'A hands-on engagement combining responsive GoHighLevel website work with CRM configuration, workflow support, assessment and program infrastructure, and careful technical testing. Contributions were collaborative; status varies by workstream.',
  overview: [
    { label: 'Website', value: 'Six core GoHighLevel pages' },
    { label: 'Implementation', value: 'Responsive UI · custom HTML/CSS' },
    { label: 'Systems', value: 'CRM · workflows · forms · calendars' },
    { label: 'Delivery', value: 'Configuration · manual QA · documentation' },
  ],
  workstreams: [
    {
      title: 'Website development & responsive UI',
      contribution: 'Implemented and refined',
      status: 'Built and refined a six-page GoHighLevel site with responsive layouts, custom HTML/CSS, navigation, lead capture, booking integration, CTA flows, promotional updates, and desktop/mobile QA.',
      detail: 'JavaScript is part of Mark’s broader portfolio skill set. The CCC&C records reviewed support custom HTML/CSS, so this summary does not attribute a JavaScript deliverable without an engagement artifact.',
    },
    {
      title: 'CRM foundation & automation',
      contribution: 'Configured · collaborative · tested by workflow',
      status: 'Worked with contact fields, tags, forms, pipelines, opportunities, calendars, automated notifications, follow-ups, membership updates, and onboarding workflows. Exact live state and ownership vary by automation.',
      detail: 'Technical testing and troubleshooting supported these systems. No end-to-end launch claim is made for every workflow.',
    },
    {
      title: 'Foundation First',
      contribution: 'Assessment and results infrastructure · QA',
      status: 'Worked on assessment/results infrastructure, CRM result tracking, related workflows, follow-up automation, and program onboarding.',
      detail: 'Some advanced follow-up journeys remained in Draft or required additional QA. Results presentation and every downstream journey are not represented as complete.',
    },
    {
      title: 'Culture Club',
      contribution: 'Community configuration · selected manual tests',
      status: 'Worked on Community setup, membership access, welcome workflows, and subscription-related automations.',
      detail: 'Selected workflow actions were verified through controlled manual testing. Complete payment, subscription, and cancellation lifecycle scenarios were not verified.',
    },
    {
      title: 'Founding Cohort',
      contribution: 'Implementation support · technical and operational documentation',
      status: 'Supported Community setup and onboarding infrastructure across application, acceptance, agreement, assessment, and recurring-session processes.',
      detail: 'Specific process steps and handoffs varied; this does not claim that every stage was fully automated or independently owned.',
    },
    {
      title: '90-Day Experience',
      contribution: 'CRM fields · pipeline · automation configuration',
      status: 'Configured onboarding-related CRM fields, a pipeline, and automation components.',
      detail: 'Some functionality depended on approved links, content, and business rules. This summary does not imply those dependencies were completed.',
    },
    {
      title: 'Summit & sponsorship',
      contribution: 'Specific implementation and workflow structure',
      status: 'Records support sponsor-pipeline/outreach structure and summit ticket/promotion UI, including custom HTML/CSS and CTA-related implementation.',
      detail: 'Planned outreach and future event outcomes are not described as completed. Approval, launch, and payment lifecycle states are not asserted.',
    },
    {
      title: 'Short-form video',
      contribution: 'Three client-approved reels delivered',
      status: 'Produced three approved short-form edits as part of the engagement.',
      detail: 'The underlying campaign files and video assets are omitted here; approval to reuse the videos as public portfolio visuals has not been established.',
    },
  ],
  separateDemo: {
    name: 'Luma Home Care',
    status: 'GoHighLevel portfolio demo',
    summary: 'A separate showcase of a landing page, form, CRM pipeline, calendar, and follow-up workflow. Voice AI intake remains planned unless reverified.',
  },
}

export const automationTerminalProjects = featuredProjects.filter((project) =>
  ['personalvabot', 'markhq'].includes(project.slug),
)
