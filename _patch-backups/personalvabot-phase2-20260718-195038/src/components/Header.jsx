import { useEffect, useState } from 'react'

const navItems = [
  ['Work', '#work'],
  ['Capabilities', '#capabilities'],
  ['About', '#about'],
  ['Contact', '#contact'],
]

export function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 820) setOpen(false)
    }
    window.addEventListener('resize', closeOnResize)
    return () => window.removeEventListener('resize', closeOnResize)
  }, [])

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Mark Anton home">
        <span className="brand-mark" aria-hidden="true">MB</span>
        <span>Mark Anton</span>
      </a>

      <button
        className="nav-toggle"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
      </button>

      <nav id="primary-navigation" className={open ? 'primary-nav is-open' : 'primary-nav'} aria-label="Primary navigation">
        {navItems.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <a className="nav-cta" href="#contact" onClick={() => setOpen(false)}>Work with me</a>
      </nav>
    </header>
  )
}
