export const siteUrl = 'https://markbadong.com'
export const siteName = 'Mark Anton Portfolio'

const person = {
  '@type': 'Person',
  '@id': `${siteUrl}/#person`,
  name: 'Mark Anton Badong',
  alternateName: 'Mark Anton',
  url: `${siteUrl}/`,
  image: `${siteUrl}/images/seo/mark-anton-portfolio-og.png`,
  jobTitle: 'Operations, Automation & Systems Specialist',
  email: 'mailto:markantonbadong13@gmail.com',
  telephone: ['+639568695475', '+639683281273'],
  sameAs: [
    'https://github.com/markanton13',
    'https://www.linkedin.com/in/markanton13',
  ],
  knowsAbout: [
    'Virtual assistance',
    'Remote operations',
    'Workflow design',
    'Automation',
    'Quality assurance',
    'Training and documentation',
    'React',
    'Node.js',
    'GoHighLevel',
    'Cloudflare Pages',
    'Cloudflare Workers',
    'Cloudflare D1',
    'Payment webhooks',
    'Passwordless recovery',
    'Short-form video editing',
    'CapCut Pro',
    'Vertical social video',
  ],
}

const website = {
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: siteName,
  publisher: { '@id': `${siteUrl}/#person` },
  inLanguage: 'en',
}

function caseStudy({ key, name, title, description, image, imageAlt, keywords }) {
  const path = `/projects/${key}`
  const url = `${siteUrl}${path}`

  return {
    title,
    description,
    path,
    type: 'article',
    image,
    imageAlt,
    robots: 'index, follow, max-image-preview:large',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        person,
        website,
        {
          '@type': 'CreativeWork',
          '@id': `${url}#case-study`,
          name,
          headline: title,
          description,
          url,
          image: `${siteUrl}${image}`,
          author: { '@id': `${siteUrl}/#person` },
          creator: { '@id': `${siteUrl}/#person` },
          isPartOf: { '@id': `${siteUrl}/#website` },
          keywords,
          inLanguage: 'en',
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${url}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Portfolio', item: `${siteUrl}/` },
            { '@type': 'ListItem', position: 2, name, item: url },
          ],
        },
      ],
    },
  }
}

export const pageSeo = {
  home: {
    title: 'Mark Anton | Operations, Automation & Systems',
    description:
      'Mark Anton is an operations, automation, and systems specialist with 8+ years of experience across training, QA, support, GoHighLevel, workflow automation, client websites, and short-form content.',
    path: '/',
    type: 'website',
    image: '/images/seo/mark-anton-portfolio-og.png',
    imageAlt:
      'Mark Anton portfolio for operations, automation, quality assurance, serverless systems, and practical web implementation.',
    robots: 'index, follow, max-image-preview:large',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        person,
        website,
        {
          '@type': 'ProfilePage',
          '@id': `${siteUrl}/#profile`,
          url: `${siteUrl}/`,
          name: 'Mark Anton | Operations, Automation & Systems',
          description:
            'Portfolio of Mark Anton Badong, an operations, automation, and systems specialist with 8+ years of experience and verified client work in GoHighLevel websites, CRM workflows, and short-form video.',
          mainEntity: { '@id': `${siteUrl}/#person` },
          isPartOf: { '@id': `${siteUrl}/#website` },
          inLanguage: 'en',
        },
      ],
    },
  },
  personalvabot: caseStudy({
    key: 'personalvabot',
    name: 'PersonalVABot',
    title: 'PersonalVABot Case Study | Mark Anton',
    description:
      'PersonalVABot is a local-first Windows operations platform connecting Discord workflows, client tasks, attendance, billing, documents, automation, and backups.',
    image: '/images/seo/personalvabot-og.png',
    imageAlt:
      'PersonalVABot case study by Mark Anton, featuring a local-first Windows operations platform.',
    keywords: ['PersonalVABot', 'Windows desktop application', 'Discord automation', 'task management', 'attendance', 'billing', 'SQLite'],
  }),
  markhq: caseStudy({
    key: 'markhq',
    name: 'MarkHQ Assistant',
    title: 'MarkHQ Assistant Case Study | Mark Anton',
    description:
      'MarkHQ Assistant is a Railway-hosted Discord operations system for task pipelines, private workspaces, onboarding, requests, documentation, backups, and deployment health.',
    image: '/images/seo/markhq-og.png',
    imageAlt:
      'MarkHQ Assistant case study by Mark Anton, featuring a production Discord operations system.',
    keywords: ['MarkHQ Assistant', 'Discord bot', 'operations system', 'Railway', 'task pipeline', 'SQLite', 'workflow automation'],
  }),
  applylang: caseStudy({
    key: 'applylang',
    name: 'ApplyLang',
    title: 'ApplyLang Case Study | Mark Anton',
    description:
      'ApplyLang is a Discord career operations system for truth-safe application records, reusable career sources, resume snapshots, structured prompts, and follow-up tracking.',
    image: '/images/seo/applylang-og.png',
    imageAlt:
      'ApplyLang case study by Mark Anton, featuring a truth-safe Discord career operations system.',
    keywords: ['ApplyLang', 'career operations', 'resume tailoring', 'application tracking', 'Discord bot', 'prompt system', 'truth-safe automation'],
  }),
  leaveflow: caseStudy({
    key: 'leaveflow',
    name: 'LeaveFlow',
    title: 'LeaveFlow Case Study | Mark Anton',
    description:
      'LeaveFlow is a full-stack role-based leave management application for employee requests, manager approvals, leave balances, shared calendars, and user administration.',
    image: '/images/seo/leaveflow-og.png',
    imageAlt:
      'LeaveFlow case study by Mark Anton, featuring a role-based full-stack leave management application.',
    keywords: ['LeaveFlow', 'leave management', 'React', 'Node.js', 'Express', 'MySQL', 'role-based application'],
  }),
  learningLibrary: caseStudy({
    key: 'learning-library',
    name: 'Learning Library',
    title: 'Learning Library Case Study | Mark Anton',
    description:
      'Learning Library is a Cloudflare-based interactive learning platform with premium access, test payments, rewarded unlocks, passwordless recovery, analytics, and launch controls.',
    image: '/images/projects/learning-library/library-overview.svg',
    imageAlt:
      'Learning Library case study showing interactive guides, premium access, recovery, analytics, and serverless operations.',
    keywords: ['Learning Library', 'Cloudflare Workers', 'Cloudflare D1', 'serverless', 'PayMongo', 'Resend', 'rewarded access', 'passwordless recovery'],
  }),
  funnelLab: caseStudy({
    key: 'funnel-lab',
    name: 'Landing & Funnel Portfolio Lab',
    title: 'Landing & Funnel Portfolio Lab Case Study | Mark Anton',
    description:
      'Landing & Funnel Portfolio Lab is a live collection of seven interactive conversion experiences with distinct visual systems, responsive flows, Cloudflare deployment, and Resend inquiry delivery.',
    image: '/images/seo/funnel-lab-og.png',
    imageAlt:
      'Landing and Funnel Portfolio Lab case study by Mark Anton, featuring seven distinct conversion demos.',
    keywords: ['landing pages', 'sales funnels', 'conversion design', 'responsive frontend', 'Cloudflare Pages', 'Pages Functions', 'Resend', 'portfolio lab'],
  }),
  shortFormVideo: caseStudy({
    key: 'short-form-video',
    name: 'Short-Form Video Editing',
    title: 'Short-Form Video Editing Case Study | Mark Anton',
    description:
      'Short-form video editing case study featuring three approved vertical campaign reels with AI-assisted visuals, captions, voiceover timing, music, pacing, and stakeholder revisions.',
    image: '/images/seo/short-form-video-og.png',
    imageAlt:
      'Short-form video editing case study by Mark Anton, featuring three approved vertical promotional reels.',
    keywords: ['short-form video editing', 'Instagram Reels', 'CapCut Pro', 'vertical video', 'caption design', 'AI-assisted visuals', 'voiceover editing'],
  }),
  notFound: {
    title: 'Page Not Found | Mark Anton',
    description:
      'The requested page could not be found. Return to Mark Anton’s portfolio to explore operations, automation, QA, and web-system case studies.',
    path: '/',
    type: 'website',
    image: null,
    imageAlt: null,
    robots: 'noindex, nofollow',
    canonical: false,
    structuredData: null,
  },
}
