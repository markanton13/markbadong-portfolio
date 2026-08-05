# Ask Mark Phase 4A — Safe Intake Foundation Design

Status: Proposed local-only implementation
Phase: 4A
Production writes: Prohibited
Public visitor interface: Out of scope

## 1. Objective

Create and locally validate the smallest safe data and API foundation for
anonymous visitor-submitted questions, corrections, and feedback.

The foundation remains isolated from approved Ask Mark knowledge and
publication.

## 2. Existing architecture

The existing Worker exposes:

- `GET /v1/health`
- `GET /v1/bootstrap`
- `POST /v1/query`

Approved answers are read exclusively through `v_active_knowledge`.

The production Worker and production D1 remain unchanged during Phase 4A.

## 3. In scope

Phase 4A includes:

- threat-model and design documentation
- one reviewed local migration
- dedicated visitor-intake tables and indexes
- strict payload validation and Unicode normalization
- plain-text storage
- local-only write handler
- local abuse-control and retention design
- local schema and API regression tests
- non-regression coverage for existing Ask Mark behavior

## 4. Out of scope

Phase 4A excludes:

- public submission UI
- contact request workflow
- names, email addresses, and phone numbers
- attachments
- public submission lookup
- moderation dashboard
- authentication
- preview or production migration
- Worker or Pages deployment
- automated or AI moderation
- automatic source or knowledge creation
- publication
- visitor analytics

## 5. Proposed local route

### `POST /v1/intake/submissions`

Required media type:

`application/json`

A valid `charset=utf-8` parameter may be accepted only after parsing the media
type correctly. Substring checks alone are insufficient.

Required JSON shape:

    {
      "type": "question",
      "language": "taglish",
      "message": "Pwede bang malaman kung anong CRM projects ang nagawa ni Mark?"
    }

Exactly three own properties are allowed:

- `type`
- `language`
- `message`

The body must be a plain JSON object. Arrays, null, nested objects, and unknown
fields are rejected.

## 6. Submission types

| Value | Meaning |
|---|---|
| `question` | A question current approved knowledge did not answer clearly |
| `correction` | A claim that existing content may be incorrect |
| `feedback` | General feedback about Ask Mark or its usefulness |

`contact_request` is excluded because it would require contact information,
consent language, delivery expectations, and separate retention rules.

## 7. Language metadata

| Value | Meaning |
|---|---|
| `en` | English |
| `tl` | Tagalog or Filipino |
| `taglish` | Mixed Tagalog and English |

The value is visitor-selected metadata. Phase 4A performs no automatic language
detection.

## 8. Validation and normalization

Validation order:

1. Validate HTTP method and route.
2. Validate CORS preflight behavior.
3. Validate media type.
4. Enforce a 4,096-byte body limit.
5. Parse JSON.
6. Require a plain object.
7. Require exactly the three allowed fields.
8. Validate type and language allowlists.
9. Validate the message type.
10. Reject malformed Unicode and prohibited controls.
11. Normalize line endings.
12. Normalize Unicode with NFKC.
13. Trim outer whitespace.
14. Validate normalized code-point length.
15. Calculate the content hash.
16. Apply duplicate and rate-limit checks.
17. Perform an atomic insert.

Message limits:

- minimum: 10 Unicode code points
- maximum: 1,000 Unicode code points
- body maximum: 4,096 bytes

Horizontal tab may be converted to normal spacing. Line feed may remain allowed.
NUL, unsafe C0/C1 controls, DEL, and unpaired UTF-16 surrogates are rejected.

## 9. Proposed schema

Migration filename:

`workers/ask-mark/migrations/0005_visitor_intake.sql`

### 9.1 `visitor_submissions`

| Column | Type | Rule |
|---|---|---|
| `id` | TEXT | Opaque generated primary key |
| `submission_type` | TEXT | `question`, `correction`, or `feedback` |
| `language` | TEXT | `en`, `tl`, or `taglish` |
| `content_text` | TEXT | Normalized plain text |
| `content_hash` | TEXT | SHA-256 of normalized type, language, and message |
| `deduplication_hash` | TEXT | Keyed hash scoped to requester bucket and 15-minute window |
| `status` | TEXT | Intake lifecycle status |
| `created_at` | TEXT | Server-generated timestamp |
| `updated_at` | TEXT | Server-generated timestamp |
| `expires_at` | TEXT | Default 90-day expiry |

Allowed statuses:

- `received`
- `pending_review`
- `approved`
- `rejected`
- `archived`

Phase 4A inserts accepted submissions with `pending_review`.

Proposed indexes:

- `(status, created_at DESC)`
- `(expires_at)`
- `(content_hash, created_at DESC)`
- unique `(deduplication_hash)`
- `(submission_type, language, created_at DESC)`

The table has no foreign key to any source, knowledge, review, or publication
table.

### 9.2 `visitor_submission_events`

| Column | Type | Rule |
|---|---|---|
| `id` | TEXT | Primary key |
| `submission_id` | TEXT | Foreign key to visitor submission |
| `event_type` | TEXT | Fixed event allowlist |
| `previous_status` | TEXT | Nullable prior state |
| `resulting_status` | TEXT | Resulting intake state |
| `reason_code` | TEXT | Optional machine-readable reason |
| `actor_type` | TEXT | `system`, `local_test`, or later `admin` |
| `actor_id` | TEXT | Optional non-public actor identifier |
| `created_at` | TEXT | Server-generated timestamp |

Initial events:

- `received`
- `queued_for_review`
- `approved`
- `rejected`
- `archived`

Proposed index:

- `(submission_id, created_at ASC)`

The events table is private and has no public read route.

### 9.3 `visitor_rate_limit_buckets`

| Column | Type | Rule |
|---|---|---|
| `bucket_hash` | TEXT | Derived keyed hash; never raw IP |
| `window_started_at` | TEXT | Beginning of rate window |
| `request_count` | INTEGER | Accepted-attempt count constrained from 0 through 5 |
| `expires_at` | TEXT | No later than 24 hours after creation |
| `updated_at` | TEXT | Server-generated timestamp |

Primary key:

- `(bucket_hash, window_started_at)`

Index:

- `(expires_at)`

The bucket hash must not be copied into `visitor_submissions`.
`deduplication_hash` is derived with a secret-keyed function from the bucket
hash, window start, and normalized content hash. Because the active window is
part of the input, the same content can be accepted in a later window without
creating a stable requester identifier.

## 10. Rate-limit design

Initial local policy:

- five accepted attempts per derived 15-minute bucket
- the database constrains `request_count` to a maximum of five
- exact duplicate suppression through a per-window keyed deduplication hash
- duplicate attempts roll back and do not consume an accepted-attempt slot
- expired buckets ignored and eligible for deletion
- generic `429` response
- optional `Retry-After` containing only remaining window duration
- no raw IP, user-agent, or fingerprint storage

Local tests use synthetic deterministic requester identifiers.

Production key management and Cloudflare request-header behavior require a later
explicit review.

## 11. Transaction design

A valid submission is handled atomically with one D1 `batch()` call made
from prepared statements:

1. Insert or update the rate-limit bucket.
2. Insert `visitor_submissions` with `pending_review`.
3. Insert a `received` event with resulting state `received`.
4. Insert a `queued_for_review` event from `received` to `pending_review`.
5. Commit all operations together.

The rate-limit maximum and per-window deduplication uniqueness are database
constraints. A sixth accepted attempt or an exact duplicate causes the batch to
fail and roll back, so neither condition leaves a partial submission, event
history, or bucket increment. Local Worker-runtime integration is validated
before route integration is accepted.

## 12. Response contract

Successful acceptance:

- HTTP `202 Accepted`
- `Cache-Control: no-store`
- JSON response
- opaque submission identifier
- status `pending_review`
- no moderation details
- no rate-limit identifier
- no stored message echoed unnecessarily

Proposed response:

    {
      "ok": true,
      "submission": {
        "id": "opaque-generated-id",
        "status": "pending_review"
      }
    }

Representative errors:

| Status | Code |
|---:|---|
| 400 | `invalid_json` |
| 400 | `invalid_payload` |
| 400 | `unknown_field` |
| 400 | `invalid_submission_type` |
| 400 | `invalid_language` |
| 400 | `message_required` |
| 400 | `message_too_short` |
| 400 | `invalid_unicode` |
| 405 | `method_not_allowed` |
| 413 | `payload_too_large` |
| 413 | `message_too_long` |
| 415 | `unsupported_media_type` |
| 409 | `duplicate_submission` |
| 429 | `rate_limited` |
| 503 | `service_unavailable` |

Errors must not expose stack traces, SQL, paths, identifiers, or other
submissions.

## 13. Retention design

Defaults:

- submission expiry: 90 days after receipt
- rate-limit bucket expiry: no later than 24 hours
- no indefinite retention
- archived or rejected submissions may be deleted earlier
- no scheduled production deletion job in Phase 4A

Local validation must prove:

- `expires_at` is always populated
- expired rows can be selected deterministically
- purge statements affect only expired intake records
- purge logic cannot affect knowledge, source, publication, or audit tables

## 14. CORS and headers

Reuse the existing exact origin allowlist:

- `https://markbadong.com`
- `https://www.markbadong.com`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Required protections:

- `Content-Type: application/json; charset=utf-8`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store`
- exact approved origin reflection only
- `Vary: Origin`
- no credentialed CORS

## 15. Code organization proposal

Proposed files:

    workers/ask-mark/migrations/0005_visitor_intake.sql
    workers/ask-mark/src/lib/intake-validation.js
    workers/ask-mark/src/lib/intake-storage.js
    workers/ask-mark/src/lib/intake.js
    scripts/check-ask-mark-intake-schema.mjs
    scripts/check-ask-mark-intake-storage.mjs
    scripts/check-ask-mark-intake-api.mjs

Existing files expected to receive minimal reviewed changes:

    workers/ask-mark/src/index.js
    package.json
    scripts/check-ask-mark-schema.mjs
    workers/ask-mark/API.md
    workers/ask-mark/LOCAL-VALIDATION.md
    workers/ask-mark/README.md

Intake logic must not be mixed into `src/lib/knowledge.js`.

## 16. Non-regression requirements

1. Existing schema checks pass with reviewed expected counts.
2. Existing seed and API checks remain green.
3. Existing client and Pages-build checks remain green.
4. The public production check passes without changing its frozen baseline.
5. Authenticated production checks remain explicit and read-only.
6. Existing frontend bundles remain unchanged in Phase 4A.
7. Production Worker and D1 remain untouched.

## 17. Checkpoint sequence

1. Threat model and design documentation.
2. Local-only migration and schema tests.
3. Validation and normalization utilities.
4. Local-only intake storage layer.
5. Local-only route integration.
6. API abuse and regression tests.
7. Full local validation and documentation.
8. Review and freeze.

No preview or production deployment belongs to Phase 4A.

## 18. Acceptance criteria

Phase 4A is complete only when:

- the dedicated local schema is validated
- all input boundaries have regression tests
- rate-limit identifiers contain no raw IP
- intake rows cannot appear in `v_active_knowledge`
- no public read route exists
- no automatic knowledge or publication path exists
- all existing local checks pass
- the public production regression check remains green
- all repository changes are reviewed before commit, push, tag, merge, migration,
  or deployment

## 19. Local-only route integration checkpoint

The local implementation uses:

    POST /v1/intake/submissions

Activation requires both local environment values:

    ASK_MARK_INTAKE_MODE=local-only
    ASK_MARK_INTAKE_HASH_KEY=<development-only key of at least 32 characters>

Only `workers/ask-mark/wrangler.jsonc` contains these values. Preview and
production Wrangler configurations intentionally omit them. The Worker therefore
returns the existing generic `404 not_found` response when the route is evaluated
without the exact local-only mode and a sufficiently long key.

The local handler:

1. checks declared and actual body bytes before JSON parsing
2. decodes UTF-8 with fatal error handling
3. invokes the reviewed validation and normalization utility
4. derives a bucket hash and window-scoped deduplication hash using HMAC-SHA-256
5. creates opaque submission and event IDs
6. writes through the reviewed atomic storage batch
7. returns only the opaque submission ID and `pending_review` status

The local route does not expose a read endpoint. `GET` returns `405` only while
local intake is enabled; otherwise it returns the same generic `404` as an
unknown endpoint.

This checkpoint does not alter preview or production configuration, migrate a
remote database, deploy the Worker, or add a frontend intake interface.
