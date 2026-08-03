# Ask Mark Phase 4B — Local Submission UI Design

Status: Approved implementation plan
Phase: 4B
Starting commit: `49181894712185432fa3767349b9132bbe095fe9`
Production writes: Prohibited
Preview writes: Prohibited

## 1. Objective

Build and locally validate a visitor-facing interface for submitting:

- unanswered questions
- possible corrections
- general Ask Mark feedback

The interface writes only to the Phase 4A local intake route. It does not enable
preview or production writes.

## 2. Safety boundary

Phase 4B begins from the validated Phase 4A checkpoint and preserves these
rules:

1. Visitor submissions never enter `v_active_knowledge`.
2. A successful submission remains `pending_review`.
3. The UI never claims that a submission was approved, published, or answered.
4. No public submission lookup is added.
5. No names, email addresses, phone numbers, attachments, or contact requests
   are collected.
6. Preview and production environment files contain no intake-enablement mode.
7. Preview and production Workers remain intake-disabled.
8. No remote D1 migration or Worker deployment belongs to the initial Phase 4B
   implementation.
9. No analytics event may contain submission text.
10. Server validation remains authoritative.

## 3. Phase 4B checkpoints

1. Local-only browser intake client and pure contract tests.
2. Standalone accessible submission form component.
3. Ask Mark panel integration and UI state transitions.
4. Local Worker end-to-end browser-facing validation.
5. Mobile, keyboard, reduced-motion, and regression validation.
6. Documentation, review, commit, push, and validated tag.
7. Separate later decision on preview or production activation.

## 4. Browser enablement contract

The intake client is enabled only when all conditions are true:

- `import.meta.env.DEV === true`
- `VITE_ASK_MARK_INTAKE_MODE === "local-only"`
- `VITE_ASK_MARK_API_BASE_URL` uses plain HTTP
- the hostname is `127.0.0.1`, `localhost`, or `[::1]`
- the port is exactly `8787`
- the path is `/`
- the URL has no credentials, query, or fragment

The normal Ask Mark answer client remains independent. A remote preview or
production answer client must not imply that intake writes are enabled.

Local mode adds only:

```text
VITE_ASK_MARK_INTAKE_MODE=local-only
```

to `.env.askmark`.

The following files intentionally receive no intake variable:

```text
.env.askmark-preview
.env.askmark-production
```

## 5. Request contract

The browser client calls:

```text
POST /v1/intake/submissions
```

with exactly:

```json
{
  "type": "question",
  "language": "taglish",
  "message": "Pwede bang malaman kung anong CRM projects ang nagawa ni Mark?"
}
```

Allowed types:

- `question`
- `correction`
- `feedback`

Allowed languages:

- `en`
- `tl`
- `taglish`

Browser-side preparation mirrors the safe user-experience boundaries:

- normalize CRLF and CR to LF
- convert tabs to spaces
- normalize with NFKC
- trim outer whitespace
- reject malformed surrogate pairs
- reject unsafe C0/C1 controls
- require 10 through 1,000 Unicode code points
- require the serialized JSON body to fit within 4,096 UTF-8 bytes
- construct exactly the three approved fields

Server validation is still authoritative and may reject a request that passed
browser checks.

## 6. Response contract

Accepted:

- HTTP `202`
- `ok: true`
- opaque submission ID
- status `pending_review`

The client retains only:

```json
{
  "ok": true,
  "submission": {
    "id": "opaque-id",
    "status": "pending_review"
  }
}
```

The submitted text is not echoed into the success object.

Known safe error codes are preserved for UI mapping. Unknown or malformed
server responses become `unexpected_response`.

Network failures become `intake_unavailable`.

Aborted timeout requests become `request_timed_out`.

`Retry-After` is accepted only as an integer from 1 through 900 seconds and only
for `rate_limited`.

## 7. Planned interface

The Ask Mark panel will provide a low-emphasis entry point labeled:

```text
Submit a question, correction, or feedback
```

Opening it shows a contained form inside the assistant panel rather than a new
page or modal.

Fields:

1. Submission type
2. Language
3. Plain-text message

Default values:

- type: `question`
- language: `taglish`
- message: empty

The form displays:

- clear labels
- a 10–1,000 character counter based on Unicode code points
- a plain-language privacy warning
- a cancel action
- one primary submit action
- an `aria-live` status region

## 8. UI states

The form state machine is:

```text
idle
editing
submitting
accepted
duplicate
rate_limited
validation_error
unavailable
```

Rules:

- submitting disables all form controls
- accepted clears the text and shows no submitted content
- duplicate keeps the text so the visitor can revise it
- rate limiting keeps the text and may show safe remaining minutes
- unavailable keeps the text and offers retry or cancel
- closing the panel cancels visual activity but does not claim that a request
  was cancelled after the server accepted it
- no automatic resubmission occurs

## 9. User-facing meaning

Accepted copy must say that the submission was received for private review.

It must not say:

- approved
- published
- added to Ask Mark
- Mark will reply
- a response is guaranteed
- a specific review time is guaranteed

The interface reminds visitors not to include confidential, sensitive, or
personal contact information.

## 10. Accessibility

The form must support:

- visible labels
- keyboard-only operation
- logical focus order
- focus restoration when cancelled
- `aria-describedby` for guidance and errors
- `aria-live="polite"` for status
- no color-only error communication
- minimum practical touch targets
- reduced-motion behavior inherited from the assistant
- a usable 375-pixel mobile layout

## 11. Privacy and logging

The browser client:

- sends no cookies or credentials
- adds no user-agent or fingerprint fields
- adds no raw IP field
- does not persist submission text in local storage or session storage
- does not log submission text
- does not send submission text to analytics
- does not expose bucket or deduplication hashes
- does not echo server error details beyond approved code mapping

## 12. Out of scope

Phase 4B does not include:

- moderation dashboard
- admin authentication
- public submission history
- contact workflow
- email or SMS delivery
- attachments
- automated moderation
- AI classification
- automatic knowledge creation
- automatic publication
- preview or production write activation
- remote D1 migration
- Worker deployment
- Pages deployment
- merge to `main`

## 13. Acceptance criteria

Phase 4B is complete only when:

- the intake client is impossible to enable in preview or production modes
- the form supports all three types and languages
- message boundaries match the server contract
- duplicate, rate-limit, validation, timeout, and unavailable states are tested
- accepted UI copy accurately describes private pending review
- no visitor text enters analytics or browser persistence
- mobile, keyboard, and reduced-motion checks pass
- existing Ask Mark query behavior remains green
- the full local suite passes
- the public production read-only regression remains green
- every change is reviewed before commit, push, tag, merge, migration, or
  deployment
