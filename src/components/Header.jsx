import { useEffect, useRef, useState } from 'react'

const navItems = [
  ['Work', '#work'],
  ['Capabilities', '#capabilities'],
  ['About', '#about'],
  ['Contact', '#contact'],
]

export function Header({ mode = 'home' }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef(null)
  const navRef = useRef(null)
  const isHome = mode === 'home'
  const linkTo = (hash) => (isHome ? hash : `/${hash}`)

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 820) setOpen(false)
    }
    window.addEventListener('resize', closeOnResize)
    return () => window.removeEventListener('resize', closeOnResize)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      window.requestAnimationFrame(() => toggleRef.current?.focus())
    }

    const handlePointerDown = (event) => {
      const target = event.target
      if (navRef.current?.contains(target) || toggleRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  return (
    <header className="site-header">
      <a className="brand" href={isHome ? '#top' : '/'} aria-label="Mark Anton home">
        <span className="brand-mark" aria-hidden="true">MB</span>
        <span>Mark Anton</span>
      </a>

      <button
        ref={toggleRef}
        className="nav-toggle"
        type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
      </button>

      <nav
        ref={navRef}
        id="primary-navigation"
        className={open ? 'primary-nav is-open' : 'primary-nav'}
        aria-label="Primary navigation"
      >
        {navItems.map(([label, href]) => (
          <a key={href} href={linkTo(href)} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <a
          href="/files/Mark-Anton-Badong-Resume.pdf"
          target="_blank"
          rel="noreferrer"
          onClick={() => setOpen(false)}
        >
          Résumé
        </a>
        <a className="nav-cta" href={linkTo('#contact')} onClick={() => setOpen(false)}>Work with me</a>
      </nav>
    </header>
  )
}
