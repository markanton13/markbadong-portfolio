function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M6 3h7v7M13 3 5 11" />
      <path d="M11 9v4H3V5h4" />
    </svg>
  )
}

export function AssistantMessage({ message, onAction, onFollowUp }) {
  const isAssistant = message.role === 'assistant'

  return (
    <article
      className={`ask-mark-message ask-mark-message--${message.role}`}
      aria-label={isAssistant ? 'Ask Mark response' : 'Your message'}
    >
      {isAssistant && (
        <img
          className="ask-mark-message__avatar"
          src="/images/ask-mark/ask-mark-mascot.webp"
          alt=""
          width="36"
          height="36"
        />
      )}

      <div className="ask-mark-message__content">
        <p>{message.text}</p>

        {message.sources?.length > 0 && (
          <div className="ask-mark-sources" aria-label="Relevant portfolio sources">
            <span className="ask-mark-sources__label">Portfolio proof</span>
            <div className="ask-mark-sources__list">
              {message.sources.map((source) => (
                <a key={`${source.href}-${source.label}`} href={source.href}>
                  {source.label}
                  <span aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {message.followUps?.length > 0 && (
          <div className="ask-mark-follow-ups" aria-label="Confirm what you meant">
            {message.followUps.map((followUp) => (
              <button
                key={`${followUp.promptId}-${followUp.label}`}
                type="button"
                onClick={() => onFollowUp?.(followUp)}
              >
                {followUp.label}
              </button>
            ))}
          </div>
        )}

        {message.actions?.length > 0 && (
          <div className="ask-mark-actions" aria-label="Recommended actions">
            {message.actions.map((item) => (
              <a
                key={`${item.href}-${item.label}`}
                className={`ask-mark-action ask-mark-action--${item.type}`}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                onClick={() => onAction?.(item)}
              >
                <span>{item.label}</span>
                {item.external ? <ExternalIcon /> : <span aria-hidden="true">→</span>}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
