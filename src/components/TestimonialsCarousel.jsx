import { useEffect, useRef, useState } from 'react'
import { testimonials } from '../data/testimonials'
import { SectionHeading } from './SectionHeading'

const AUTOPLAY_DELAY = 8000
const SWIPE_THRESHOLD = 52

export function TestimonialsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isManuallyPaused, setIsManuallyPaused] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [rotationCycle, setRotationCycle] = useState(0)
  const touchStartX = useRef(null)

  const isPaused = isManuallyPaused || isInteracting || prefersReducedMotion
  const testimonial = testimonials[activeIndex]
  const testimonialLengthClass =
    testimonial.quote.length > 700
      ? 'is-extra-long'
      : testimonial.quote.length > 400
        ? 'is-long'
        : ''

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updateMotionPreference()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMotionPreference)
      return () => mediaQuery.removeEventListener('change', updateMotionPreference)
    }

    mediaQuery.addListener(updateMotionPreference)
    return () => mediaQuery.removeListener(updateMotionPreference)
  }, [])

  useEffect(() => {
    if (isPaused || testimonials.length < 2) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % testimonials.length)
    }, AUTOPLAY_DELAY)

    return () => window.clearInterval(intervalId)
  }, [isPaused, rotationCycle])

  const selectTestimonial = (index) => {
    const normalizedIndex = (index + testimonials.length) % testimonials.length
    setActiveIndex(normalizedIndex)
    setRotationCycle((currentCycle) => currentCycle + 1)
  }

  const handleTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0].clientX
    setIsInteracting(true)
  }

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) {
      setIsInteracting(false)
      return
    }

    const distance = event.changedTouches[0].clientX - touchStartX.current

    if (Math.abs(distance) >= SWIPE_THRESHOLD) {
      selectTestimonial(activeIndex + (distance < 0 ? 1 : -1))
    }

    touchStartX.current = null
    setIsInteracting(false)
  }

  const handleBlurCapture = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsInteracting(false)
    }
  }

  return (
    <section
      id="testimonials"
      className="section testimonials-section"
      aria-label="Testimonials"
    >
      <SectionHeading
        eyebrow="Testimonials"
        title="What it’s like working with me."
        copy="Real feedback from former teammates and colleagues, shared in their own words."
      />

      <div
        className="testimonials-shell"
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        onFocusCapture={() => setIsInteracting(true)}
        onBlurCapture={handleBlurCapture}
      >
        <div className="testimonial-toolbar">
          <p>
            <span aria-hidden="true">●</span>
            Verified professional feedback
          </p>

          <button
            type="button"
            className="testimonial-autoplay"
            onClick={() => setIsManuallyPaused((currentValue) => !currentValue)}
            aria-pressed={isManuallyPaused}
            disabled={prefersReducedMotion}
          >
            {prefersReducedMotion
              ? 'Autoplay off'
              : isManuallyPaused
                ? 'Resume autoplay'
                : 'Pause autoplay'}
          </button>
        </div>

        <article
          className={`testimonial-stage ${testimonialLengthClass}`.trim()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartX.current = null
            setIsInteracting(false)
          }}
          aria-live={isPaused ? 'polite' : 'off'}
          aria-atomic="true"
        >
          <span className="testimonial-quote-mark" aria-hidden="true">“</span>
          <span className="testimonial-count">
            {String(activeIndex + 1).padStart(2, '0')} / {String(testimonials.length).padStart(2, '0')}
          </span>

          <div key={testimonial.id} className="testimonial-stage-content">
            <blockquote className="testimonial-quote">
              {testimonial.quote.split('\n\n').map((paragraph) => (
                <p key={`${testimonial.id}-${paragraph.slice(0, 28)}`}>{paragraph}</p>
              ))}
            </blockquote>

            <footer className="testimonial-author">
              <span className="testimonial-avatar" aria-hidden="true">
                {testimonial.initials}
              </span>
              <div>
                <strong>{testimonial.name}</strong>
                <span>{testimonial.relationship}</span>
              </div>
            </footer>
          </div>
        </article>

        <div className="testimonial-controls">
          <div className="testimonial-arrow-group" aria-label="Testimonial navigation">
            <button
              type="button"
              className="testimonial-arrow"
              onClick={() => selectTestimonial(activeIndex - 1)}
              aria-label="Show previous testimonial"
            >
              ←
            </button>
            <button
              type="button"
              className="testimonial-arrow"
              onClick={() => selectTestimonial(activeIndex + 1)}
              aria-label="Show next testimonial"
            >
              →
            </button>
          </div>

          <div className="testimonial-dots" aria-label="Choose a testimonial">
            {testimonials.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => selectTestimonial(index)}
                aria-label={`Show testimonial from ${item.name}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>

        <p className="testimonial-disclosure">
          Testimonials are displayed exactly as received and shared with permission.
        </p>
      </div>
    </section>
  )
}
