# Ask Mark Phase 4C — Private Moderation Workflow Design

Status: Proposed local-only implementation
Phase: 4C
Production writes: Prohibited
Public moderation interface: Prohibited
Automatic publication: Prohibited

## 1. Objective

Create a private, Mark-only workflow for reviewing visitor questions,
corrections, and feedback already stored by the Phase 4A/4B intake flow.

Phase 4C may change a visitor submission's private moderation status and append
private audit records. It must never create, update, activate, or publish Ask
Mark knowledge automatically.

`approved` means approved for later human curation. It does not mean published,
trusted as factual, included in `v_active_knowledge`, or visible to visitors.

## 2. Existing foundation preserved

The current intake foundation already provides:

- `visitor_submissions`
- `visitor_submission_events`
- `visitor_rate_limit_buckets`
- statuses `received`, `pending_review`, `approved`, `rejected`, and `archived`
- events `received`, `queued_for_review`, `approved`, `rejected`, and `archived`
- local-only visitor submission writes
- no public intake read route
- no foreign key from visitor submissions to approved knowledge

Phase 4C extends this foundation instead of creating a parallel submission
system.

## 3. Scope

Phase 4C includes:

- private moderation threat model and state-machine contract
- local-only moderation schema migration
- immutable moderation-action records
- atomic status transitions and audit events
- optimistic concurrency protection
- local-only authenticated admin API
- private queue, detail, filter, and action UI
- keyboard, mobile, reduced-motion, and content-safety QA
- proof that moderation cannot alter published knowledge
- local runtime validation and freeze review

## 4. Explicit exclusions

Phase 4C excludes:

- preview or production D1 migration
- production moderation authentication
- Cloudflare Access configuration
- Worker or Pages deployment
- public moderation routes
- public submission lookup
- email notifications
- AI moderation or scoring
- automatic correction of portfolio content
- automatic source creation
- automatic knowledge creation
- automatic release creation
- automatic publication
- attachments
- moderator collaboration or multiple role levels
- deletion of individual audit records

Production authentication and deployment require a later explicit security
review. The local design must be adaptable to a future edge-authenticated admin
identity without weakening the local fail-closed boundary.

## 5. Proposed local-only activation

Backend activation requires both:

    ASK_MARK_MODERATION_MODE=local-only
    ASK_MARK_MODERATION_KEY=<development-only key of at least 32 characters>

These values belong only in the local Worker configuration.

Preview and production Worker configurations must omit both values. When the
exact local-only mode or sufficiently long key is absent, every moderation route
returns the same generic `404 not_found` response as an unknown route.

The private browser UI uses a dedicated local development mode and port:

    http://127.0.0.1:5174
    http://localhost:5174

The reviewer manually enters the local admin key for the current session. The
key is held only in component memory and must never be written to localStorage,
sessionStorage, IndexedDB, cookies, URL parameters, analytics, console logs, or
repository files.

## 6. Proposed local routes

### 6.1 Queue

    GET /v1/admin/intake/submissions

Supported filters:

- `status`
- `type`
- `language`
- `limit`
- `cursor`

Default status:

    pending_review

Maximum page size:

    50

Pagination uses stable keyset ordering:

    created_at DESC, id DESC

The cursor may contain only the ordering values needed for pagination. It must
not contain hashes, secrets, notes, or other submissions.

### 6.2 Detail

    GET /v1/admin/intake/submissions/:submissionId

The detail response may include:

- opaque submission ID
- submission type
- language
- normalized plain-text message
- moderation status
- created, updated, and expiry timestamps
- private moderation actions
- private status-event history

It must not expose:

- `content_hash`
- `deduplication_hash`
- rate-limit bucket identifiers
- hashing keys
- requester identity material
- SQL errors
- stack traces
- knowledge or publication internals unrelated to the submission

### 6.3 Action

    POST /v1/admin/intake/submissions/:submissionId/actions

Required JSON shape:

    {
      "action": "approve",
      "expectedStatus": "pending_review",
      "expectedUpdatedAt": "2026-08-04T01:00:00.000Z",
      "reasonCode": "useful_question",
      "note": "Potential FAQ candidate; verify against approved sources."
    }

Allowed own properties:

- `action`
- `expectedStatus`
- `expectedUpdatedAt`
- `reasonCode`
- `note`

Unknown fields, nested data, arrays, malformed Unicode, unsafe controls, and
oversized bodies are rejected.

The action response returns only the updated private moderation state and the
opaque action ID.

## 7. Authentication and CORS

While moderation is enabled locally:

- missing local admin key returns `401 admin_auth_required`
- invalid local admin key returns `403 admin_auth_invalid`
- valid key comparison is constant-time
- no submitted key value is logged
- responses use `Cache-Control: no-store`
- approved admin origins are only local port `5174`
- no wildcard origin
- no credentialed CORS
- `Vary: Origin`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`

Proposed request header:

    X-Ask-Mark-Local-Admin-Key

The header is a local development adapter only. It is not the proposed
production authentication mechanism.

## 8. State machine

### 8.1 Action allowlist

- `approve`
- `reject`
- `archive`
- `reopen`

### 8.2 Allowed transitions

| Action | Allowed previous status | Result |
|---|---|---|
| `approve` | `pending_review` | `approved` |
| `reject` | `pending_review` | `rejected` |
| `archive` | `pending_review`, `approved`, `rejected` | `archived` |
| `reopen` | `approved`, `rejected`, `archived` | `pending_review` |

`received` is an internal intake transition and is not moderator-actionable.
The normal intake transaction ends at `pending_review`.

A request outside the state machine returns:

    409 invalid_moderation_transition

A request whose `expectedStatus` or `expectedUpdatedAt` no longer matches the
database returns:

    409 stale_submission

No action endpoint performs an implicit second decision after a conflict.

## 9. Reason codes

Reason codes are machine-readable, action-specific allowlists.

### Approval

- `useful_question`
- `valid_correction`
- `helpful_feedback`
- `other`

### Rejection

- `duplicate`
- `not_relevant`
- `unsafe_or_abusive`
- `contains_sensitive_data`
- `not_actionable`
- `other`

### Archive

- `resolved`
- `retention_cleanup`
- `other`

### Reopen

- `needs_reconsideration`
- `other`

A reason code is required for every decision. Private notes are optional,
plain text, and limited to 1,000 Unicode code points after normalization.

## 10. Proposed migration

Migration filename:

    workers/ask-mark/migrations/0006_private_moderation.sql

### 10.1 Rebuild `visitor_submission_events`

SQLite CHECK constraints cannot be safely widened in place. The migration
rebuilds the event table transactionally while preserving every existing row.

Changes:

- add `admin` to the `actor_type` allowlist
- add `reopened` to the `event_type` allowlist
- preserve the existing foreign key and chronological index
- preserve all existing event IDs and timestamps

Allowed actor types become:

- `system`
- `local_test`
- `admin`

### 10.2 Add `visitor_submission_moderation_actions`

| Column | Rule |
|---|---|
| `id` | Opaque primary key |
| `submission_id` | Foreign key to visitor submission |
| `action_type` | `approve`, `reject`, `archive`, or `reopen` |
| `previous_status` | Valid intake status |
| `resulting_status` | Valid intake status |
| `reason_code` | Action-specific allowlisted code |
| `note_text` | Nullable normalized private text |
| `actor_id` | Non-public local admin identifier |
| `created_at` | Server-generated timestamp |

Indexes:

- `(submission_id, created_at ASC)`
- `(action_type, created_at DESC)`
- `(actor_id, created_at DESC)`

The table has no foreign key to sources, knowledge items, releases, or active
knowledge views.

### 10.3 Schema version

The migration updates the local schema version to:

    4C.1

No remote migration belongs to Phase 4C implementation checkpoints.

## 11. Atomic moderation transaction

A valid action executes atomically:

1. validate authentication, route, media type, size, JSON, and action payload
2. read the target submission's current private state
3. validate the requested transition
4. compare `expectedStatus` and `expectedUpdatedAt`
5. update `visitor_submissions.status` and `updated_at` using both expected
   values in the `WHERE` clause
6. insert one immutable moderation-action row
7. insert one immutable submission event with `actor_type = admin`
8. commit all statements together

If the conditional update changes zero rows, the entire operation fails with
`409 stale_submission` and inserts no action or event.

## 12. Publication firewall

Moderation code must not import or call publication or knowledge-write modules.

Every moderation schema, storage, API, and runtime test records baseline counts
for:

- `sources`
- `knowledge_items`
- `publication_releases`
- `publication_release_items`
- `v_active_knowledge`

After approve, reject, archive, and reopen actions, every baseline count and
active item identity must remain unchanged.

There is no moderation route that accepts a source ID, knowledge ID, release ID,
answer text, publication flag, or active-knowledge flag.

The status `approved` only marks a private visitor submission as suitable for
later human curation. Phase 6, not Phase 4C, owns any future approval-to-publish
workflow.

## 13. Retention

Moderation does not remove or silently extend the original submission expiry.

The private UI displays `expires_at` and highlights items nearing expiry.
Rejected or archived records may be purged through the existing reviewed expiry
mechanism. Approved records remain subject to the same expiry unless a later
explicit retention policy is designed and reviewed.

No indefinite retention is introduced.

## 14. Private UI

Proposed files are isolated from the public assistant:

    src/admin/ask-mark-moderation/
    src/admin/ask-mark-moderation/main.jsx
    src/admin/ask-mark-moderation/ModerationApp.jsx
    src/admin/ask-mark-moderation/moderationClient.js
    src/admin/ask-mark-moderation/moderation.css

The local moderation UI includes:

- session-only key entry
- pending-review queue
- status, type, and language filters
- expiry indicators
- detail drawer or panel
- chronological private audit history
- approval, rejection, archive, and reopen confirmations
- action-specific reason selector
- optional private note
- loading, empty, stale, unauthorized, forbidden, and service-error states
- keyboard navigation
- visible focus
- 375px mobile usability
- reduced-motion support

Visitor message and reviewer note text are rendered as text only. The UI does
not use `dangerouslySetInnerHTML`, parse Markdown, auto-link URLs, load remote
content, or execute visitor-controlled markup.

## 15. Build isolation

The moderation UI uses a dedicated local Vite mode and entrypoint. Normal,
preview, and production portfolio builds must not contain:

- moderation route strings
- admin key headers
- moderation components
- private reviewer notes
- private queue client code

A build regression test inspects generated bundles and fails if moderation code
appears outside the dedicated local moderation build.

## 16. Error contract

Representative errors:

| Status | Code |
|---:|---|
| 400 | `invalid_json` |
| 400 | `invalid_payload` |
| 400 | `unknown_field` |
| 400 | `invalid_action` |
| 400 | `invalid_reason_code` |
| 400 | `note_too_long` |
| 400 | `invalid_unicode` |
| 401 | `admin_auth_required` |
| 403 | `admin_auth_invalid` |
| 404 | `not_found` |
| 405 | `method_not_allowed` |
| 409 | `invalid_moderation_transition` |
| 409 | `stale_submission` |
| 413 | `payload_too_large` |
| 415 | `unsupported_media_type` |
| 503 | `service_unavailable` |

Errors never expose secrets, stack traces, SQL, file paths, hashes, or another
submission's data.

## 17. Checkpoint sequence

### 4C.1 — Architecture and threat model

- create Phase 4C branch from the clean validated Phase 4B commit
- freeze state machine, API, schema, auth, and publication-firewall contracts
- no schema or source implementation yet

### 4C.2 — Local moderation schema and storage

- add migration `0006_private_moderation.sql`
- rebuild event constraint safely
- add immutable moderation-action table
- implement atomic storage transitions
- prove no knowledge or publication mutation

### 4C.3 — Local-only admin API

- add fail-closed local moderation configuration
- add constant-time local key authentication
- add queue, detail, and action routes
- validate CORS, errors, redaction, and concurrency
- no public or remote activation

### 4C.4 — Isolated private review UI

- add dedicated local admin entrypoint and build mode
- implement queue, detail, filters, actions, and session-only key handling
- prove public bundles exclude moderation code

### 4C.5 — Runtime and browser QA

- local D1 migration only
- local Worker and moderation UI
- accepted, conflict, auth, transition, and audit flows
- desktop, keyboard, mobile, reduced-motion, and console QA
- error-log and repository non-mutation review

### 4C.6 — Warning cleanup, final validation, and freeze

- warning-free lint
- complete local repository checks
- preview, production-candidate, and normal public builds
- exact scope and final hashes
- controlled commit and annotated local tag
- push, merge, remote migration, and deployment remain separate approvals

## 18. Acceptance criteria

Phase 4C is complete only when:

- moderation routes fail closed outside exact local-only mode
- no public moderation read or write route exists
- missing and invalid local admin keys are handled safely
- the queue returns only private allowlisted fields
- every state transition follows the frozen state machine
- stale concurrent decisions return `409 stale_submission`
- every successful action creates immutable action and event records atomically
- visitor and reviewer content is rendered as plain text only
- reviewer keys and notes are never persisted in browser storage or logs
- normal, preview, and production bundles exclude moderation code
- approve, reject, archive, and reopen leave all knowledge and publication data
  unchanged
- no remote D1 migration, deployment, or production authentication change occurs
- all files are reviewed before commit, tag, push, merge, migration, or deploy
