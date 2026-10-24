# Ask Mark Phase 4D — Classification, Consent, and Abuse Controls Design

Status: Proposed design only; no implementation authorized
Phase: 4D
Target environment: local-only implementation and validation
Preview/production intake or moderation activation: Prohibited
Automatic moderation or publication: Prohibited

## 1. Objective and governing contracts

Design deterministic, reviewable intake classification, explicit visitor acknowledgement, and stronger abuse controls while preserving the validated Phase 4A–4C boundaries. This document describes work for a later, separate implementation authorization. It does not authorize schema, code, configuration, or runtime changes.

The following existing behavior remains authoritative:

- Ask Mark's answer endpoint reads active approved knowledge only. The frozen static matcher remains the required fallback. Phase 4D does not change answer behavior, answer data, routes, or fallback selection.
- Intake accepts only `question`, `correction`, or `feedback`, with visitor-selected `en`, `tl`, or `taglish` metadata and normalized plain text. `correction` is a visitor claim, never a verified fact.
- Intake records are private and begin at `pending_review`. No public lookup exists.
- Phase 4C `approved` means a submission is suitable for later human curation only. It does not approve facts, create knowledge, or authorize publication.
- Private moderation stays Mark-only, local-only, authenticated, audited, and protected by optimistic concurrency. Existing action/state transitions remain unchanged.
- Intake, classification, and moderation have no write path to sources, knowledge versions, publication releases, or `v_active_knowledge`.
- Preview and production Wrangler configurations remain without intake and moderation activation values. No remote D1 migration, deploy, or data access is part of 4D.

Phase 4A through 4C documents and implementation are the baseline. This proposal resolves no owner decision silently.

### Confirmed owner and governance context

Ask Mark is an independently developed and individually operated professional portfolio project hosted at markbadong.com, not a company or separate business entity. The individual portfolio owner is the proposed PIC for visitor processing, subject to qualified legal review. This is professional portfolio processing, not assumed purely household activity. The official public privacy contact is privacy@markbadong.com. The owner reports Cloudflare Email Routing forwards it to a verified private Gmail inbox and passed an end-to-end delivery test; these operational details were not independently inspected, and mailbox monitoring/response coverage remains to be documented. The owner’s formal legal identity/jurisdiction is still to be confirmed. Individual ownership does not itself establish an exemption from the Philippine Data Privacy Act.

Design privacy governance proportionately for a one-person operation while preserving obligations that apply: monitored privacy@markbadong.com contact, documented purpose/data/processor inventory, access restrictions, retention/deletion evidence, practical data subject rights handling, security and incident procedures, and periodic review. The privacy mailbox itself processes sender/contact metadata and possibly request content through Cloudflare Email Routing and Gmail; assess these flows and applicable terms. Do not determine the §12/§13 processing bases or DPO/registration/exemption status by assumption. Cloudflare processor/transfer arrangements, retention, deletion, security, and incident handling remain review gates as applicable.

## 2. Scope and exclusions

### In scope for a future local-only implementation

- Require an explicit, versioned privacy acknowledgement for every new intake submission.
- Store deterministic, low-information classification signals and distinguish them from a moderator's human classification and from moderation status.
- Improve request-size enforcement and ensure duplicate requests cannot evade all rate limiting.
- Surface classification signals only in the private moderation UI and audit human classification changes.
- Extend local schema, API, UI, tests, and documentation only after the owner approves the open decisions in Section 12.

### Explicit exclusions

- AI, ML, external APIs, paid CAPTCHA, Turnstile, third-party moderation, public-web search, or new subscription services.
- Automated accept, reject, approve, archive, redact, answer, or publish decisions.
- Contact fields, accounts, email, phone numbers, attachments, cookies, browser storage, device fingerprinting, analytics, or visitor tracking.
- A public moderation/read route, production moderator identity, preview/production intake activation, or a production retention job.
- Any change to approved knowledge or the public Ask Mark response path.

## 3. Proposed architecture and data flow

1. The existing form presents the notice in the visitor's selected language and requires an unchecked acknowledgement control before submission. It retains the existing type, language, message, and accessibility behavior.
2. The existing local-only intake route remains inactive unless the exact `ASK_MARK_INTAKE_MODE=local-only` and valid local hash key are present. A missing or invalid setting continues to produce the generic unknown-route `404` outside local mode.
3. Before parsing, the Worker validates method, approved origin behavior, JSON media type, declared body length when present, and a bounded actual body stream. The actual byte limit remains 4,096 bytes; `Content-Length` alone is not trusted.
4. The server strictly validates the flat JSON shape, exact allowed fields, language/type allowlists, acknowledgement boolean and current notice version, UTF-8, Unicode, normalization, and message code-point bounds. Browser validation remains convenience only.
5. A short-lived, keyed attempt limiter runs before deduplication. It uses only the current permitted requester derivation and never persists a raw IP or arbitrary request header. If the limiter is unavailable or its state cannot be trusted, intake fails closed with a generic service error.
6. A pure deterministic classifier examines the already validated, normalized submission and returns a classifier version, a visitor-intent category derived from the submitted type, and a small allowlist of risk signals. It does not infer truth, language, relevance, or abusive intent from natural-language meaning.
7. The server records the accepted acknowledgement version and server timestamp, original submission, fixed classifier result, initial `pending_review` status, intake events, and accepted-submission counter atomically. The public `202` response stays generic and does not return text, labels, priority, or moderation status details beyond the already-defined opaque ID and `pending_review` contract.
8. The Mark-only local moderation UI displays the visitor-selected type separately from machine signals and any human review label. Signals are warnings and filters, never buttons or automatic state transitions.
9. A moderator may assign or revise a human review label through an authenticated local-only route. Each change uses a dedicated expected classification timestamp and creates an immutable classification audit row in the same D1 batch. It does not alter moderation status.
10. Existing moderation actions continue to use the Phase 4C transition table, expected status and timestamp, and immutable moderation-action/event batch. No classification endpoint accepts status, knowledge, source, release, answer, or publication fields.
11. Expiration remains bounded by the existing 90-day intake policy. Classification, acknowledgement evidence, and audit rows cascade with the submission unless the owner approves a different retention policy. Rate-limit buckets expire within 24 hours.

D1 `batch()` is appropriate for each set of writes that must commit or roll back together; Cloudflare documents batches as sequential transactional statements that abort/roll back on statement failure ([D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)). The attempt charge must be a separate transaction from inserting a submission so a duplicate conflict cannot roll it back. This deliberate separation means a valid retry can consume attempt budget even when no submission is created.

## 4. Classification contract

### 4.1 Three independent concepts

| Concept | Source | Meaning | May change status? |
|---|---|---|---|
| Visitor-selected type | Visitor form (`question`, `correction`, `feedback`) | What the visitor says they are submitting. A correction remains an unverified claim. | No |
| Machine classification signals | Versioned deterministic rules | Mechanical indicators that may help a moderator triage. They are not semantic moderation decisions. | No |
| Human review label | Mark through private moderation UI | Mark's current private description of how to review the item. | No |
| Moderation status | Existing Phase 4C state machine | `pending_review`, `approved`, `rejected`, or `archived` following an explicit moderator action. | Only through existing Phase 4C actions |
| Publication approval | Separate future source/knowledge workflow | Not provided by intake or moderation approval. | Never in Phase 4D |

All new submissions still enter `pending_review`. There is no automatic approval, rejection, or publication, even when a signal is present.

### 4.2 Deterministic outputs

Use a pure function with an explicit `classifier_version`, for example `4d-rules-v1`. Its inputs are only the validated type, selected language, and normalized message. It has no network, clock, database, random, or model dependency. Rule order and output ordering are stable.

Machine outputs are deliberately narrow:

- `visitor_intent`: `question`, `correction_claim`, or `feedback`, mapped only from the visitor's selected type.
- `signals`: zero or more allowlisted codes such as lower-confidence `possible_contact_detail`, `possible_credential`, `link_dense`, or `repeated_text_pattern`. High-confidence obvious contact/secret patterns are rejected before persistence, so accepted rows should not carry those same high-confidence findings. A signal may still flag uncertainty; it never promises detection or safe content.
- `triage_priority`: `standard` by default; `attention` only when a narrowly defined sensitive-data or abuse-risk signal fires. This is a deterministic queue hint, not an urgency or risk judgment.
- `classifier_version`: the exact ruleset that produced those values.

Do not persist matched substrings, regex captures, raw headers, or a free-form machine explanation. The UI may show the code and a neutral explanation, but it must not echo the matched value. Any thresholds must be constants, versioned, tested, and owner-approved before implementation.

Signals are hints with known false positives and false negatives. In particular:

- Pre-persistence rejection uses only high-confidence patterns. Persisted `possible_contact_detail`/`possible_credential` signals are reserved for lower-confidence indicators that merit private human review; false positives and misses remain possible. Do not claim the message is safe when no signal fires.
- `link_dense` and `repeated_text_pattern` can raise a review flag but must not cause a rejection. Do not classify based on keyword lists for spam, political content, or sensitive topics.
- Do not infer English, Filipino, or Taglish from the body. Preserve the visitor-selected metadata (`en`, `tl`, `taglish`).
- Do not label a message `off_topic`, `ambiguous`, or factually false through machine heuristics. Those are human judgments.
- No signal may reveal content in a public response, analytics event, log, or non-moderator view.

### 4.3 Human review labels and priority

The proposed private human label allowlist is:

- `question_candidate`
- `correction_candidate`
- `feedback`
- `ambiguous`
- `duplicate`
- `off_topic`
- `spam_or_abuse`
- `sensitive_content`

The initial human label is `unreviewed`. The moderator chooses or clears a label explicitly. Selecting `correction_candidate` means only that Mark should verify the claim against an approved source. It does not validate the correction.

`attention` is a display/filter hint, not a severity score, SLA, or promise of immediate response. The existing Phase 4C keyset ordering (`created_at DESC, id DESC`) remains the default and existing cursor contract. A new label/signal filter can be added; changing default queue ordering requires owner approval and a separate cursor compatibility review.

The human-label endpoint must accept only the label, its allowed reason code if approved, and `expectedClassificationUpdatedAt`. It uses the existing local admin authentication, local origin allowlist, no-store headers, strict payload parsing, and generic errors. Stale writes return `409 stale_classification` with no write.

### 4.4 Duplicate, ambiguous, irrelevant, and sensitive messages

- **Exact duplicate in the same requester/window:** Preserve Phase 4A's existing per-window keyed suppression. The conflicting request is not stored and gets the existing generic duplicate response. It has no submission classification record.
- **Cross-requester or later-window duplicate:** Do not create a stable cross-visitor content matcher. A moderator may label a submission `duplicate` after review. Repeated or similar text does not prove a shared visitor.
- **Ambiguous:** Keep it pending review. Only Mark may assign `ambiguous`; do not attempt multilingual intent detection.
- **Irrelevant:** Do not auto-reject. Mark may label `off_topic` and use the existing `not_relevant` rejection reason.
- **Obvious contact details or secrets:** Before persistence, apply a small, versioned set of high-confidence structural checks for email/phone-like contact details and recognizable credential/secret formats. If a check matches, reject the whole submission with a generic, actionable error asking the visitor to remove contact or confidential data; do not echo the value, persist it, log it, or retain a matched substring. These checks are not comprehensive DLP and can reject harmless examples; fixtures must cover false positives in English, Filipino, Taglish, and ordinary technical text.
- **Sensitive content missed by validation:** Keep the row private, mark it for attention only when a deterministic signal fires, omit content from queue summaries, and expose it only in the authenticated detail view. A signal never redacts or changes status. Provide a separate Mark-only, audited `redact_content` action that irreversibly clears the body and content-derived hashes, keeps only the minimum status/audit tombstone needed for truthful history, and records no excerpt. Moderators must not copy sensitive text into immutable notes. This new action and the exact tombstone fields require owner approval; hard deletion currently cascades and would erase Phase 4C audit history.
- **Malicious markup or prompt-like text:** Continue treating it as plain text. Do not execute HTML, parse Markdown, auto-link, load remote resources, or pass the text to an AI system.

## 5. Consent and privacy contract

### 5.1 Privacy notice and separate acknowledgement

Before submit, display a concise notice adjacent to the text field and a required, unchecked checkbox. The user must actively check it; prechecked, hidden, inferred, or browser-stored acknowledgement is not acceptable. Server validation is authoritative.

Before submission, present an accessible privacy notice beside the form and a required, initially unchecked acknowledgement. The notice must state, in clear language:

1. the type, selected language, and message are sent to Mark's private review queue;
2. a temporary keyed network-derived value is proposed for abuse limits; no name, email, phone, account, or device fingerprint is requested;
3. the submission is not published and will not change Ask Mark's approved answers;
4. Mark may not respond; no response or review time is promised;
5. visitors should not include personal contact details, sensitive personal information, confidential material, passwords, or tokens;
6. the proposed maximum retention is 90 days; and
7. privacy-rights requests may be sent to privacy@markbadong.com.

Draft English privacy notice, version `ask-mark-intake-privacy-v1` (owner and legal review required):

> You are sending your selected type, language, and message to Mark for private review. A temporary keyed network-derived value is proposed to help limit abuse; no name, email, phone, account, or device fingerprint is requested. Submissions are not automatically published and do not change Ask Mark's approved answers. Mark may not respond. The submission is planned to be kept for no more than 90 days. Please do not include personal contact details, sensitive personal information, confidential information, passwords, or tokens. For privacy-rights requests, contact privacy@markbadong.com.

Draft Filipino privacy notice (must receive fluent human review before use):

> Ipinapadala mo kay Mark ang napili mong uri, wika, at mensahe para sa pribadong pagsusuri. Iminumungkahi ang pansamantalang keyed value na mula sa network para makatulong sa pagpigil ng abuse; hindi hinihingi ang pangalan, email, telepono, account, o device fingerprint. Hindi awtomatikong inilalathala ang mga mensahe at hindi nito binabago ang mga aprubadong sagot ng Ask Mark. Maaaring hindi tumugon si Mark. Iminumungkahing itago ang mensahe nang hindi lalampas sa 90 araw. Huwag magsama ng personal na detalye para makontak ka, sensitibong personal na impormasyon, kumpidensiyal na impormasyon, password, o token. Para sa mga kahilingan tungkol sa privacy rights, mag-email sa privacy@markbadong.com.

Draft natural Taglish privacy notice (must receive fluent human review before use):

> Ipinapadala mo kay Mark ang selected type, language, at message mo para ma-review niya nang privately. Proposed ang temporary keyed value mula sa network para makatulong mag-limit ng abuse; hindi hinihingi ang name, email, phone, account, o device fingerprint mo. Hindi ito automatic na ipo-post at hindi nito babaguhin ang approved answers ng Ask Mark. Puwedeng walang reply si Mark. Proposed na itago ang submission nang hanggang 90 days lang. Huwag maglagay ng personal contact details, sensitive personal information, confidential na impormasyon, password, o token. For privacy-rights requests tungkol sa personal data mo, mag-email sa privacy@markbadong.com.

Suggested accessible acknowledgement text (localized to the selected notice language; checkbox starts unchecked):

- **English:** “I have read the privacy notice and understand how my submission will be handled.”
- **Filipino:** “Nabasa ko ang paunawa sa privacy at nauunawaan ko kung paano hahawakan ang aking mensahe.”
- **Taglish:** “Nabasa ko ang privacy notice at naiintindihan ko kung paano hahawakan ang submission ko.”

This acknowledgement records only that the visitor activated the checkbox and sent the current notice version; it does not by itself establish consent as the legal basis. Do not label it “I consent” unless the owner, after jurisdiction-specific legal review, selects consent and confirms it is freely given, informed, specific, and withdrawable as applicable. Possible basis options for counsel/owner assessment include consent or legitimate interests, with any other applicable statutory basis evaluated against the actual purpose and context. The Philippine Data Privacy Act lists lawful processing criteria in Section 12, and NPC consent guidance cautions that consent must be freely given; legitimate interests require a purpose, necessity, and balancing assessment. These references are inputs for review, not a legal determination: [Data Privacy Act (NPC)](https://privacy.gov.ph/data-privacy-act/), [NPC Circular 2023-04 on Consent](https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf), [NPC Advisory Opinion 2023-011](https://privacy.gov.ph/wp-content/uploads/2023/05/Advisory-Opinion-No.-2023-011.pdf). Owner/counsel approval of jurisdiction, controller identity, final notice, translations, basis, and any withdrawal process is required before activation.

### 5.2 Request and evidence fields

Extend the strict request contract with exactly two fields:

```json
{
  "type": "question",
  "language": "taglish",
  "message": "Pwede bang malaman kung anong CRM projects ang nagawa ni Mark?",
  "privacyNoticeVersion": "ask-mark-intake-privacy-v1",
  "privacyAcknowledged": true
}
```

The Worker accepts only `privacyAcknowledged: true` and the current notice version on a fixed server-side allowlist. The client cannot select an arbitrary version or timestamp. For an accepted submission, the Worker records `privacy_notice_version` and server-generated UTC `privacy_acknowledged_at` alongside the intake record in the same accepted-submission batch. The evidence proves only that this payload asserted acknowledgement; it does not identify a person, prove comprehension, or establish a legal basis. Provide equivalent English, Filipino, and Taglish notices; do not activate the notice until fluent human review and owner approval of the translations and processing basis.

No consent text, IP, user-agent, browser ID, or form telemetry is recorded. Changing notice text requires a new version. Existing 4A/4B submissions have no acknowledgement evidence and must remain explicitly marked legacy/unknown; do not backfill or imply consent retroactively.

### 5.3 Minimization, accessibility, and language

- Keep existing `en`, `tl`, and `taglish` wire values until the owner approves any API migration. UI labels may say “Filipino / Tagalog” for `tl`; no automatic language detection is added.
- Provide equivalent meaning in all three language choices, with a visible language selector for the notice or a language-matched notice plus an accessible way to view the others.
- Use semantic labels, a real checkbox, keyboard operation, visible focus, `aria-describedby`, and a polite live error/status region. Do not depend on color or motion. Keep the form usable on mobile and with zoom/screen readers.
- Preserve the Phase 4B behavior: accepted text clears from the form, duplicate/rate-limit/unavailable states retain it for deliberate editing/retry, and the client never auto-resubmits.
- Do not store drafts in local/session storage. Do not add contact collection to make a reply possible.

### 5.4 Data-subject rights request procedure

The official public privacy contact is privacy@markbadong.com. The owner reports that Cloudflare Email Routing forwards it to a verified private Gmail inbox and that an end-to-end delivery test succeeded. This is an owner-reported operational fact, not an independent service/account review. Before any future collection, designate who monitors the mailbox, check frequency and backup coverage, applicable legal response timelines, account protections, and the retention period for request correspondence.

Email itself processes the requester’s address, headers, message and any attachments; visitors may inadvertently send SPI. Use the channel only for privacy requests, ask visitors not to send sensitive material or identity documents by default, and assess Cloudflare Email Routing/Gmail roles, terms, locations, access, retention and deletion. Do not store full request emails in application logs, moderation notes, or visitor-submission tables.

Proposed handling flow:

1. Create a random case ID and record only necessary metadata (receipt date, request category, opaque submission ID if supplied, verification steps, decision/legal exception, action and closure date) in a restricted case process. Approve its lawful basis and retention before activation.
2. Acknowledge the request and establish which record is involved using the opaque receipt and minimal non-sensitive context. The sender’s email address alone does not prove identity or link them to an anonymous submission.
3. Apply proportionate verification without requiring government ID by default. If more information is needed, explain why and request the minimum necessary; never disclose another person’s record based on guessed content.
4. Assess the specific right, applicable exception/legal hold, third-party information, identity/record match and technical reach across D1, moderation/audit, exports, application/platform logs, email providers and backups.
5. Only an authorized operator performs an approved access, correction, objection, blocking/erasure, portability or other applicable action. Verify completion across relevant systems/processors and state any lawful retention or backup expiry accurately; do not promise unverified deletion.
6. Respond through a safe channel within the applicable legally reviewed timeline, explain decisions/limitations and applicable complaint options, retain minimal case evidence for a documented lawful purpose, and escalate disputes, uncertain exceptions, suspected breaches, delay risks or processor limitations to the PIC/legal adviser.

Do not invent a response deadline or treat every request as an absolute right to immediate deletion. Counsel must confirm applicable rights, exceptions and timelines before collection.

### 5.5 Retention and deletion

Retain the existing 90-day submission expiry and 24-hour maximum rate-bucket lifetime as proposed defaults. Do not extend expiry when a submission is approved, reopened, relabeled, or otherwise moderated. Classification signals, review-label history, consent version/time, submission events, and moderation actions must have the same or shorter retention than the submission and cascade on expiry. A redacted tombstone and its minimum audit evidence expire with the parent. A purge must never affect source, knowledge, release, or publication tables. Before any future remote activation, expiry, redaction, deletion, and verification operations must be implemented, tested against disposable local D1 data, and operationally reviewed; a timestamp is not proof of deletion.

Phase 4A includes a deterministic local purge helper, not an active production deletion schedule. Therefore any future production intake remains blocked until a separately reviewed retention schedule, operational purge mechanism, failure monitoring, and deletion verification are approved. Do not silently describe a nominal `expires_at` as completed deletion.

## 6. Abuse-control design

### 6.1 Preserve and correct current limits

Current Phase 4A design and implementation use a keyed requester bucket, 15-minute windows, five accepted submissions, window-scoped duplicate suppression, and bucket expiry within 24 hours. No raw IP is persisted or logged by the application. The raw `cf-connecting-ip` value is processed transiently to derive a keyed HMAC bucket value that is currently stable across multiple 15-minute windows. Although the table key also includes the window, the HMAC itself enables cross-window linkage while rows survive. Recommend deriving a new HMAC scoped to the current 15-minute window, so the persisted value cannot join adjacent windows; it remains pseudonymous network metadata during that window, not anonymous data or a device fingerprint. Keep the synthetic requester header strictly local/test-only.

A duplicate-key constraint failure currently rolls back the same D1 batch that increments `request_count`. Repeated identical requests can therefore avoid the accepted-submission counter. Recommend separate counters:

1. a short-lived **attempt counter** that commits before duplicate detection and limits repeated syntactically routed intake attempts; and
2. the existing **accepted-submission counter**, which increments atomically with the submission and its events and remains capped at five per 15-minute requester window.

A duplicate consumes attempt budget but not accepted-submission budget. Retain five accepted submissions per 15-minute bucket and use **20 total bounded POST attempts per 15-minute bucket as the initial local-only design/test value**, including duplicates and POSTs rejected for origin, media type, malformed JSON, invalid fields, missing acknowledgement, sensitive-content checks, or size. Charge once for POSTs to the exact intake path before those checks; count an oversized POST from its route/headers without reading the unbounded body. Exclude preflight `OPTIONS`, other methods, and unrelated paths. Freeze this sequencing in the API contract before coding. This is not a production guarantee or an owner-approved remote threshold.

The attempt bucket needs one committed D1 mutation per charge; a rejected request cannot be counted durably without a write. At the proposed threshold, one requester bucket can cause up to 20 attempt-counter mutations per window (plus the accepted-submission batch for at most five accepted items), roughly four attempt charges for each accepted slot at saturation. Based on the current four-statement accepted batch, illustrative logical SQL statement counts are:

| Synthetic bucket/window | Attempt-counter mutations | Accepted batches | Accepted-batch statements | Approx. successful write statements | Additional failed duplicate batch statements |
|---|---:|---:|---:|---:|---:|
| 20 malformed/rejected attempts | 20 | 0 | 0 | 20 | 0 |
| 5 accepted, 15 pre-storage rejects | 20 | 5 | 20 | 40 | 0 |
| 5 accepted, 15 exact duplicates | 20 | 5 | 20 | 40 | up to 30 attempted statements total across 15 duplicate batches (2 per batch before the unique insert fails); each failed batch rolls back its accepted-counter update |
| 20 distinct requester buckets, one request each | 20 | workload-dependent | 4 per accepted submission | at least 20, plus accepted writes | workload-dependent |

These are SQL statement/row-operation estimates, not billed-operation or dollar estimates. They exclude request-level SELECTs, retries, purge, and platform logs; real billing must be checked separately before remote activation. A pure rejection load has one durable bucket write per request, while duplicates also execute the existing transactional insert path and can amplify statements without consuming accepted quota. A local synthetic model also estimates 20 duplicate attempts followed by 80 over-limit retries as 20 durable attempt writes, 40 failed-batch statements, and 80 reads to reject the capped retries (assuming each cap check reads current state). A 20-attempt threshold therefore improves same-bucket retry bounds but does not cap distributed traffic. Shared NATs can combine many legitimate visitors into one bucket and cause false rate limits; rotating or distributed source addresses can instead create many buckets and make write volume/row creation scale with incoming requests. At cap, use a read/conditional design that avoids repeated writes, but count any extra read in measured operations. Keep bucket rows bounded by expiry, scope the HMAC to a single window, measure amplification and shared-network lockouts under synthetic local load, and require an explicit owner decision on the remote cost/false-positive tradeoff. This is a per-bucket limit, not a global traffic cap. Recommend 20 only as a local test starting point; no public value is recommended without observed legitimate burst data and a cost review.

Do not turn that per-bucket estimate into a global D1 cost ceiling. For `N` distinct requester buckets each making `A` attempts in the window, attempt-counter writes scale as `N × A` until source creation is constrained elsewhere. Twenty rotating identities can produce 20 bucket mutations for one request each; 1,000 identities can produce 1,000. No application-level IP-derived bucket can provide a finite global bound against distributed sources. Database failure must fail closed with a generic unavailable response; if this dependency causes unacceptable write cost or shared-network lockouts, do not activate intake and return for owner review rather than increasing the threshold by guesswork.

### 6.2 Request and payload protections

- Preserve exact method, route, CORS origin, content-type, flat JSON, field allowlist, 4,096-byte body, 10–1,000 normalized code-point, Unicode, and control-character constraints.
- Enforce the actual byte cap while reading a bounded stream. `Content-Length` can be absent or dishonest; the current `request.arrayBuffer()` reads the complete body before checking actual size, so it does not meet Phase 4A's stated “read at most 4,096 bytes” invariant. This discrepancy is a required local implementation checkpoint before any remote exposure.
- Apply rate/abuse checks before expensive parsing or classification where possible, while keeping memory bounded and avoiding a new stable identity. Do not reflect arbitrary headers or body fields into SQL or errors.
- Keep prepared statements and allowlists. Unknown fields, duplicate JSON keys, nested data, arrays, invalid UTF-8/Unicode, and oversized requests fail before a submission write.
- Keep generic public responses (`202`, duplicate, rate limit, validation, or service unavailable); never reveal bucket identity, classifier results, queue existence, or another submission.
- Keep no credentials/cookies, exact CORS, no-store where the existing intake contract requires it, `nosniff`, and no-referrer behavior. CORS remains a browser boundary, not authentication.
- No client retry loop, hidden background retry, or UI-triggered duplicate resubmission. A user retry must be explicit.

### 6.3 No new external challenge service

Do not add CAPTCHA, Turnstile, an AI detector, analytics, or an external bot-scoring service. Do not introduce a hidden honeypot or timing/fingerprint collection in the initial 4D design; these can harm accessibility and are easy to evade. If local-only controls are insufficient for a later public service, stop and ask for a separately scoped owner decision rather than quietly adding a service.

## 7. Proposed schema and API changes

All names below are proposals for a later local-only migration, tentatively `0007_phase4d_intake_controls.sql`. Review SQLite migration mechanics and existing migration checks before implementation; do not edit current migrations in the design phase.

### 7.1 Consent evidence

Add nullable `privacy_notice_version` and `privacy_acknowledged_at` to `visitor_submissions` so pre-4D rows remain honestly unknown. New intake writes must supply both after server validation. UTC time is server-generated. Enforce paired null/non-null values while preserving legacy rows. Remove notice version/time if a submission is fully deleted; a redacted tombstone may retain only the minimum acknowledgement/audit metadata approved by the owner and no longer than the parent retention.

### 7.2 Machine classification signals

Use two private normalized tables:

- `visitor_submission_classifications`: one row per submission with `submission_id` primary/foreign key (`ON DELETE CASCADE`), `classifier_version`, `visitor_intent`, `triage_priority`, and server-generated `created_at`. Store `review_label`, `review_updated_at`, and `review_updated_by` here if the owner approves human labels; those fields remain semantically distinct from machine output.
- `visitor_submission_classification_signals`: zero or more rows per submission, keyed by `(submission_id, signal_code)`, with a foreign key to the classification row and `ON DELETE CASCADE`. `signal_code` is a fixed allowlist; do not store matched snippets.

This records a classifier result even when no risk signal fires, without arbitrary JSON or unvalidated classifier prose. Historical submissions should be `legacy_unclassified`; do not rescan or backfill their content during migration.

### 7.3 Human review classification and audit

Use the allowlisted current `review_label`, `review_updated_at`, and fixed local moderator actor ID fields on the one-per-submission classification row described above; do not duplicate current-label state in another table. Add an append-only `visitor_submission_classification_events` table with opaque ID, submission ID, prior/new label, reason code, actor ID, and server time. These tables cascade with the submission and have no foreign keys to knowledge/publication tables. Keep machine classification, the human label, Phase 4C moderation status, and publication approval as independent fields/concepts.

Add an authenticated local-only route:

```text
POST /v1/admin/intake/submissions/:submissionId/classification
```

It accepts only `{ "label": "ambiguous", "expectedClassificationUpdatedAt": "...", "reasonCode": "..." }` (final fields/reasons to be frozen by owner). Enforce exact own properties, bounded body, allowlists, no-store, existing admin header/origin, and conditional update plus audit insert in one batch. Stale timestamp yields `409 stale_classification` with no write. Do not add a public route or change the existing moderation action route.

The moderation queue may gain `signal`, `priority`, and `reviewLabel` filters and display fields. Keep its current `status/type/language/limit/cursor` behavior, default status, limit 50, and keyset ordering. Detail remains allowlisted and excludes all bucket/dedup/content hashes, consent payload internals beyond notice version/time, SQL, and stack details.

### 7.4 Attempt counters and hash minimization

Extend local abuse storage with a separate short-lived attempt count so duplicate failures cannot roll it back. Keep accepted count and submission/event/classification/consent insertion atomic. Use a proposed initial local threshold of 20 bounded intake POST attempts per 15-minute window, including duplicates and bounded validation rejections, in addition to the existing cap of five accepted submissions. Exclude preflight and non-intake routes; charge oversize intake requests once before body reading. Measure false positives and D1 write amplification locally; remote threshold/cost acceptance remains an owner decision.

The current `content_hash` is an unkeyed SHA-256 over normalized type/language/message, is stored for the full submission lifetime, and is not read by current runtime code after deduplication-hash creation (migration/test checks do reference it). Low-entropy messages can be guessed offline and identical content can be linked across rows. Recommend removing the persisted column and index; compute any content digest only transiently to create the existing keyed deduplication token, if the algorithm still needs it. Retain only the requester/window-scoped HMAC deduplication value if duplicate suppression tests prove it is needed. Make the deduplication value nullable for content-redaction, or replace it with a collision-safe tombstone design. Removing stored hashes is irreversible data loss and requires migration review, tests, and a backup/snapshot of any non-disposable local D1 before migration. A SQLite table rebuild must preserve existing submission rows, foreign keys, indexes, events, and moderation actions; no remote D1 is to be inspected or touched.

For sensitive-content redaction, propose nullable `content_text` and `deduplication_hash` plus `content_redacted_at`, with a CHECK that a redacted row has no content-derived hash. A private moderation action with a fixed `redact_content` action/reason code uses the existing auth/origin/no-store controls and optimistic concurrency. It clears the body and both hashes irreversibly, appends a minimal immutable privacy event with actor/time/fixed reason but no excerpt, and leaves moderation status unchanged. Retain only opaque row identity, existing status chronology and minimal audit needed to explain the redaction until original expiry. No free-text note is accepted on this action. If this cannot coexist with Phase 4C audit immutability, stop for an owner decision rather than cascade-delete history silently.

### 7.5 Responses and errors

The accepted public response remains the Phase 4A/4B `{ok, submission:{id,status}}` shape. Do not return classifier signals, consent evidence, requester metadata, or content. Add a safe client error for missing/invalid acknowledgement, such as `privacy_acknowledgement_required`, without echoing request values. Preserve existing duplicate, rate-limited, validation, and generic availability responses.

## 8. Privacy and security risks

- Acknowledgement can be forged by direct API callers; it records a UI assertion, not identity or legal consent.
- A deterministic sensitive-data scanner can miss data or create false positives, especially with Filipino/Taglish, spacing, Unicode confusables, and encoded values.
- `cf-connecting-ip` HMAC still processes a network identifier; window-scoping reduces but does not eliminate pseudonymous processing. Rotating/distributed sources bypass per-bucket limits and can amplify D1 writes.
- A 90-day `expires_at` is not a deletion guarantee without a running, monitored purge mechanism. Existing audit rows cascade on purge; any early-redaction tombstone must preserve only approved minimal audit while expiring with the parent.
- Pattern-based pre-persistence rejection can block harmless technical or public-contact examples; missed sensitive data requires a tested irreversible redaction path, while notes must not copy the content.
- Classification flags, label filters, timing, and queue presence are private operational data and must never enter normal/preview/production public bundles.
- Request-size limits and application D1 rate limits do not stop all volumetric traffic from reaching the Worker. No free local control can promise DDoS prevention.

## 9. Proposed local-only implementation checkpoints

1. **4D.1 — Owner decisions and contract freeze:** approve notice/legal basis, human-reviewed translations, exact rejection/signal patterns, human-label set, attempt semantics and local threshold, HMAC window scoping, stored-hash removal, redaction/tombstone policy, and retention/deletion obligations. No implementation before separate authorization.
2. **4D.2 — Local baseline and migration safety:** record local-only schema/row counts; snapshot any non-disposable local D1; review draft `0007` before registering it in `migrations/`. Preserve 4A–4C rows/statuses, foreign keys, indexes, events/actions, expiry, and publication isolation. Exercise migration on disposable local D1 with empty and representative populated fixtures; inject a failure after DDL and verify Wrangler rollback, then apply successfully and verify deduplication uniqueness and FK integrity. Never query or migrate remote D1. Dropping `content_hash` values is irreversible; rollback after success requires a pre-change backup and may not reconstruct the discarded values.
3. **4D.3 — Bounded intake and deterministic pre-persistence checks:** stream-cap at 4,096 bytes; implement pure versioned classification and high-confidence contact/secret rejection over validated text; prove rejection writes no submission/body/hash/classification/event, echoes no matched value, and has acceptable multilingual false-positive fixtures. Keep no external request or model.
4. **4D.4 — Consent and rate accounting:** require current notice version plus affirmative checkbox; persist only server version/time on accepted rows. Add the separate attempt counter (initial local fixture: 20 per window, including bounded invalid requests/duplicates) and retain five accepted per window. Concurrency tests prove neither cap is exceeded, duplicates consume only attempts, and attempt charging cannot be rolled back by validation/duplicate failures.
5. **4D.5 — Atomic storage, privacy redaction and expiry:** insert accepted submission, consent, classifier, initial event, and accepted counter atomically. Implement the separately authorized Mark-only redaction/tombstone action with optimistic concurrency, immutable minimal audit, no free text, and irreversible body/hash clearing. Test idempotence, cascades, expiry, deletion verification, and preservation of unrelated 4A–4C/audit/publication rows.
6. **4D.6 — Private human review controls:** add authenticated local-only label route/UI with allowlists, separate expected timestamp, stale `409`, immutable audit, and no status transition. Test local auth/origin/no-store and prove classification/redaction cannot write knowledge or publication tables.
7. **4D.7 — Local abuse, privacy, accessibility and regression:** measure D1 writes/row growth for 20 attempts per source and rotating-source traffic; document false positives and limits; validate English/Filipino/Taglish notice equivalence, keyboard/screen-reader flow, safe errors, no sensitive logs, and no persistence on rejection. Run 4A–4C regression and public-bundle isolation checks locally.
8. **4D.8 — Readiness gate:** test retention, deletion/purge success, failure/retry monitoring, redaction, and verification against disposable local D1. A future remote activation requires separate owner approval after these controls and platform log/cost implications are reviewed. No preview/production writes, migrations, config activation, deployment, or remote data reads occur in these checkpoints.

## 10. Test and regression strategy

### Classifier

- Same normalized input and ruleset always produce byte-for-byte stable outputs.
- Selected `correction` always yields a claim/candidate label, never a verified fact.
- English, Filipino/Tagalog and Taglish examples produce no inferred language label.
- Sensitive/link/repetition signals fire only for approved fixtures and never store matched substrings.
- High-confidence email/phone/credential patterns are rejected before submission persistence; benign technical examples are false-positive fixtures; responses and logs never contain matched values. Detector misses are not described as safe.
- No matching, contradictory, unicode-confusable, encoded, or unsupported content still remains pending review; absence of a signal is not “safe.”
- Ambiguous, off-topic, duplicate, and spam human labels require moderator action and leave status unchanged.

### Consent and privacy

- Missing/false acknowledgement, unknown notice version, duplicate/unknown fields, and malformed payload fail with safe errors and no partial write.
- New accepted rows record exact approved notice version and server time; client timestamp is rejected.
- Legacy rows remain null/unknown and are not described as acknowledged.
- UI checkbox is unchecked on every visit, keyboard reachable, required, and announced; notices are available in all supported language modes and correctly associated with the field.
- No message, acknowledgement, or label is stored in browser storage or sent to analytics; accepted response does not echo content.
- Submission expiry removes submission, classification, consent, events, and moderation/classification audit rows; rate buckets are independently expired by the 24-hour maximum.

### Abuse/API

- Actual streamed body over 4,096 bytes is rejected even without/with false `Content-Length`, without buffering the full body.
- Only bounded intake POST attempts are charged: 20 is the initial local test threshold, including duplicate, malformed/invalid, missing-acknowledgement, and sensitive-pattern rejection attempts. Preflight and unrelated routes/methods are excluded; oversized intake POSTs are charged once before body reading.
- Wrong method/media type/origin, malformed UTF-8/JSON, duplicate JSON fields, nested input, and overlong text fail before accepted writes.
- A concurrency test proves attempt cap cannot be exceeded and counts duplicate attempts; accepted count remains at five per current 15-minute window.
- D1 amplification is measured for a saturated bucket and rotating requester buckets; same-bucket capped repeats do not create unbounded rows, while tests document that per-bucket controls cannot bound distributed-source traffic.
- Exact same requester/window duplicate is rejected; it does not create submission/events or consume accepted count, but does consume attempt allowance.
- Requests from separate synthetic requesters do not share an application identifier; no raw IP/user-agent is persisted.
- D1 failure during accepted batch rolls back submission, accepted counter, classification, consent, and events; limiter failure returns generic fail-closed response.
- Redaction clears message and all content-derived hashes, creates only a fixed-reason private audit record, preserves approved status history, and cannot be reversed through the API. Expiry then removes the tombstone and linked metadata.
- Errors/logs never include body, address, raw request header, user text, classifier matched text, token/key, HMAC, digest, moderation note, SQL, or stack.

### Moderation/publication and non-regression

- Classification route requires local key and approved local origin; preview/production configs remain disabled and return the same generic not-found behavior.
- Missing/invalid key, malformed label, invalid transition, stale `expectedClassificationUpdatedAt`, and D1 failure create no partial classification/audit write.
- Every human label change adds exactly one immutable event; repeat/stale actions cannot overwrite history.
- Classification never transitions `pending_review`/other status; Phase 4C approve/reject/archive/reopen semantics remain unchanged.
- Before/after source, knowledge, release, release-item, and active-knowledge identities/counts match for intake/classification/moderation operations.
- Existing health/bootstrap/query API, approved knowledge matching, route bundle splitting, static fallback, intake contracts outside the explicit acknowledgement extension, moderation auth/CORS, and production baseline checks remain green.
- Normal, preview and production bundles contain no admin route, moderation client, classifier internals, private text, consent payload, or admin header. Dedicated local moderation build may contain only the intended private UI.

## 11. Acceptance criteria

Phase 4D design is ready for implementation review only when:

- classification, human labels, moderation status, and publication are distinct in schema/API/UI language;
- all new intake remains pending review, irrespective of machine signals;
- visitor acknowledgement is explicit, versioned, timestamped server-side, minimized, and not misrepresented as identity proof;
- existing rate-limit and duplicate behavior is accurately documented and duplicate attempts can no longer bypass the planned total-attempt budget;
- actual body reads are bounded;
- all classification and consent evidence is private and expires with the submission;
- exact data retention and sensitive-data disposition have owner approval, including a tested irreversible early-redaction operation;
- 20 total bounded intake POST attempts per 15-minute window is validated locally for false positives and D1 write amplification; any remote cap remains separately approved;
- requester HMACs are scoped to one 15-minute window and cannot link adjacent windows;
- approved knowledge and publication are structurally isolated;
- every checkpoint remains local-only and public-bundle isolation is tested;
- no Phase 4D implementation proceeds without separate owner authorization.

## 12. Open decisions requiring owner approval

1. **Notice:** approve affirmative acknowledgement, final content/processing basis, version policy, and fluent human review of equivalent English, Filipino, and Taglish notices. Confirm the notice does not promise a response or guarantee detection of sensitive data.
2. **Retention:** confirm 90-day submission and 24-hour bucket maximums; approve how consent evidence and minimum redaction tombstones expire. Confirm the tested purge/deletion monitor required before any future remote activation.
3. **Classification:** approve deterministic signal codes/patterns, display, human-label allowlist, reason codes, and private local endpoint/UI. Signals remain non-decisional.
4. **Abuse limit:** accept or revise five accepted submissions plus 20 total POST attempts to the exact intake path per 15-minute window for local testing. Review shared-NAT false limits, measured D1 mutations, rotating-source row growth, and platform logging before approving a remote threshold.
5. **Requester minimization:** approve transient `cf-connecting-ip` use for local design, window-scoped HMAC values, and local-only synthetic override; review external platform logging before any public activation.
6. **Hash/schema change:** approve removal of persisted unkeyed `content_hash` and its index, and confirm window-scoped keyed duplicate suppression remains required. Dropping historical digest values is irreversible; require local snapshot/restore and populated-table migration tests.
7. **Sensitive-content deletion:** approve conservative pre-persistence rejection patterns and the proposed irreversible Mark-only redaction action/tombstone. Confirm minimum audit fields, historical-note treatment, and acknowledgement evidence retained after redaction.
8. **Activation:** no 4D design approval enables preview/production intake. Any later remote activation, D1 migration, retention operations, and Cloudflare platform log/cost review require separate explicit approval.
9. **External controls:** confirm no paid challenge, external AI, analytics, or fingerprinting service is in scope.
10. **Privacy accountability:** record the individual portfolio owner as proposed PIC; confirm formal legal identity/jurisdiction and legal applicability. The official public contact is privacy@markbadong.com; document its monitoring/response process and assess the Cloudflare Email Routing/Gmail flow. Obtain qualified review of §12/§13 bases, DPO/registration or exemption status, other processor/transfer terms, rights handling, retention/deletion, security, and incident duties. Individual ownership is not an assumed exemption.
