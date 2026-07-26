import { lazy, Suspense } from 'react'

const AskMarkAssistant = lazy(() =>
  import('./AskMarkAssistant').then((module) => ({
    default: module.AskMarkAssistant,
  })),
)

export function LazyAskMarkAssistant() {
  return (
    <Suspense fallback={null}>
      <AskMarkAssistant />
    </Suspense>
  )
}