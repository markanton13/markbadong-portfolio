export function AssistantSuggestionChips({ prompts, onSelect, disabled }) {
  return (
    <div className="ask-mark-suggestions" aria-label="Suggested questions">
      <p>Try asking</p>
      <div>
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelect(prompt)}
            disabled={disabled}
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
