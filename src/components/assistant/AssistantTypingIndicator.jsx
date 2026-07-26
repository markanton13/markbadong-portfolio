export function AssistantTypingIndicator() {
  return (
    <div className="ask-mark-typing" role="status" aria-label="Ask Mark is preparing a response">
      <img
        src="/images/ask-mark/ask-mark-mascot.webp"
        alt=""
        width="36"
        height="36"
      />
      <span><i /><i /><i /></span>
      <span className="ask-mark-sr-only">Ask Mark is preparing a response.</span>
    </div>
  )
}
