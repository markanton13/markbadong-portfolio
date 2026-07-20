const DEFAULT_ENDPOINT = 'https://collect.markbadong.com/api/events'
const TRACKING_ENABLED = import.meta.env.VITE_TRACKER_ENABLED === 'true'
const TRACKER_ENDPOINT = import.meta.env.VITE_TRACKER_ENDPOINT || DEFAULT_ENDPOINT

const EVENT_NAMES = new Set([
  'page_view',
  'project_view',
  'resume_open',
  'resume_download',
  'github_click',
  'linkedin_click',
  'email_click',
  'contact_click',
  'booking_click',
  'external_demo_click',
])

const PROJECT_BY_ROUTE = Object.freeze({
  '/projects/personalvabot': 'personalvabot',
  '/projects/markhq': 'markhq',
  '/projects/leaveflow': 'leaveflow',
  '/projects/applylang': 'applylang',
})

const APPROVED_ROUTES = new Set([
  '/',
  ...Object.keys(PROJECT_BY_ROUTE),
])

const memoryIds = {
  visitor: null,
  session: null,
}

let initialized = false

function createUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hexadecimal = Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')

  return [
    hexadecimal.slice(0, 8),
    hexadecimal.slice(8, 12),
    hexadecimal.slice(12, 16),
    hexadecimal.slice(16, 20),
    hexadecimal.slice(20),
  ].join('-')
}

function getOrCreateId(storage, key, memoryKey) {
  try {
    const current = storage.getItem(key)
    if (current) return current

    const created = createUuid()
    storage.setItem(key, created)
    return created
  } catch {
    if (!memoryIds[memoryKey]) {
      memoryIds[memoryKey] = createUuid()
    }

    return memoryIds[memoryKey]
  }
}

function normalizeRoute(pathname) {
  const normalized = pathname !== '/'
    ? pathname.replace(/\/+$/, '')
    : '/'

  return APPROVED_ROUTES.has(normalized) ? normalized : null
}

function cleanLabel(value, fallback) {
  const cleaned = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  return cleaned || fallback
}

function currentCampaign() {
  const parameters = new URLSearchParams(window.location.search)

  return {
    utm_source: parameters.get('utm_source') || undefined,
    utm_medium: parameters.get('utm_medium') || undefined,
    utm_campaign: parameters.get('utm_campaign') || undefined,
  }
}

function sourceLocation(element, type) {
  if (element.closest('.site-header')) return `header-${type}`
  if (element.closest('.hero')) return `hero-${type}`
  if (element.closest('.contact-section')) return `contact-${type}`
  if (element.closest('.site-footer')) return `footer-${type}`

  const projectCard = element.closest('[class*="project-card-"]')
  if (projectCard) {
    const projectClass = Array.from(projectCard.classList)
      .find((className) => className.startsWith('project-card-'))

    if (projectClass) {
      return `${projectClass.replace('project-card-', '')}-${type}`
    }
  }

  const routeProject = PROJECT_BY_ROUTE[normalizeRoute(window.location.pathname)]
  if (routeProject) return `${routeProject}-${type}`

  return type
}

function explicitInteraction(element) {
  const tracked = element.closest('[data-track-event]')
  if (!tracked) return null

  const eventName = tracked.dataset.trackEvent
  if (!EVENT_NAMES.has(eventName) || eventName === 'page_view') return null

  return {
    eventName,
    targetLabel: cleanLabel(
      tracked.dataset.trackLabel,
      sourceLocation(tracked, eventName.replace(/_click$|_open$|_download$/, '')),
    ),
    targetCategory: tracked.dataset.trackCategory || undefined,
  }
}

function resolveAnchorInteraction(anchor) {
  let url

  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return null
  }

  const pathname = url.pathname.toLowerCase()
  const hostname = url.hostname.toLowerCase()
  const ownOrigin = url.origin === window.location.origin

  if (pathname.endsWith('/mark-anton-badong-resume.pdf')) {
    const isDownload = anchor.hasAttribute('download')

    return {
      eventName: isDownload ? 'resume_download' : 'resume_open',
      targetLabel: sourceLocation(anchor, isDownload ? 'resume-download' : 'resume-open'),
      targetCategory: 'resume',
    }
  }

  if (
    ownOrigin &&
    (url.hash === '#contact' || url.hash === '#contact-section')
  ) {
    return {
      eventName: 'contact_click',
      targetLabel: sourceLocation(anchor, 'contact'),
      targetCategory: 'contact',
    }
  }

  if (ownOrigin && url.hash.toLowerCase().includes('demo')) {
    return {
      eventName: 'external_demo_click',
      targetLabel: sourceLocation(anchor, 'demo'),
      targetCategory: 'demo',
    }
  }

  if (hostname === 'mail.google.com') {
    const recipient = url.searchParams.get('to')
    const targetLabel = recipient === 'markantonbadong@gmail.com'
      ? 'primary-email'
      : recipient === 'markantonbadong13@gmail.com'
        ? 'alternate-email'
        : sourceLocation(anchor, 'email')

    return {
      eventName: 'email_click',
      targetLabel,
      targetCategory: 'email',
    }
  }

  if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) {
    return {
      eventName: 'linkedin_click',
      targetLabel: 'linkedin-profile',
      targetCategory: 'linkedin',
    }
  }

  if (hostname === 'github.com' || hostname.endsWith('.github.com')) {
    const isRelease = pathname.includes('/releases/')

    return {
      eventName: isRelease ? 'external_demo_click' : 'github_click',
      targetLabel: sourceLocation(anchor, isRelease ? 'release' : 'github'),
      targetCategory: isRelease ? 'release' : 'github',
    }
  }

  if (hostname === 't.me' || hostname.endsWith('.t.me')) {
    return {
      eventName: 'contact_click',
      targetLabel: 'telegram',
      targetCategory: 'contact',
    }
  }

  if (
    hostname === 'calendar.app.google' ||
    (hostname === 'calendar.google.com' && pathname.includes('/calendar/appointments/'))
  ) {
    return {
      eventName: 'booking_click',
      targetLabel: sourceLocation(anchor, 'booking'),
      targetCategory: 'booking',
    }
  }

  if (!ownOrigin && /^https?:$/.test(url.protocol)) {
    return {
      eventName: 'external_demo_click',
      targetLabel: cleanLabel(
        anchor.getAttribute('aria-label') || anchor.textContent,
        hostname,
      ),
      targetCategory: 'external',
    }
  }

  return null
}

function resolveInteraction(target) {
  if (!(target instanceof Element)) return null

  const explicit = explicitInteraction(target)
  if (explicit) return explicit

  const bookingShell = target.closest('.booking-button-shell')
  if (bookingShell) {
    return {
      eventName: 'booking_click',
      targetLabel: 'hero-booking',
      targetCategory: 'booking',
    }
  }

  const copyButton = target.closest('button')
  if (
    copyButton &&
    copyButton.textContent?.trim().toLowerCase() === 'copy address'
  ) {
    return {
      eventName: 'email_click',
      targetLabel: copyButton.closest('.contact-primary')
        ? 'primary-email-copy'
        : 'alternate-email-copy',
      targetCategory: 'email',
    }
  }

  const anchor = target.closest('a[href]')
  return anchor ? resolveAnchorInteraction(anchor) : null
}

export function trackEvent(
  eventName,
  {
    targetLabel,
    targetCategory,
    sourceRoute,
  } = {},
) {
  if (!TRACKING_ENABLED || !EVENT_NAMES.has(eventName)) return

  const normalizedRoute = normalizeRoute(
    sourceRoute || window.location.pathname,
  )

  if (!normalizedRoute) return

  if (eventName !== 'page_view' && !targetLabel) return

  const payload = {
    event_name: eventName,
    event_id: createUuid(),
    source_route: normalizedRoute,
    anonymous_visitor_id: getOrCreateId(
      window.localStorage,
      'markbadong.tracker.visitor',
      'visitor',
    ),
    anonymous_session_id: getOrCreateId(
      window.sessionStorage,
      'markbadong.tracker.session',
      'session',
    ),
    referrer: document.referrer || undefined,
    ...currentCampaign(),
  }

  if (eventName !== 'page_view') {
    payload.target_label = cleanLabel(targetLabel, eventName)
  }

  if (targetCategory) {
    payload.target_category = targetCategory
  }

  void fetch(TRACKER_ENDPOINT, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Analytics must never interrupt portfolio navigation or interactions.
  })
}

function trackCurrentRoute() {
  const sourceRoute = normalizeRoute(window.location.pathname)
  if (!sourceRoute) return

  trackEvent('page_view', { sourceRoute })

  const project = PROJECT_BY_ROUTE[sourceRoute]
  if (project) {
    trackEvent('project_view', {
      sourceRoute,
      targetLabel: project,
      targetCategory: 'project',
    })
  }
}

function handleDocumentClick(event) {
  const interaction = resolveInteraction(event.target)
  if (!interaction) return

  trackEvent(interaction.eventName, {
    targetLabel: interaction.targetLabel,
    targetCategory: interaction.targetCategory,
  })
}

export function initializeTracking() {
  if (!TRACKING_ENABLED || initialized || typeof window === 'undefined') {
    return
  }

  initialized = true
  trackCurrentRoute()
  document.addEventListener('click', handleDocumentClick, true)
}
