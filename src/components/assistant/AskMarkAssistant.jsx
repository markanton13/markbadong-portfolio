import { useEffect, useMemo, useRef, useState } from 'react'
import { AskMarkIntakeForm } from './AskMarkIntakeForm'
import { AssistantMessage } from './AssistantMessage'
import { AssistantSuggestionChips } from './AssistantSuggestionChips'
import { AssistantTypingIndicator } from './AssistantTypingIndicator'
import {
  getMockResponse,
  getPromptResponse,
  getPromptsForRoute,
} from './assistantMockData'
import { getAskMarkResponse } from './askMarkApiClient'
import { resolveAskMarkIntakeConfig } from './askMarkIntakeClient.js'
import '../../styles/assistant.css'

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Hi! I’m Mark’s AI portfolio assistant. I can help you explore his projects, skills, experience, and the ways he may support your team or business.',
}

const createMessageId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

function IconButton({ label, children, ...props }) {
  return (
    <button className="ask-mark-icon-button" type="button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}

function MinimizeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M5 10h10" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m6 6 8 8M14 6l-8 8" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m3 4 14 6-14 6 2-6-2-6Z" />
      <path d="M5 10h7" />
    </svg>
  )
}

export function AskMarkAssistant({ environment = import.meta.env } = {}) {
  const pathname = window.location.pathname
  const prompts = useMemo(() => getPromptsForRoute(pathname), [pathname])
  const intakeEnabled = useMemo(
    () => resolveAskMarkIntakeConfig(environment).enabled,
    [environment],
  )
  const [panelState, setPanelState] = useState('closed')
  const [panelView, setPanelView] = useState('assistant')
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('')
  const [conversationContext, setConversationContext] = useState(null)
  const launcherRef = useRef(null)
  const intakeEntryRef = useRef(null)
  const composerRef = useRef(null)
  const messageListRef = useRef(null)
  const requestTimerRef = useRef(null)
  const requestSequenceRef = useRef(0)

  const isOpen = panelState === 'open'
  const isMinimized = panelState === 'minimized'
  const isIntakeView = panelView === 'intake' && intakeEnabled
  const hasVisitorMessage = messages.some((message) => message.role === 'user')

  useEffect(() => {
    if (!isOpen || isIntakeView) return undefined

    const focusTimer = window.setTimeout(
      () => composerRef.current?.focus(),
      80,
    )
    return () => window.clearTimeout(focusTimer)
  }, [isIntakeView, isOpen])

  useEffect(() => {
    const list = messageListRef.current
    if (!list || !isOpen || isIntakeView) return

    list.scrollTo({
      top: list.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [isIntakeView, messages, isLoading, isOpen])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && panelState !== 'closed') {
        setPanelView('assistant')
        setPanelState('closed')
        window.setTimeout(() => launcherRef.current?.focus(), 0)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelState])

  useEffect(
    () => () => {
      requestSequenceRef.current += 1

      if (requestTimerRef.current) {
        window.clearTimeout(requestTimerRef.current)
      }
    },
    [],
  )

  const openPanel = () => setPanelState('open')

  const closePanel = () => {
    setPanelView('assistant')
    setPanelState('closed')
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }

  const minimizePanel = () => {
    setPanelView('assistant')
    setPanelState('minimized')
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }

  const submitQuestion = (question, promptId = null) => {
    const cleaned = question.trim()
    if (!cleaned || isLoading) return

    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence

    const userMessage = {
      id: createMessageId('visitor'),
      role: 'user',
      text: cleaned,
    }

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setLastQuestion(cleaned)
    setIsLoading(true)

    requestTimerRef.current = window.setTimeout(async () => {
      try {
        const fallbackResponse = promptId
          ? getPromptResponse(promptId)
          : getMockResponse(
              cleaned,
              pathname,
              conversationContext,
            )

        if (!fallbackResponse) {
          throw new Error(
            'No approved static response was available.',
          )
        }

        const response = await getAskMarkResponse(
          cleaned,
          fallbackResponse,
        )

        if (requestSequence !== requestSequenceRef.current) {
          return
        }

        const projectSource = response.sources?.find((item) =>
          item.href?.startsWith('/projects/'),
        )

        if (response.context === null) {
          setConversationContext(null)
        } else if (response.context) {
          setConversationContext(response.context)
        } else if (projectSource) {
          setConversationContext({
            type: 'project',
            id: projectSource.href.replace('/projects/', ''),
            label: projectSource.label,
          })
        }

        setMessages((current) => [
          ...current,
          {
            id: createMessageId('assistant'),
            role: 'assistant',
            text: response.answer,
            sources: response.sources,
            actions: response.actions,
            followUps: response.followUps,
            category: response.category,
            delivery: response.delivery,
          },
        ])
      } catch {
        if (requestSequence !== requestSequenceRef.current) {
          return
        }

        setMessages((current) => [
          ...current,
          {
            id: createMessageId('error'),
            role: 'assistant',
            text:
              'I could not prepare that portfolio answer. You can retry, or contact Mark directly for the most accurate response.',
            actions: [
              {
                label: 'Contact Mark',
                href: '/#contact',
                type: 'contact',
                external: false,
              },
            ],
            isError: true,
          },
        ])
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setIsLoading(false)
          requestTimerRef.current = null
        }
      }
    }, 260)
  }

  const handlePrompt = (prompt) => {
    openPanel()
    submitQuestion(prompt.question, prompt.id)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    submitQuestion(draft)
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitQuestion(draft)
    }
  }

  const clearConversation = () => {
    requestSequenceRef.current += 1

    if (requestTimerRef.current) {
      window.clearTimeout(requestTimerRef.current)
      requestTimerRef.current = null
    }

    setMessages([WELCOME_MESSAGE])
    setDraft('')
    setLastQuestion('')
    setConversationContext(null)
    setIsLoading(false)
    window.setTimeout(() => composerRef.current?.focus(), 0)
  }

  const retryLastQuestion = () => {
    if (!lastQuestion || isLoading) return
    submitQuestion(lastQuestion)
  }

  const openIntakeView = () => {
    if (!intakeEnabled || isLoading) return
    setPanelView('intake')
  }

  const returnToAssistant = () => {
    setPanelView('assistant')
    window.setTimeout(
      () => intakeEntryRef.current?.focus(),
      0,
    )
  }

  return (
    <aside className="ask-mark-root" aria-label="Ask Mark portfolio assistant">
      {isMinimized && (
        <div className="ask-mark-minimized" role="status">
          <button type="button" onClick={openPanel}>
            <img
              src="/images/ask-mark/ask-mark-mascot.webp"
              alt=""
              width="34"
              height="34"
            />
            <span>
              <strong>Ask Mark</strong>
              <small>Conversation saved</small>
            </span>
          </button>
          <IconButton label="Close Ask Mark" onClick={closePanel}>
            <CloseIcon />
          </IconButton>
        </div>
      )}

      <section
        id="ask-mark-panel"
        className={`ask-mark-panel${isOpen ? ' is-open' : ''}`}
        aria-label="Ask Mark AI portfolio concierge"
        aria-hidden={!isOpen}
      >
        <header className="ask-mark-header">
          <div className="ask-mark-header__identity">
            <img
              src="/images/ask-mark/ask-mark-mascot.webp"
              alt=""
              width="46"
              height="46"
            />
            <div>
              <strong>Ask Mark</strong>
              <span><i aria-hidden="true" /> AI Portfolio Concierge</span>
            </div>
          </div>

          <div className="ask-mark-header__controls">
            <IconButton label="Minimize Ask Mark" onClick={minimizePanel}>
              <MinimizeIcon />
            </IconButton>
            <IconButton label="Close Ask Mark" onClick={closePanel}>
              <CloseIcon />
            </IconButton>
          </div>
        </header>

        {isIntakeView ? (
          <div className="ask-mark-intake-view">
            <AskMarkIntakeForm
              onCancel={returnToAssistant}
            />
          </div>
        ) : (
          <>
            <div
              className="ask-mark-messages"
          ref={messageListRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          <div className="ask-mark-notice">
            Answers use information published and approved by Mark.
          </div>

          {messages.map((message) => (
            <AssistantMessage
              key={message.id}
              message={message}
              onFollowUp={(followUp) =>
                submitQuestion(followUp.question, followUp.promptId)
              }
            />
          ))}

          {!hasVisitorMessage && (
            <AssistantSuggestionChips
              prompts={prompts}
              onSelect={handlePrompt}
              disabled={isLoading}
            />
          )}

          {isLoading && <AssistantTypingIndicator />}

          {!isLoading &&
            messages.at(-1)?.isError &&
            lastQuestion && (
              <button className="ask-mark-retry" type="button" onClick={retryLastQuestion}>
                Retry the last question
              </button>
            )}
        </div>

        <footer className="ask-mark-composer">
          <form onSubmit={handleSubmit}>
            <label className="ask-mark-sr-only" htmlFor="ask-mark-input">
              Ask a question about Mark’s portfolio
            </label>
            <textarea
              id="ask-mark-input"
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 500))}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask about Mark’s projects, skills, or experience…"
              rows="1"
              maxLength="500"
              disabled={isLoading}
            />
            <button
              className="ask-mark-send"
              type="submit"
              disabled={!draft.trim() || isLoading}
              aria-label="Send question"
            >
              <SendIcon />
            </button>
          </form>

          <div className="ask-mark-composer__meta">
            <span>{draft.length}/500</span>
            <button type="button" onClick={clearConversation} disabled={isLoading}>
              Clear conversation
            </button>
          </div>

          {intakeEnabled && (
            <button
              ref={intakeEntryRef}
              className="ask-mark-intake-entry"
              type="button"
              onClick={openIntakeView}
              disabled={isLoading}
            >
              Submit a question, correction, or feedback
            </button>
          )}

          <p>
            Avoid submitting confidential or sensitive information.
          </p>
            </footer>
          </>
        )}
      </section>

      <div className="ask-mark-launcher-wrap">
        <span className="ask-mark-launcher-label" aria-hidden="true">
          Ask Mark
        </span>
        <button
          ref={launcherRef}
          className="ask-mark-launcher"
          type="button"
          aria-label={isOpen ? 'Close Ask Mark' : 'Open Ask Mark'}
          aria-expanded={isOpen}
          aria-controls="ask-mark-panel"
          onClick={() => {
            if (isOpen) closePanel()
            else openPanel()
          }}
        >
          <img
            src="/images/ask-mark/ask-mark-mascot.webp"
            alt=""
            width="64"
            height="64"
          />
          <span className="ask-mark-launcher__status" aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
