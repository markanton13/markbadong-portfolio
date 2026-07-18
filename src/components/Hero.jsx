export function Hero() {
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
          <a className="button button-primary" href="#work">Explore my work</a>
          <a className="button button-secondary" href="#contact">Start a conversation</a>
        </div>
      </div>

      <aside className="hero-proof" aria-label="Professional summary">
        <p className="proof-label">Current focus</p>
        <p className="proof-main">Systems-minded support for modern remote work.</p>
        <div className="proof-grid">
          <div><strong>Production</strong><span>deployed bots & tools</span></div>
          <div><strong>Full-stack</strong><span>workflow applications</span></div>
          <div><strong>Enterprise</strong><span>training & operations</span></div>
          <div><strong>Client work</strong><span>web & CRM delivery</span></div>
        </div>
      </aside>
    </section>
  )
}
