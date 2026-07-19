import { useEffect, useRef } from 'react'

const BOOKING_SCHEDULE_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ12YpKsk8JIDFEC-2NyFwa-UiKoQyTYrAQMPdErV3MjdLmAygfF1KAlt802JAhIBkhYwuW7POzO?gv=true'

const BOOKING_FALLBACK_URL =
  'https://calendar.app.google/2KdUkkmSyNiY3DUv8'

export function Hero() {
  const bookingWrapperRef = useRef(null)
  const bookingTargetRef = useRef(null)

  useEffect(() => {
    const wrapper = bookingWrapperRef.current
    const target = bookingTargetRef.current

    if (!wrapper || !target) {
      return undefined
    }

    const compactBookingViewport = window.matchMedia('(max-width: 700px)')

    let cancelled = false
    let retryTimer
    let attempts = 0

    const stopRetrying = () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer)
        retryTimer = undefined
      }
    }

    const removeInjectedBookingButton = () => {
      wrapper.classList.remove('is-ready')

      Array.from(wrapper.children).forEach((child) => {
        const isReactManagedChild =
          child === target ||
          child.classList?.contains('booking-fallback')

        if (!isReactManagedChild) {
          child.remove()
        }
      })
    }

    const loadBookingButton = () => {
      stopRetrying()
      removeInjectedBookingButton()

      /*
       * Google's popup becomes too narrow on compact screens.
       * Keep the normal same-tab booking link visible on mobile.
       */
      if (cancelled || compactBookingViewport.matches) {
        return
      }

      const schedulingButton = window.calendar?.schedulingButton

      if (schedulingButton?.load) {
        try {
          schedulingButton.load({
            url: BOOKING_SCHEDULE_URL,
            color: '#3157D5',
            label: 'Book a Quick Call',
            target,
          })

          wrapper.classList.add('is-ready')
          return
        } catch (error) {
          console.warn('Google Calendar booking popup could not load.', error)
          return
        }
      }

      attempts += 1

      if (attempts < 50) {
        retryTimer = window.setTimeout(loadBookingButton, 100)
      }
    }

    const handleViewportChange = () => {
      attempts = 0
      loadBookingButton()
    }

    loadBookingButton()

    if (compactBookingViewport.addEventListener) {
      compactBookingViewport.addEventListener('change', handleViewportChange)
    } else {
      compactBookingViewport.addListener(handleViewportChange)
    }

    return () => {
      cancelled = true
      stopRetrying()
      removeInjectedBookingButton()

      if (compactBookingViewport.removeEventListener) {
        compactBookingViewport.removeEventListener(
          'change',
          handleViewportChange,
        )
      } else {
        compactBookingViewport.removeListener(handleViewportChange)
      }
    }
  }, [])

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">Virtual Assistant · Operations · Automation · Systems</p>
        <h1 id="hero-title">
          I turn scattered work into <em>clear, working systems.</em>
        </h1>
        <p className="hero-intro">
          I help teams and clients organize operations, improve workflows, build practical automations, and ship digital tools that are easier to use and manage.
        </p>

        <div className="hero-actions">
          <a className="button button-primary" href="#work">
            Explore my work
          </a>

          <a
            className="button button-secondary"
            href="/files/Mark-Anton-Badong-Resume.pdf"
            target="_blank"
            rel="noreferrer"
          >
            View résumé
          </a>

          <div
            className="booking-button-shell"
            ref={bookingWrapperRef}
          >
            <span
              className="booking-button-target"
              ref={bookingTargetRef}
              aria-hidden="true"
            />

            <a
              className="button button-secondary booking-fallback"
              href={BOOKING_FALLBACK_URL}
              target="_blank"
              rel="noreferrer"
              title="Open the booking calendar in a new tab"
            >
              Book a Quick Call
            </a>
          </div>
        </div>
      </div>

      <aside className="hero-proof" aria-label="Professional summary">
        <p className="proof-label">Current focus</p>
        <p className="proof-main">Systems-minded support for modern remote work.</p>

        <div className="proof-grid">
          <div>
            <strong>Production</strong>
            <span>deployed bots &amp; tools</span>
          </div>
          <div>
            <strong>Full-stack</strong>
            <span>workflow applications</span>
          </div>
          <div>
            <strong>Enterprise</strong>
            <span>training &amp; operations</span>
          </div>
          <div>
            <strong>Client work</strong>
            <span>web &amp; CRM delivery</span>
          </div>
        </div>
      </aside>
    </section>
  )
}