import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const closeRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const triggerNode = triggerRef.current
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    window.requestAnimationFrame(() => closeRef.current?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
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
          <div className="image-lightbox-panel">
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
