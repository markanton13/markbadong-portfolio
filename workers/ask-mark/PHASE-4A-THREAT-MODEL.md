# Ask Mark Phase 4A — Visitor Intake Threat Model

Status: Proposed local-only foundation
Phase: 4A
Production writes: Prohibited
Automatic knowledge publication: Prohibited

## 1. Purpose

Phase 4A designs and locally validates a safe foundation for visitor-submitted
questions, corrections, and feedback.

Visitor input is untrusted. A visitor submission is not evidence, approved
knowledge, a résumé update, a portfolio update, or a publishable source.

Phase 4A must preserve the existing deterministic Ask Mark system, its static
fallback, and its read-only production behavior.

## 2. Protected assets

The design must protect:

1. The integrity of approved Ask Mark knowledge.
2. The active published release and `v_active_knowledge`.
3. Production D1 and Worker availability.
4. Visitor privacy.
5. Mark's private moderation records.
6. Existing CORS and API behavior.
7. Separation among local, preview, and production resources.
8. Repository and deployment history.

## 3. Trust boundaries

### 3.1 Public visitor boundary

All request bodies, headers, language labels, and submission-type labels are
untrusted.

A submitted correction is not assumed to be true. Visitor-selected language
metadata is descriptive only and is not trusted classification.

### 3.2 Intake storage boundary

Visitor submissions must be stored only in dedicated intake tables.

Intake tables must not have foreign keys into:

- `knowledge_items`
- `knowledge_versions`
- `source_records`
- `source_snapshots`
- `publication_releases`
- `publication_release_items`

### 3.3 Publication boundary

No intake operation may:

- create a knowledge item or version
- create a source or source snapshot
- attach a record to a publication release
- modify `active_release_id`
- modify `v_active_knowledge`
- publish or synchronize visitor content

### 3.4 Moderation boundary

Visitor submissions must not be publicly readable.

Approval in the intake lifecycle means only that Mark considered the submission
useful for private human review. It does not mean that the content is factual,
trusted, approved knowledge, or published.

### 3.5 Environment boundary

Initial implementation and validation are local only.

No Phase 4A command may migrate, seed, write to, or deploy preview or production
resources.

## 4. Permitted data

The minimum permitted submission data is:

- submission type
- visitor-selected language metadata
- normalized plain-text message
- opaque generated submission identifier
- generated content hash
- lifecycle status
- timestamps
- expiration timestamp

Supported submission types:

- `question`
- `correction`
- `feedback`

Supported language metadata:

- `en`
- `tl`
- `taglish`

## 5. Prohibited data

Phase 4A must not request or intentionally store:

- real name
- email address
- phone number
- employer or job title
- account identity
- address or precise location
- raw IP address
- full user agent
- referrer history
- cookies
- device fingerprint
- authentication identifier
- attachments or uploaded files
- sensitive personal data
- health information
- financial account data
- government identifiers
- passwords, secrets, or access tokens

A visitor may still place personal information inside free text. The future
visitor interface must warn visitors not to submit sensitive or unnecessary
personal information. Moderation and deletion procedures must support removing
such content.

## 6. Threats and required controls

### 6.1 Accidental publication

Threat: A visitor submission is mistakenly treated as approved knowledge or
attached to an active release.

Required controls:

- dedicated intake tables
- no publication foreign keys
- no automatic source or knowledge creation
- regression tests proving intake rows cannot appear in `v_active_knowledge`
- later publication must remain explicit and human controlled

### 6.2 SQL injection

Required controls:

- prepared D1 statements
- bound parameters only
- no visitor-provided SQL identifiers
- no string-built query clauses
- fixed allowlists for types, languages, statuses, and event names

### 6.3 HTML, script, and prompt injection

Required controls:

- store visitor content as plain text
- never execute stored content
- never render it with `innerHTML`
- keep response content type as JSON
- retain `X-Content-Type-Options: nosniff`
- no AI moderation in Phase 4A
- submission content is data, never an instruction
- no automatic transformation or publication

Phase 4A does not need to reject every angle bracket. Safety comes from strict
plain-text storage and text-only rendering, not an unreliable HTML blacklist.

### 6.4 Oversized or malformed requests

Required controls:

- maximum request-body byte limit
- exact JSON object requirement
- flat payload only
- no arrays or nested values
- maximum normalized message length
- early rejection before database writes

Initial local limits:

- maximum body size: 4,096 bytes
- message length: 10 to 1,000 Unicode code points

### 6.5 Unknown and duplicate fields

The request object must contain exactly:

- `type`
- `language`
- `message`

Unknown, missing, duplicated, array, or nested fields must be rejected.

### 6.6 Malformed Unicode

Required controls:

- reject unpaired surrogates
- reject NUL and unsafe control characters
- normalize valid text using Unicode NFKC
- normalize CRLF and CR to LF
- trim outer whitespace
- count Unicode code points after normalization

Line feed may remain allowed for short multi-line feedback.

### 6.7 Spam and repeated submissions

Required controls:

- derived expiring rate-limit bucket
- no raw IP persistence
- keyed, non-reversible hash
- short expiration
- per-window keyed deduplication hash for exact duplicate detection
- generic rate-limit response

Initial local policy:

- five accepted attempts per derived 15-minute bucket
- database-enforced maximum of five accepted attempts
- exact duplicate suppression within the active window
- duplicate rejection does not consume an accepted-attempt slot
- deduplication hashes cannot be reused as stable requester identifiers
- rate-limit records expire no later than 24 hours after creation

### 6.8 Raw-IP retention

Required controls:

- never store or application-log a raw IP address
- derive only a keyed, expiring bucket identifier
- do not reuse it for analytics
- do not join it to submission records
- derive only a window-scoped keyed deduplication hash for submission storage
- use synthetic deterministic requester IDs in local tests

### 6.9 Method, media-type, and CORS abuse

Required controls:

- only `POST /v1/intake/submissions`
- `OPTIONS` only for CORS preflight
- parsed `application/json` media-type validation
- unsupported methods return `405` with an exact `Allow` header
- unsupported media types return `415`
- preserve the exact existing origin allowlist
- never reflect arbitrary origins
- no credentialed CORS
- preserve `Vary: Origin`

CORS is not authentication and does not replace rate limiting.

### 6.10 Enumeration and information leakage

Required controls:

- opaque generated submission IDs
- generic success response
- no public read endpoint
- no moderation-state lookup endpoint in Phase 4A
- no rate-limit hashes or event records in responses
- no SQL, database paths, or stack traces in responses

### 6.11 Retention failure

Required controls:

- every submission receives `expires_at`
- default submission retention is 90 days
- rate-limit buckets expire within 24 hours
- local tests verify expiry metadata and purge-query behavior
- no production scheduler in Phase 4A

## 7. Lifecycle

The intake lifecycle is:

`received → pending_review → approved or rejected → archived`

For the Phase 4A local route:

1. Validate and normalize the request.
2. Apply abuse controls.
3. Insert the submission with `pending_review`.
4. Record a `received` event.
5. Record a `queued_for_review` event.
6. Return a generic accepted response.

Later moderation changes must be explicit, authenticated, and audited.

## 8. Security invariants

1. Visitor submissions never enter `v_active_knowledge` automatically.
2. Visitor submissions never create approved knowledge.
3. Visitor submissions are never publicly readable.
4. No raw IP address is stored.
5. No personally identifying field is required.
6. Unknown request fields are rejected.
7. Database writes use prepared statements in one atomic D1 batch.
8. Duplicate and rate-limit constraint failures roll back the entire batch.
9. Local, preview, and production databases remain separate.
10. Production remains read-only throughout Phase 4A.
11. Existing `/v1/health`, `/v1/bootstrap`, and `/v1/query` behavior remains unchanged.
12. Existing static fallback behavior remains available.
13. No AI system makes moderation or publication decisions.

## 9. Required local regression coverage

Tests must cover:

- valid English, Tagalog, and Taglish submissions
- every supported submission type
- unsupported type and language
- missing, unknown, duplicate, array, and nested fields
- invalid JSON and unsupported media type
- oversized body
- empty, too-short, and too-long messages
- NUL, controls, malformed surrogates, and Unicode normalization
- unsupported methods
- approved and unapproved CORS
- duplicate suppression and rate limiting
- expiry metadata and event creation
- zero intake rows in `v_active_knowledge`
- unchanged knowledge and release counts
- unchanged existing Ask Mark query behavior

## 10. Phase 4A stop conditions

Phase 4A must stop before:

- public visitor interface
- preview or production migration
- preview or production write route
- Worker or Pages deployment
- moderation UI or authentication
- email or phone collection
- automated or AI moderation
- source synchronization
- knowledge creation or publication
- visitor analytics
- attachments

## 11. Local-route guard and requester derivation

The Phase 4A route is fail-closed. It is active only when the Worker receives
the exact local-only mode and a development hashing key of at least 32
characters. Those values exist only in the local Wrangler configuration.

Preview and production configurations contain neither value. A missing mode,
wrong mode, missing key, or short key produces the same generic `404` response
as an unknown endpoint.

For local deterministic testing, `X-Ask-Mark-Local-Requester` may provide a
temporary requester input. It is never stored. The handler otherwise uses the
edge connecting address when available, then a shared local fallback. Every
requester input is immediately transformed by keyed HMAC-SHA-256 before it
reaches storage.

The submission row receives only a window-scoped, content-scoped
deduplication hash. The stable bucket hash exists only in the expiring
rate-limit table. Neither hash is returned to the caller or written to logs.

The route reads at most the accepted 4,096-byte body into validation, rejects
invalid UTF-8 before JSON parsing, and never logs the body, requester input,
content hash, bucket hash, or deduplication hash.
