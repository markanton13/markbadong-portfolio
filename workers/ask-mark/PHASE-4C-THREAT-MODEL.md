# Ask Mark Phase 4C — Private Moderation Threat Model

Status: Proposed local-only threat model
Phase: 4C
Production exposure: Prohibited

## 1. Assets

Phase 4C protects:

- visitor-submitted message content
- private moderation status
- private reviewer notes
- immutable moderation history
- the local moderation key
- approved Ask Mark knowledge
- source and release integrity
- portfolio public-bundle isolation
- Mark's local development environment

## 2. Trust boundaries

### Public portfolio boundary

Visitors may submit content through the separately reviewed local intake flow.
Visitors are never trusted as moderators and receive no read access to
submissions.

### Local moderation browser boundary

The local moderation UI runs only on approved loopback origins at port `5174`.
The browser is trusted only for the current session and must not persist the
moderation key.

### Local Worker boundary

The Worker exposes moderation routes only when exact local-only configuration
and a sufficiently long key are present.

### D1 boundary

D1 enforces status allowlists, foreign keys, immutable action insertion, and
atomic conditional transitions.

### Publication boundary

Visitor intake and moderation remain separate from sources, knowledge items,
releases, and `v_active_knowledge`.

## 3. Threats and mitigations

### 3.1 Public discovery of moderation routes

Threat:

A visitor probes `/v1/admin/intake/*` on preview or production.

Mitigations:

- moderation environment values absent outside local config
- disabled routes return generic `404 not_found`
- no route names included in public bundles
- no public navigation, robots entry, or sitemap entry
- no remote moderation deployment during Phase 4C

### 3.2 Missing or weak reviewer authentication

Threat:

A local process or browser tab performs moderation actions without authorization.

Mitigations:

- key minimum length of 32 characters
- explicit local-only mode required
- missing key returns `401`
- invalid key returns `403`
- constant-time comparison
- dedicated local admin origins only
- no wildcard or credentialed CORS
- no key values in errors or logs

### 3.3 Secret persistence

Threat:

The local admin key is recovered from browser storage, URLs, source maps,
analytics, or repository files.

Mitigations:

- manual key entry each session
- component-memory storage only
- no localStorage, sessionStorage, IndexedDB, cookies, URL parameters, or
  autofill persistence
- no analytics on the moderation page
- no console logging of request headers
- local Worker config only
- build tests reject key/header code in public bundles

### 3.4 Stored cross-site scripting

Threat:

Visitor content or reviewer notes contain HTML, SVG, Markdown, script URLs, or
event handlers that execute in the moderator UI.

Mitigations:

- React text rendering only
- no `dangerouslySetInnerHTML`
- no Markdown parser
- no automatic URL linking
- no remote image or iframe loading
- plain-text normalization and control rejection
- restrictive local admin page content security policy where supported

### 3.5 SQL injection and malformed filters

Threat:

Submission IDs, cursors, filters, reason codes, or notes alter SQL structure.

Mitigations:

- prepared statements only
- fixed sort order
- fixed filter and action allowlists
- opaque cursor parser
- body and query length limits
- no dynamic column or table names from requests

### 3.6 Concurrent or stale moderation

Threat:

Two tabs review the same pending item and the later stale action overwrites the
earlier decision.

Mitigations:

- client sends `expectedStatus` and `expectedUpdatedAt`
- conditional update includes both expected values
- zero changed rows returns `409 stale_submission`
- action and event inserts are in the same atomic batch
- UI refreshes detail after a stale response

### 3.7 Invalid state transitions

Threat:

A request directly changes rejected to approved, acts on `received`, or bypasses
review rules.

Mitigations:

- centralized transition table
- approve/reject allowed only from `pending_review`
- archive and reopen follow exact allowlists
- database status CHECK remains active
- invalid transitions return `409 invalid_moderation_transition`
- tests cover every allowed and denied transition pair

### 3.8 Audit tampering or partial writes

Threat:

A status changes without an action/event record, or a record is edited later.

Mitigations:

- conditional status update, moderation action, and event insert execute
  atomically
- API exposes no update or delete route for audit records
- action IDs are opaque
- chronological indexes support deterministic review
- tests simulate transaction failures and verify rollback

### 3.9 Automatic publication or knowledge poisoning

Threat:

An approved visitor claim becomes a public Ask Mark answer without source
verification.

Mitigations:

- `approved` means private curation candidate only
- no moderation foreign keys to knowledge/source/release tables
- moderation modules do not import publication writers
- no action payload accepts answer, source, knowledge, release, or publication
  fields
- baseline counts and active knowledge identities are checked before and after
  every moderation action
- Phase 6 owns any future human-controlled publish workflow

### 3.10 Sensitive visitor content

Threat:

A visitor includes a phone number, address, credentials, medical information, or
other sensitive data in the message.

Mitigations:

- private queue only
- no message echo to other visitors
- `contains_sensitive_data` rejection reason
- no analytics or content logging
- no auto-linking
- original expiry remains enforced
- future redaction workflow requires a separate reviewed design

### 3.11 Data enumeration

Threat:

An attacker guesses submission IDs or paginates the private queue.

Mitigations:

- local authentication before lookup
- opaque high-entropy IDs
- generic `404` for unknown IDs
- stable limited pagination
- no public lookup route
- queue responses use `Cache-Control: no-store`

### 3.12 CORS and cross-origin actions

Threat:

A malicious website causes the local browser to read or mutate the moderation
API.

Mitigations:

- exact local port `5174` origin allowlist
- no wildcard origin
- no credentialed CORS
- custom admin header forces preflight
- unapproved origins receive no access-control permission
- key is not stored in cookies

### 3.13 Error and log leakage

Threat:

Responses or logs expose notes, messages, keys, hashes, SQL, stack traces, or
other submissions.

Mitigations:

- allowlisted response serializers
- generic errors
- no request body or auth header logging
- no internal hashes in queue/detail responses
- local runtime error-log review
- tests inspect representative error bodies

### 3.14 Retention bypass

Threat:

Moderation approval silently makes visitor content permanent.

Mitigations:

- action flow does not alter `expires_at`
- UI shows expiry
- existing purge boundary remains separate from knowledge data
- no indefinite retention
- any future extension policy requires an explicit migration and privacy review

### 3.15 Build leakage

Threat:

Private moderation code or route strings ship in normal portfolio bundles.

Mitigations:

- dedicated local moderation entrypoint and Vite mode
- no import from the normal app graph
- bundle-content regression tests
- normal, preview, and production-candidate builds inspected
- public deployment remains out of scope

## 4. Abuse cases required in tests

Tests must cover:

- disabled moderation mode
- missing and invalid keys
- unapproved origin
- malformed content type and JSON
- unknown fields
- oversized body and note
- invalid Unicode and controls
- invalid status/action/reason combinations
- stale status
- stale timestamp
- guessed submission ID
- approve from rejected
- reject from approved
- action on received
- repeated identical action
- D1 failure between update and audit insert
- visitor content containing HTML and script-like text
- no leakage of internal hashes
- no mutation of knowledge, source, release, or active views
- no public-bundle moderation strings

## 5. Residual risks deferred

Phase 4C does not resolve:

- production identity provider selection
- Cloudflare Access policy design
- multiple moderators or role separation
- remote key rotation
- security alerts
- production backup and restore
- legal retention requirements
- automated PII detection
- audit export
- approval-to-publication workflow

These require separate explicit review before any remote moderation activation.
