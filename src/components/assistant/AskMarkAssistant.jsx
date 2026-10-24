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
import {
  ASK_MARK_CONTEXT_TTL_MS,
  createAskMarkKnowledgeContext,
  createAskMarkRequestLifecycle,
  getAskMarkKnowledgeKeysFromResponse,
  getAskMarkTurn,
  getFreshAskMarkKnowledgeKeys,
} from './askMarkConversation'
import { resolveAskMarkIntakeConfig } from './askMarkIntakeClient.js'
import '../../styles/assistant.css'

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Hi, I’m Ask Mark. I can answer questions about Mark’s approved projects, skills, and professional background.',
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
  const [conversationContextUpdatedAt, setConversationContextUpdatedAt] = useState(0)
  const [approvedKnowledgeContext, setApprovedKnowledgeContext] = useState(null)
  const [isSlow, setIsSlow] = useState(false)
  const launcherRef = useRef(null)
  const returnFocusRef = useRef(null)
  const intakeEntryRef = useRef(null)
  const composerRef = useRef(null)
  const messageListRef = useRef(null)
  const isAtBottomRef = useRef(true)
  const requestTimerRef = useRef(null)
  const slowTimerRef = useRef(null)
  const requestLifecycleRef = useRef(null)
  const cancelActiveRequestRef = useRef(null)
  if (!requestLifecycleRef.current) {
    requestLifecycleRef.current = createAskMarkRequestLifecycle()
  }

  const isOpen = panelState === 'open'
  const isMinimized = panelState === 'minimized'
  const isIntakeView = panelView === 'intake' && intakeEnabled
  const hasVisitorMessage = messages.some((message) => message.role === 'user')

  useEffect(() => {
    const openFromProjectCard = (event) => {
      if (event.detail?.trigger instanceof HTMLElement) {
        returnFocusRef.current = event.detail.trigger
      }
      setPanelView('assistant')
      setPanelState('open')
    }

    window.addEventListener('ask-mark:open', openFromProjectCard)
    return () => window.removeEventListener('ask-mark:open', openFromProjectCard)
  }, [])

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
    if (!list || !isOpen || isIntakeView || !isAtBottomRef.current) return

    list.scrollTo({
      top: list.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [isIntakeView, messages, isLoading, isOpen])

  useEffect(() => {
    const updatedAt = Math.max(
      conversationContextUpdatedAt,
      approvedKnowledgeContext?.updatedAt || 0,
    )
    if (!updatedAt) return undefined
    const remaining = ASK_MARK_CONTEXT_TTL_MS - (Date.now() - updatedAt)
    if (remaining <= 0) {
      setConversationContext(null)
      setConversationContextUpdatedAt(0)
      setApprovedKnowledgeContext(null)
      return undefined
    }
    const expiryTimer = window.setTimeout(() => {
      setConversationContext(null)
      setConversationContextUpdatedAt(0)
      setApprovedKnowledgeContext(null)
    }, remaining)
    return () => window.clearTimeout(expiryTimer)
  }, [approvedKnowledgeContext, conversationContextUpdatedAt])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && panelState !== 'closed') {
        cancelActiveRequestRef.current?.()
        setPanelView('assistant')
        setPanelState('closed')
        window.setTimeout(() => (returnFocusRef.current || launcherRef.current)?.focus(), 0)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [panelState])

  useEffect(() => {
    const cancelForNavigation = () => {
      requestLifecycleRef.current.cancel()
      if (requestTimerRef.current) {
        window.clearTimeout(requestTimerRef.current)
      }
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current)
    }
    window.addEventListener('pagehide', cancelForNavigation)
    return () => {
      window.removeEventListener('pagehide', cancelForNavigation)
      cancelForNavigation()
    }
  }, [])

  const cancelActiveRequest = (announce = false) => {
    const wasLoading = requestLifecycleRef.current.cancel() > 0 && isLoading
    if (requestTimerRef.current) {
      window.clearTimeout(requestTimerRef.current)
      requestTimerRef.current = null
    }
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
    setIsLoading(false)
    setIsSlow(false)
    if (announce && wasLoading) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId('cancelled'),
          role: 'assistant',
          text: 'I stopped preparing that response. You can ask another question anytime.',
        },
      ])
    }
  }
  cancelActiveRequestRef.current = cancelActiveRequest

  const openPanel = () => setPanelState('open')

  const closePanel = () => {
    cancelActiveRequest()
    setPanelView('assistant')
    setPanelState('closed')
    window.setTimeout(() => (returnFocusRef.current || launcherRef.current)?.focus(), 0)
  }

  const minimizePanel = () => {
    cancelActiveRequest()
    setPanelView('assistant')
    setPanelState('minimized')
    window.setTimeout(() => (returnFocusRef.current || launcherRef.current)?.focus(), 0)
  }

  const submitQuestion = (question, promptId = null) => {
    const cleaned = question.trim()
    if (!cleaned || isLoading) return

    const request = requestLifecycleRef.current.begin()

    const userMessage = {
      id: createMessageId('visitor'),
      role: 'user',
      text: cleaned,
    }

    isAtBottomRef.current = true
    setMessages((current) => [...current, userMessage])
    setDraft('')
    setLastQuestion(cleaned)
    setIsLoading(true)
    setIsSlow(false)
    slowTimerRef.current = window.setTimeout(() => {
      if (requestLifecycleRef.current.isCurrent(request.sequence)) setIsSlow(true)
    }, 2200)

    requestTimerRef.current = window.setTimeout(async () => {
      try {
        const fallbackResponse = promptId
          ? getPromptResponse(promptId)
          : getMockResponse(
              cleaned,
              pathname,
              Date.now() - conversationContextUpdatedAt <= ASK_MARK_CONTEXT_TTL_MS
                ? conversationContext
                : null,
            )

        if (!fallbackResponse) {
          throw new Error(
            'No approved static response was available.',
          )
        }

        const response = await getAskMarkTurn(
          cleaned,
          fallbackResponse,
          {
            environment,
            knowledgeKeys: getFreshAskMarkKnowledgeKeys(approvedKnowledgeContext),
            signal: request.signal,
          },
        )

        if (!requestLifecycleRef.current.isCurrent(request.sequence)) {
          return
        }

        const projectSource = response.sources?.find((item) =>
          item.href?.startsWith('/projects/'),
        )

        if (response.context === null) {
          setConversationContext(null)
          setConversationContextUpdatedAt(0)
        } else if (response.context) {
          setConversationContext(response.context)
          setConversationContextUpdatedAt(Date.now())
        } else if (projectSource) {
          setConversationContext({
            type: 'project',
            id: projectSource.href.replace('/projects/', ''),
            label: projectSource.label,
          })
          setConversationContextUpdatedAt(Date.now())
        }
        setApprovedKnowledgeContext(
          createAskMarkKnowledgeContext(getAskMarkKnowledgeKeysFromResponse(response)),
        )

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
        if (!requestLifecycleRef.current.isCurrent(request.sequence)) {
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
        if (requestLifecycleRef.current.isCurrent(request.sequence)) {
          setIsLoading(false)
          setIsSlow(false)
          requestTimerRef.current = null
          requestLifecycleRef.current.finish(request.sequence)
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
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent?.isComposing &&
      event.nativeEvent?.keyCode !== 229
    ) {
      event.preventDefault()
      submitQuestion(draft)
    }
  }

  const handleMessageScroll = (event) => {
    const element = event.currentTarget
    isAtBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80
  }

  const clearConversation = () => {
    cancelActiveRequest()

    isAtBottomRef.current = true
    setMessages([WELCOME_MESSAGE])
    setDraft('')
    setLastQuestion('')
    setConversationContext(null)
    setConversationContextUpdatedAt(0)
    setApprovedKnowledgeContext(null)
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
              <small>Conversation paused</small>
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
        aria-label="Ask Mark portfolio assistant"
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
              <span><i aria-hidden="true" /> Portfolio assistant</span>
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
              onScroll={handleMessageScroll}
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
              {isSlow && isLoading && (
                <p className="ask-mark-waiting" role="status" aria-live="polite">
                  This is taking a little longer. You can keep waiting or cancel.
                </p>
              )}

              {!isLoading && messages.at(-1)?.isError && lastQuestion && (
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
              enterKeyHint="send"
              aria-describedby="ask-mark-input-hint"
              placeholder="Ask about Mark’s projects, skills, or experience…"
              rows="1"
              maxLength="500"
              disabled={isLoading}
            />
            <span id="ask-mark-input-hint" className="ask-mark-sr-only">
              Press Enter to send. Press Shift and Enter to add a line.
            </span>
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
            {isLoading && (
              <button className="ask-mark-cancel" type="button" onClick={() => cancelActiveRequest(true)}>
                Cancel response
              </button>
            )}
            <button type="button" onClick={clearConversation}>
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
            else {
              returnFocusRef.current = launcherRef.current
              openPanel()
            }
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
