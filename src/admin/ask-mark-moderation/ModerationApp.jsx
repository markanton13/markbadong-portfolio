import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ModerationClientError,
  createModerationClient,
  resolveModerationConfig,
} from './moderationClient.js'

const STATUS_OPTIONS = [
  ['pending_review', 'Pending review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['archived', 'Archived'],
  ['received', 'Received'],
]

const TYPE_OPTIONS = [
  ['', 'All types'],
  ['question', 'Question'],
  ['correction', 'Correction'],
  ['feedback', 'Feedback'],
]

const LANGUAGE_OPTIONS = [
  ['', 'All languages'],
  ['en', 'English'],
  ['tl', 'Tagalog / Filipino'],
  ['taglish', 'Taglish'],
]

const ACTION_LABELS = {
  approve: 'Approve for curation',
  reject: 'Reject',
  archive: 'Archive',
  reopen: 'Reopen for review',
}

const REASON_OPTIONS = {
  approve: [
    ['useful_question', 'Useful question'],
    ['valid_correction', 'Valid correction'],
    ['helpful_feedback', 'Helpful feedback'],
    ['other', 'Other'],
  ],
  reject: [
    ['duplicate', 'Duplicate'],
    ['not_relevant', 'Not relevant'],
    ['unsafe_or_abusive', 'Unsafe or abusive'],
    [
      'contains_sensitive_data',
      'Contains sensitive data',
    ],
    ['not_actionable', 'Not actionable'],
    ['other', 'Other'],
  ],
  archive: [
    ['resolved', 'Resolved'],
    ['retention_cleanup', 'Retention cleanup'],
    ['other', 'Other'],
  ],
  reopen: [
    [
      'needs_reconsideration',
      'Needs reconsideration',
    ],
    ['other', 'Other'],
  ],
}

function actionsForStatus(status) {
  if (status === 'pending_review') {
    return ['approve', 'reject', 'archive']
  }

  if (
    status === 'approved' ||
    status === 'rejected'
  ) {
    return ['archive', 'reopen']
  }

  if (status === 'archived') {
    return ['reopen']
  }

  return []
}

function formatDate(value) {
  const parsed = Date.parse(value)

  if (!Number.isFinite(parsed)) {
    return value
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(parsed))
}

function expiryTone(expiresAt) {
  const remaining =
    Date.parse(expiresAt) - Date.now()

  if (!Number.isFinite(remaining)) {
    return 'neutral'
  }

  if (remaining <= 0) return 'danger'
  if (remaining <= 7 * 86_400_000) {
    return 'warning'
  }

  return 'neutral'
}

function friendlyError(error) {
  if (!(error instanceof ModerationClientError)) {
    return 'An unexpected local moderation error occurred.'
  }

  const messages = {
    admin_auth_required:
      'Enter the local moderation key.',
    admin_auth_invalid:
      'The local moderation key is invalid.',
    admin_origin_forbidden:
      'Open this page through the approved local moderation origin.',
    stale_submission:
      'This item changed in another review. The latest detail has been reloaded.',
    invalid_moderation_transition:
      'That action is no longer available for this status.',
    request_timeout:
      'The local moderation service took too long to respond.',
    network_error:
      'Start the local Ask Mark Worker, then try again.',
  }

  return messages[error.code] || error.message
}

function StatusPill({ status }) {
  return (
    <span
      className="moderation-status"
      data-status={status}
    >
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function HistoryList({
  title,
  entries,
  kind,
}) {
  return (
    <section
      className="moderation-history"
      aria-labelledby={`${kind}-history-title`}
    >
      <h3 id={`${kind}-history-title`}>
        {title}
      </h3>

      {entries.length === 0 ? (
        <p className="moderation-muted">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="moderation-history-row">
                <strong>
                  {kind === 'actions'
                    ? entry.action
                    : entry.event}
                </strong>
                <time dateTime={entry.createdAt}>
                  {formatDate(entry.createdAt)}
                </time>
              </div>

              <p>
                {entry.previousStatus || 'none'}
                {' → '}
                {entry.resultingStatus}
              </p>

              {entry.reasonCode ? (
                <p>
                  Reason: {entry.reasonCode}
                </p>
              ) : null}

              {entry.note ? (
                <p className="moderation-note">
                  {entry.note}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function ActionForm({
  submission,
  busy,
  onSubmit,
}) {
  const availableActions = actionsForStatus(
    submission.status,
  )
  const [action, setAction] = useState(
    availableActions[0] || '',
  )
  const [reasonCode, setReasonCode] =
    useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const next =
      actionsForStatus(submission.status)[0] ||
      ''

    setAction(next)
    setReasonCode('')
    setNote('')
  }, [submission.id, submission.status])

  const reasons = REASON_OPTIONS[action] || []

  useEffect(() => {
    setReasonCode(reasons[0]?.[0] || '')
  }, [action])

  if (availableActions.length === 0) {
    return (
      <section className="moderation-action-card">
        <h3>Decision</h3>
        <p className="moderation-muted">
          No moderation action is available for
          this status.
        </p>
      </section>
    )
  }

  function submit(event) {
    event.preventDefault()

    onSubmit({
      action,
      expectedStatus: submission.status,
      expectedUpdatedAt:
        submission.updatedAt,
      reasonCode,
      note,
    })
  }

  return (
    <form
      className="moderation-action-card"
      onSubmit={submit}
    >
      <h3>Record a private decision</h3>

      <label>
        Action
        <select
          value={action}
          onChange={(event) =>
            setAction(event.target.value)
          }
          disabled={busy}
        >
          {availableActions.map((value) => (
            <option
              key={value}
              value={value}
            >
              {ACTION_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Reason
        <select
          value={reasonCode}
          onChange={(event) =>
            setReasonCode(event.target.value)
          }
          disabled={busy}
          required
        >
          {reasons.map(([value, label]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Private note
        <textarea
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          maxLength={1000}
          rows={4}
          disabled={busy}
          placeholder="Optional note for later curation. Never published automatically."
        />
      </label>

      <div className="moderation-note-count">
        {Array.from(note).length}/1000
      </div>

      <button
        type="submit"
        className="moderation-primary"
        disabled={
          busy ||
          !action ||
          !reasonCode
        }
      >
        {busy
          ? 'Saving decision…'
          : `Confirm ${action}`}
      </button>

      <p className="moderation-safety-copy">
        Approval marks a private curation
        candidate only. It never publishes
        knowledge.
      </p>
    </form>
  )
}

function DetailPanel({
  detail,
  loading,
  error,
  busy,
  onClose,
  onAction,
}) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [detail?.id])

  if (!detail && !loading && !error) {
    return (
      <aside className="moderation-detail moderation-detail-empty">
        <p>Select a submission to review.</p>
      </aside>
    )
  }

  return (
    <aside
      className="moderation-detail"
      aria-label="Submission detail"
    >
      <div className="moderation-detail-header">
        <div>
          <p className="moderation-eyebrow">
            Private submission
          </p>
          <h2>Review detail</h2>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          className="moderation-icon-button"
          onClick={onClose}
          aria-label="Close submission detail"
        >
          ×
        </button>
      </div>

      {loading ? (
        <p role="status">Loading detail…</p>
      ) : null}

      {error ? (
        <p
          className="moderation-alert"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {detail ? (
        <>
          <div className="moderation-detail-meta">
            <StatusPill status={detail.status} />
            <span>{detail.type}</span>
            <span>{detail.language}</span>
          </div>

          <p className="moderation-message">
            {detail.message}
          </p>

          <dl className="moderation-dates">
            <div>
              <dt>Received</dt>
              <dd>
                <time dateTime={detail.createdAt}>
                  {formatDate(detail.createdAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                <time dateTime={detail.updatedAt}>
                  {formatDate(detail.updatedAt)}
                </time>
              </dd>
            </div>
            <div
              data-tone={expiryTone(
                detail.expiresAt,
              )}
            >
              <dt>Expires</dt>
              <dd>
                <time dateTime={detail.expiresAt}>
                  {formatDate(detail.expiresAt)}
                </time>
              </dd>
            </div>
          </dl>

          <ActionForm
            submission={detail}
            busy={busy}
            onSubmit={onAction}
          />

          <HistoryList
            title="Moderation actions"
            entries={detail.actions}
            kind="actions"
          />

          <HistoryList
            title="Lifecycle events"
            entries={detail.events}
            kind="events"
          />
        </>
      ) : null}
    </aside>
  )
}

export default function ModerationApp() {
  const config = useMemo(
    () =>
      resolveModerationConfig(
        import.meta.env,
      ),
    [],
  )
  const keyInputRef = useRef(null)
  const [adminKey, setAdminKey] =
    useState('')
  const [sessionKey, setSessionKey] =
    useState('')
  const [status, setStatus] =
    useState('pending_review')
  const [type, setType] = useState('')
  const [language, setLanguage] =
    useState('')
  const [submissions, setSubmissions] =
    useState([])
  const [nextCursor, setNextCursor] =
    useState(null)
  const [selectedId, setSelectedId] =
    useState(null)
  const [detail, setDetail] = useState(null)
  const [queueLoading, setQueueLoading] =
    useState(false)
  const [detailLoading, setDetailLoading] =
    useState(false)
  const [actionBusy, setActionBusy] =
    useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [detailError, setDetailError] =
    useState('')

  const client = useMemo(() => {
    if (!config.enabled || !sessionKey) {
      return null
    }

    return createModerationClient({
      baseUrl: config.baseUrl,
      adminKey: sessionKey,
    })
  }, [
    config.baseUrl,
    config.enabled,
    sessionKey,
  ])

  async function loadQueue({
    append = false,
    cursor = null,
    clientOverride = client,
  } = {}) {
    if (!clientOverride) return false

    setQueueLoading(true)
    setError('')

    try {
      const payload =
        await clientOverride.list({
          status,
          type,
          language,
          limit: 20,
          cursor,
        })

      setSubmissions((current) =>
        append
          ? [
              ...current,
              ...payload.submissions,
            ]
          : payload.submissions,
      )
      setNextCursor(
        payload.page?.nextCursor || null,
      )

      return true
    } catch (caught) {
      setError(friendlyError(caught))

      if (
        caught.code ===
          'admin_auth_invalid' ||
        caught.code ===
          'admin_auth_required'
      ) {
        setSessionKey('')
        setAdminKey('')
        queueMicrotask(() =>
          keyInputRef.current?.focus(),
        )
      }

      return false
    } finally {
      setQueueLoading(false)
    }
  }

  async function unlock(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (adminKey.length < 32) {
      setError(
        'Enter the local moderation key of at least 32 characters.',
      )
      return
    }

    const candidate = createModerationClient({
      baseUrl: config.baseUrl,
      adminKey,
    })

    const loaded = await loadQueue({
      clientOverride: candidate,
    })

    if (loaded) {
      setSessionKey(adminKey)
      setAdminKey('')
      setMessage(
        'Private moderation session unlocked.',
      )
    }
  }

  function lockSession() {
    setAdminKey('')
    setSessionKey('')
    setSubmissions([])
    setNextCursor(null)
    setSelectedId(null)
    setDetail(null)
    setMessage('Private session locked.')
    setError('')
    queueMicrotask(() =>
      keyInputRef.current?.focus(),
    )
  }

  async function openDetail(id) {
    if (!client) return

    setSelectedId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)

    try {
      const payload = await client.detail(id)
      setDetail(payload.submission)
    } catch (caught) {
      setDetailError(friendlyError(caught))
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setDetailError('')
  }

  async function applyAction(action) {
    if (!client || !detail) return

    setActionBusy(true)
    setDetailError('')
    setMessage('')

    try {
      await client.act(
        detail.id,
        action,
      )

      const [latest] = await Promise.all([
        client.detail(detail.id),
        loadQueue(),
      ])

      setDetail(latest.submission)
      setMessage(
        `${ACTION_LABELS[action.action]} saved privately.`,
      )
    } catch (caught) {
      setDetailError(friendlyError(caught))

      if (
        caught.code === 'stale_submission'
      ) {
        try {
          const latest =
            await client.detail(detail.id)
          setDetail(latest.submission)
          await loadQueue()
        } catch (reloadError) {
          setDetailError(
            friendlyError(reloadError),
          )
        }
      }
    } finally {
      setActionBusy(false)
    }
  }

  useEffect(() => {
    if (!client) return

    loadQueue()
  }, [client, status, type, language])

  useEffect(() => {
    function handleEscape(event) {
      if (
        event.key === 'Escape' &&
        selectedId
      ) {
        closeDetail()
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape,
    )

    return () =>
      window.removeEventListener(
        'keydown',
        handleEscape,
      )
  }, [selectedId])

  if (!config.enabled) {
    return (
      <main className="moderation-shell moderation-disabled">
        <h1>Private moderation unavailable</h1>
        <p>
          Start this page through the dedicated
          local moderation Vite mode.
        </p>
      </main>
    )
  }

  if (!sessionKey) {
    return (
      <main className="moderation-shell moderation-lock-screen">
        <section className="moderation-lock-card">
          <p className="moderation-eyebrow">
            Ask Mark
          </p>
          <h1>Private moderation</h1>
          <p>
            Local-only review queue. The key is
            held in memory for this tab and is
            cleared when the session is locked or
            refreshed.
          </p>

          <form onSubmit={unlock}>
            <label>
              Local moderation key
              <input
                ref={keyInputRef}
                type="password"
                value={adminKey}
                onChange={(event) =>
                  setAdminKey(
                    event.target.value,
                  )
                }
                minLength={32}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
              />
            </label>

            <button
              type="submit"
              className="moderation-primary"
              disabled={queueLoading}
            >
              {queueLoading
                ? 'Checking local service…'
                : 'Unlock review queue'}
            </button>
          </form>

          {error ? (
            <p
              className="moderation-alert"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {message ? (
            <p role="status">{message}</p>
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="moderation-shell">
      <header className="moderation-topbar">
        <div>
          <p className="moderation-eyebrow">
            Ask Mark
          </p>
          <h1>Private review queue</h1>
          <p>
            Decisions remain private and never
            publish knowledge automatically.
          </p>
        </div>

        <button
          type="button"
          className="moderation-secondary"
          onClick={lockSession}
        >
          Lock session
        </button>
      </header>

      <div
        className="moderation-live-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </div>

      {error ? (
        <p
          className="moderation-alert"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section
        className="moderation-filters"
        aria-label="Queue filters"
      >
        <label>
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            {STATUS_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Type
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >
            {TYPE_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={value || 'all'}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Language
          <select
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target.value,
              )
            }
          >
            {LANGUAGE_OPTIONS.map(
              ([value, label]) => (
                <option
                  key={value || 'all'}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <button
          type="button"
          className="moderation-secondary"
          onClick={() => loadQueue()}
          disabled={queueLoading}
        >
          Refresh
        </button>
      </section>

      <div
        className="moderation-workspace"
        data-detail-open={Boolean(selectedId)}
      >
        <section
          className="moderation-queue"
          aria-labelledby="queue-title"
        >
          <div className="moderation-section-heading">
            <h2 id="queue-title">
              Submissions
            </h2>
            <span>
              {submissions.length} loaded
            </span>
          </div>

          {queueLoading &&
          submissions.length === 0 ? (
            <p role="status">
              Loading private queue…
            </p>
          ) : null}

          {!queueLoading &&
          submissions.length === 0 ? (
            <div className="moderation-empty">
              <h3>No matching submissions</h3>
              <p>
                Change the filters or refresh the
                queue.
              </p>
            </div>
          ) : null}

          <ul className="moderation-queue-list">
            {submissions.map((submission) => (
              <li key={submission.id}>
                <button
                  type="button"
                  className="moderation-queue-item"
                  data-selected={
                    submission.id ===
                    selectedId
                  }
                  onClick={() =>
                    openDetail(submission.id)
                  }
                >
                  <div className="moderation-queue-item-header">
                    <StatusPill
                      status={submission.status}
                    />
                    <time
                      dateTime={
                        submission.createdAt
                      }
                    >
                      {formatDate(
                        submission.createdAt,
                      )}
                    </time>
                  </div>

                  <p>
                    {submission.messagePreview}
                  </p>

                  <div className="moderation-queue-item-footer">
                    <span>{submission.type}</span>
                    <span>
                      {submission.language}
                    </span>
                    <span
                      data-tone={expiryTone(
                        submission.expiresAt,
                      )}
                    >
                      Expires{' '}
                      {formatDate(
                        submission.expiresAt,
                      )}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {nextCursor ? (
            <button
              type="button"
              className="moderation-secondary moderation-load-more"
              onClick={() =>
                loadQueue({
                  append: true,
                  cursor: nextCursor,
                })
              }
              disabled={queueLoading}
            >
              Load more
            </button>
          ) : null}
        </section>

        <DetailPanel
          detail={detail}
          loading={detailLoading}
          error={detailError}
          busy={actionBusy}
          onClose={closeDetail}
          onAction={applyAction}
        />
      </div>
    </main>
  )
}
