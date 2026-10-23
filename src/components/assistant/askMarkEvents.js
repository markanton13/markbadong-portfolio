export function requestAskMarkOpen(trigger) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('ask-mark:open', {
      detail: { trigger },
    }),
  )
}
