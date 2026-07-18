import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container) {
  if (!container) return []

  return [...container.querySelectorAll(focusableSelector)].filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  )
}

export function ExpandableImage({
  src,
  alt,
  loading = 'lazy',
  className = '',
  imageClassName = '',
  label,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const titleId = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const triggerNode = triggerRef.current
    const appRoot = document.getElementById('root')
    const previousRootInert = appRoot?.inert ?? false

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(panelRef.current)
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (!panelRef.current?.contains(activeElement)) {
        event.preventDefault()
        const fallbackElement = event.shiftKey ? lastElement : firstElement
        fallbackElement.focus()
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    if (appRoot) appRoot.inert = true
    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
      if (appRoot) appRoot.inert = previousRootInert
      document.removeEventListener('keydown', handleKeyDown)
      triggerNode?.focus()
    }
  }, [isOpen])

  const modal = isOpen
    ? createPortal(
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div ref={panelRef} className="image-lightbox-panel">
            <div className="image-lightbox-toolbar">
              <span id={titleId}>{alt}</span>
              <button
                ref={closeRef}
                type="button"
                className="image-lightbox-close"
                onClick={() => setIsOpen(false)}
              >
                Close ×
              </button>
            </div>
            <img className="image-lightbox-image" src={src} alt="" />
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`expandable-image-trigger ${className}`.trim()}
        aria-label={label || `Expand image: ${alt}`}
        onClick={() => setIsOpen(true)}
      >
        <img
          className={imageClassName}
          src={src}
          alt={alt}
          loading={loading}
        />
        <span className="expandable-image-hint" aria-hidden="true">
          ⛶ Expand
        </span>
      </button>
      {modal}
    </>
  )
}
