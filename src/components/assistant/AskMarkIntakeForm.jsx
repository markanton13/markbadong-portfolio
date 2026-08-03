import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  ASK_MARK_INTAKE_LANGUAGES,
  ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS,
  ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS,
  ASK_MARK_INTAKE_TYPES,
  countAskMarkIntakeCodePoints,
  prepareAskMarkIntakeSubmission,
  submitAskMarkIntake,
} from './askMarkIntakeClient.js'
import {
  MESSAGE_VALIDATION_CODES,
  mapAskMarkIntakeResult,
} from './askMarkIntakeFormState.js'

const TYPE_LABELS = Object.freeze({
  question: 'Question',
  correction: 'Correction',
  feedback: 'Feedback',
})

const LANGUAGE_LABELS = Object.freeze({
  en: 'English',
  tl: 'Tagalog / Filipino',
  taglish: 'Taglish',
})

export function AskMarkIntakeForm({
  onCancel,
  onAccepted,
  submitIntake = submitAskMarkIntake,
}) {
  const headingId = useId()
  const descriptionId = useId()
  const privacyId = useId()
  const messageHelpId = useId()
  const statusId = useId()

  const [type, setType] = useState('question')
  const [language, setLanguage] = useState('taglish')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState({
    state: 'editing',
    tone: 'neutral',
    title: '',
    message: '',
  })

  const messageRef = useRef(null)
  const requestSequenceRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      requestSequenceRef.current += 1
    }
  }, [])

  const messageCount = countAskMarkIntakeCodePoints(message)
  const isSubmitting = status.state === 'submitting'
  const isAccepted = status.state === 'accepted'
  const messageHasError =
    status.state === 'validation_error' &&
    MESSAGE_VALIDATION_CODES.has(status.code)

  const resetForAnother = () => {
    setStatus({
      state: 'editing',
      tone: 'neutral',
      title: '',
      message: '',
    })
    window.setTimeout(() => messageRef.current?.focus(), 0)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const submission = {
      type,
      language,
      message,
    }

    const prepared = prepareAskMarkIntakeSubmission(submission)

    if (!prepared.ok) {
      const nextStatus = mapAskMarkIntakeResult(prepared)
      setStatus(nextStatus)

      if (MESSAGE_VALIDATION_CODES.has(prepared.error.code)) {
        window.setTimeout(() => messageRef.current?.focus(), 0)
      }

      return
    }

    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence

    setStatus({
      state: 'submitting',
      tone: 'neutral',
      title: 'Submitting',
      message: 'Sending your submission for private review…',
    })

    const result = await submitIntake(
      prepared.value.submission,
    )

    if (
      !mountedRef.current ||
      requestSequence !== requestSequenceRef.current
    ) {
      return
    }

    const nextStatus = mapAskMarkIntakeResult(result)
    setStatus(nextStatus)

    if (result.ok) {
      setMessage('')

      if (typeof onAccepted === 'function') {
        onAccepted(result.submission)
      }

      return
    }

    if (MESSAGE_VALIDATION_CODES.has(result.error.code)) {
      window.setTimeout(() => messageRef.current?.focus(), 0)
    }
  }

  if (isAccepted) {
    return (
      <section
        className="ask-mark-intake ask-mark-intake--accepted"
        aria-labelledby={headingId}
      >
        <div
          className="ask-mark-intake__accepted"
          role="status"
        >
          <span aria-hidden="true">✓</span>
          <p className="ask-mark-intake__eyebrow">
            Submission received
          </p>
          <h2 id={headingId}>{status.title}</h2>
          <p>{status.message}</p>
        </div>

        <div className="ask-mark-intake__actions">
          <button
            className="ask-mark-intake__button ask-mark-intake__button--secondary"
            type="button"
            onClick={resetForAnother}
          >
            Submit another
          </button>
          <button
            className="ask-mark-intake__button ask-mark-intake__button--primary"
            type="button"
            onClick={onCancel}
          >
            Return to Ask Mark
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="ask-mark-intake"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <header className="ask-mark-intake__header">
        <p className="ask-mark-intake__eyebrow">
          Private visitor intake
        </p>
        <h2 id={headingId}>
          Submit something for Mark to review
        </h2>
        <p id={descriptionId}>
          Send an unanswered question, possible correction,
          or general feedback about Ask Mark.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="ask-mark-intake__grid">
          <label className="ask-mark-intake__field">
            <span>Submission type</span>
            <select
              name="ask-mark-intake-type"
              value={type}
              onChange={(event) => {
                setType(event.target.value)
                setStatus({
                  state: 'editing',
                  tone: 'neutral',
                  title: '',
                  message: '',
                })
              }}
              disabled={isSubmitting}
            >
              {ASK_MARK_INTAKE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="ask-mark-intake__field">
            <span>Language</span>
            <select
              name="ask-mark-intake-language"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value)
                setStatus({
                  state: 'editing',
                  tone: 'neutral',
                  title: '',
                  message: '',
                })
              }}
              disabled={isSubmitting}
            >
              {ASK_MARK_INTAKE_LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {LANGUAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="ask-mark-intake__field">
          <span>Message</span>
          <textarea
            ref={messageRef}
            autoFocus
            name="ask-mark-intake-message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)

              if (status.state !== 'editing') {
                setStatus({
                  state: 'editing',
                  tone: 'neutral',
                  title: '',
                  message: '',
                })
              }
            }}
            rows="6"
            placeholder="Share the question, correction, or feedback Mark should review…"
            aria-invalid={messageHasError}
            aria-describedby={`${messageHelpId} ${privacyId} ${statusId}`}
            disabled={isSubmitting}
          />
        </label>

        <div className="ask-mark-intake__message-meta">
          <p id={messageHelpId}>
            Use {ASK_MARK_INTAKE_MESSAGE_MIN_CODE_POINTS}–
            {ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS} characters.
          </p>
          <span
            className={[
              'ask-mark-intake__counter',
              messageCount >
              ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS
                ? 'is-error'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {messageCount}/
            {ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS}
          </span>
        </div>

        <p
          id={privacyId}
          className="ask-mark-intake__privacy"
        >
          Do not include confidential, sensitive, or personal
          contact information. Submissions are stored privately
          for review and are not automatically published.
        </p>

        <div
          id={statusId}
          className={[
            'ask-mark-intake__status',
            status.tone !== 'neutral'
              ? `is-${status.tone}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {status.message && (
            <>
              <strong>{status.title}</strong>
              <span>{status.message}</span>
            </>
          )}
        </div>

        <div className="ask-mark-intake__actions">
          <button
            className="ask-mark-intake__button ask-mark-intake__button--secondary"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="ask-mark-intake__button ask-mark-intake__button--primary"
            type="submit"
            disabled={
              isSubmitting ||
              messageCount === 0 ||
              messageCount >
                ASK_MARK_INTAKE_MESSAGE_MAX_CODE_POINTS
            }
          >
            {isSubmitting
              ? 'Submitting…'
              : 'Submit for private review'}
          </button>
        </div>
      </form>
    </section>
  )
}
