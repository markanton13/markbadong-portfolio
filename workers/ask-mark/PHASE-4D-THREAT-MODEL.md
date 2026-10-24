# Ask Mark Phase 4D — Classification, Consent, and Abuse Threat Model

Status: Proposed design only; implementation not authorized
Phase: 4D
Production/preview exposure: Prohibited
Automatic moderation/publication: Prohibited

## 1. Purpose and security invariants

This threat model extends the validated Phase 4A intake, Phase 4B visitor form, and Phase 4C private moderation workflow. It is a design artifact only. It does not authorize application code, a migration, a test, configuration changes, remote D1 access, or deployment.

Security invariants:

1. Ask Mark answers only from approved active knowledge; the deterministic frozen static fallback remains available and unchanged.
2. Visitor text is untrusted data. It is never an instruction to the system, evidence of truth, or approved portfolio knowledge.
3. Intake and classification remain private and inaccessible through public read routes.
4. Every accepted new submission remains `pending_review`. Classification cannot approve, reject, archive, redact, or publish.
5. Human moderation uses the existing Mark-only local auth boundary, immutable audit, and optimistic concurrency. A human review label is not a moderation decision.
6. Sources, knowledge items/versions, releases, release items, and `v_active_knowledge` remain isolated from intake/moderation writes.
7. Local, preview, and production remain distinct. Only local-only development configuration may enable intake/moderation during 4D implementation.
8. No raw IP, user-agent, cookie, account, device fingerprint, contact field, free-form machine rationale, or matched sensitive substring is stored or application-logged.
9. All acknowledgement, classification, moderation, event, and message data expires no later than the approved intake retention limit unless a separately reviewed policy changes it.
10. No AI, external service, paid CAPTCHA, or subscription is introduced.

## 2. Assets

- Visitor-submitted plain text, including any personal/sensitive data mistakenly included.
- Visitor-selected type/language and privacy notice version/acknowledgement time.
- Deterministic classifier version, risk signals, and triage priority.
- Private human review labels, reviewer actions, notes, and audit history.
- Local moderation key and local D1 state.
- Requester-derived HMAC bucket/deduplication values and short-lived attempt counts.
- Approved source, knowledge, release, and active-answer integrity.
- Public portfolio routes, public bundles, API availability, and frozen static fallback.
- Retention/deletion guarantees and visitor understanding of the submission process.

## 3. Trust boundaries and data flow

### 3.1 Visitor/browser to intake Worker

The visitor controls type, language, message, headers, body encoding, acknowledgement fields, and request frequency. Browser-side validation and a checked box can be bypassed with a direct request. The Worker is authoritative for payload acceptance, notice version, server timestamp, and rate limiting.

### 3.2 Intake Worker to D1

Validated message content is stored as plain text in dedicated visitor tables. Prepared statements and fixed enum allowlists remain mandatory. Machine signals contain rule identifiers, not snippets or conclusions. Each accepted insert, event, classifier record, consent evidence, and accepted counter must be atomic.

### 3.3 Requester derivation

The current implementation transiently reads `cf-connecting-ip` (or a local synthetic requester), HMACs the requester input, and persists the resulting bucket value. It does not persist the raw address. The HMAC is currently stable across 15-minute windows while bucket rows remain, enabling limited cross-window linkage. Recommend including the window start in the HMAC input so each persisted requester value is window-scoped. Even window-scoped values are pseudonymous network metadata during that window and must not be described as anonymous or zero personal-data processing. The synthetic requester must remain local/test-only.

### 3.4 Private moderation browser to Worker

The moderation interface is Mark-only, local loopback port 5174, with manually entered session-memory key. Queue/detail/classification routes use existing local-only mode, exact origins, constant-time key comparison, `no-store`, and safe serializers. No key or visitor content enters normal browser storage, analytics, logs, or public bundles.

### 3.5 Publication boundary

Intake and moderation have no foreign keys or module dependencies to source, knowledge-write, release, or active-view publication paths. Any future curation/publication requires a separate human-operated workflow and explicit authorization.

## 4. Threats and mitigations

### 4.1 False classification treated as a decision

**Threat:** A `possible_sensitive`, `link_dense`, or other signal is mistaken for proof and automatically rejects or approves a submission.

**Mitigation:** Machine signals are allowlisted, versioned, and explicitly labeled as heuristic. Every accepted item stays `pending_review`. The API cannot accept moderation status or publication fields. Only Mark can set a human review label or invoke existing audited moderation actions. Test every signal and prove status and publication tables remain unchanged.

### 4.2 Semantic bias and multilingual misclassification

**Threat:** English-only keywords, Taglish phrasing, spelling variations, or code-switching cause valid questions to be labeled spam, irrelevant, sensitive, or abusive.

**Mitigation:** Do not infer language or semantic relevance. Preserve visitor-selected `en`/`tl`/`taglish`. Restrict machine rules to structural patterns with reviewed examples in all languages. Keep `ambiguous`, `off_topic`, `duplicate`, and intent judgments human-only. Display rule version and a plain explanation without overclaiming accuracy.

### 4.3 Sensitive data captured in a message

**Threat:** A visitor includes a phone number, email, password, token, address, or confidential material despite the warning. The classifier misses it or falsely signals an innocent value.

**Mitigation:** Before persistence, reject only high-confidence structural matches for email/phone-like contact details and recognizable credentials/secrets, using a generic response that does not repeat the value. Keep the detector small, deterministic, versioned, and tested against harmless technical examples in English, Filipino, and Taglish. It is not complete DLP. For missed sensitive text, provide a separate authenticated Mark-only redaction action that irreversibly clears body and content-derived hashes while retaining only owner-approved minimal status/audit tombstone data until original expiry. Add an immutable fixed-reason privacy event without excerpts; do not alter moderation status or copy content into notes. Hard deletion currently cascades Phase 4C history, so the schema and audit treatment require explicit approval and migration tests.

### 4.4 Forged or misunderstood acknowledgement

**Threat:** A bot sends `privacyAcknowledged: true`, a stale notice version, or a visitor checks a box without understanding the notice. A stored row could be misrepresented as proof of identity or legal consent.

**Mitigation:** Server accepts only a fixed known notice version and boolean true; server time is authoritative. Store only version/time with the submission. Label it “acknowledgement recorded,” never “identity verified.” Keep copy visible and accessible in the selected language. Obtain owner/legal wording and processing-basis review. This cannot prove comprehension or lawful basis.

### 4.5 Request-body memory exhaustion

**Threat:** A caller omits or lies about `Content-Length` and sends a very large body. Existing `readUtf8Body()` calls `request.arrayBuffer()` before checking actual size, which can buffer more than the documented 4,096-byte limit.

**Mitigation:** Required implementation gap: enforce a streaming byte cap and stop/cancel reading immediately after the bound; test missing and false lengths. Reject declared oversize early but never rely on that header. Do not parse/classify/write oversized data. Keep response generic and the cap small.

### 4.6 Duplicate-request rate-limit bypass

**Threat:** Exact duplicate insert violates the unique `deduplication_hash` constraint. Because the bucket increment and submission currently share one transactional D1 batch, the failure rolls back the counter. An attacker can repeat duplicate requests without using accepted quota.

**Mitigation:** Commit a bounded short-lived attempt count separately before origin/media/content validation and deduplication; keep the accepted-submission counter and accepted data/event writes atomic. Duplicate and POSTs rejected for origin, media type, malformed/invalid payload, missing acknowledgement, sensitive patterns, or size consume an attempt but not accepted quota. Recommend 20 POSTs to the exact intake path per 15-minute window as an initial local test value, preserving the existing five accepted items. Exclude preflight `OPTIONS`, other methods, and unrelated routes; charge oversized intake POSTs once from route/headers before body reading. Every charged rejection needs a D1 mutation, creating up to 20 counter writes per bucket per window plus up to five accepted batches. Shared NATs can combine legitimate visitors and cause false limits; rotating-source traffic can generate new bucket writes/rows without a global bound. Measure both effects locally; a remote limit and associated write cost remain an owner decision. Use conditional no-op behavior at the cap, short expiry, and window-scoped HMACs. See Cloudflare D1 documentation for batch rollback semantics: [D1 `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

### 4.7 Volumetric or distributed automated traffic

**Threat:** Rotating IPs or large distributed traffic can overwhelm an application-level D1 limiter or increase request costs. No single short-lived HMAC bucket stops distributed abuse.

**Mitigation:** Keep cheap route/method/size checks, strict body limits, no expensive external work, and distinct attempt/accepted quotas. Do not promise DDoS prevention. Do not add a paid bot service. Any future public activation requires a separate platform abuse/cost review and must stay disabled until approved.

### 4.8 Requester identity leakage or over-retention

**Threat:** Raw address/header leaks in a log or database. Stable HMAC bucket values link requests longer than expected. A local test header is accidentally accepted in a public environment.

**Mitigation:** Never log or persist raw header values. Keep synthetic requester override strictly local/test only and fail closed outside local mode. Derive HMAC with a domain/version and 15-minute window start so values cannot join adjacent windows; expire rows within 24 hours and avoid analytics joins. Document the window-scoped value as pseudonymous, review key handling and Cloudflare platform-level request/log retention separately before any public launch, and test that public response, queue, and event payloads omit all identifiers. Per-window scoping still allows correlation inside a window, and rotating source addresses evade per-bucket caps.

### 4.9 Re-identification from unkeyed content hash

**Threat:** Current `content_hash` is SHA-256 of normalized type/language/message. Low-entropy messages can be dictionary-guessed; identical values can be linked across submissions during the 90-day lifetime.

**Mitigation:** It is not read by current runtime after deriving the HMAC deduplication token, but migration and tests reference it. Recommend removing the persisted field/index and retaining only the requester/window-scoped keyed deduplication value if tests prove it is needed. Digest removal is irreversible for existing rows; review a `0007` migration and regression tests, including a snapshot of non-disposable local D1 and preservation of indexes/FKs/audit history. Never expose either hash to the private UI or logs. For content redaction, make the keyed deduplication value nullable or replace it with a collision-safe tombstone strategy.

### 4.10 Stored XSS, markup, prompt injection, and unsafe rendering

**Threat:** Visitor submits HTML, SVG, Markdown, script URLs, control characters, or prompt-like text that executes or influences an automated system.

**Mitigation:** Keep existing fatal UTF-8/Unicode/control validation and normalized plain-text storage. Render only as text; no `innerHTML`, Markdown, URL auto-link, remote image/frame, or AI processing. Classifier treats message only as bounded data. Regression tests include HTML/script-like strings and prompt-injection wording.

### 4.11 CORS confusion or public route exposure

**Threat:** A hostile site calls intake or private moderation routes; CORS is misread as authentication. Preview/production accidentally receive local activation variables.

**Mitigation:** Preserve exact CORS allowlists; no wildcard/credentials; no cookies on intake; local moderation still requires its admin key. Keep both intake and moderation values absent from preview/production configurations. Disabled paths return the same generic `404` as unknown paths. No route or moderator code in public bundles. CORS is not auth.

### 4.12 Classification API race or audit tampering

**Threat:** Two moderator tabs overwrite a label, a stale classification action changes status, or a partial write leaves no audit trail.

**Mitigation:** Classification has its own `expectedClassificationUpdatedAt` value. Update current label and append immutable event in one D1 batch. Zero-row conditional update returns `409 stale_classification` and no audit row. Existing moderation status keeps its independent `expectedStatus`/`expectedUpdatedAt` contract. No update/delete API for historical events.

### 4.13 Public/private bundle leakage

**Threat:** Classifier internals, labels, submission copy, consent data, private moderation client, admin route strings, or auth header ship in normal/preview/production bundles.

**Mitigation:** Keep local moderation entrypoint isolated. Classifier should execute only in Worker, not a public bundle. Inspect all normal/preview/production outputs with regression checks; only the intended private local moderation build may contain the admin client. Do not place notice evidence or private copy in analytics.

### 4.14 Retention mismatch or purge failure

**Threat:** UI says data expires but no purge runs; new classification/audit tables persist after message deletion; moderation extends expiry; a purge deletes knowledge data.

**Mitigation:** Keep proposed 90-day submission and 24-hour rate-bucket limits. Use cascading foreign keys for child classification and audit data, no expiry changes on moderation, and a tested explicit redaction route for earlier removal of message content. Verify that redaction clears body and content-derived hashes, preserves only approved minimal audit, and leaves status/publication state unchanged. Test purge idempotence, failure/retry, deletion verification, and unchanged knowledge/publication counts against disposable local D1. Production intake stays disabled until retention, redaction, deletion operations, monitoring, and verification are reviewed and separately approved. A timestamp alone is not deletion.

### 4.15 Sensitive values copied into moderator notes

**Threat:** Mark copies a detected password, phone, or other sensitive excerpt into an immutable moderation note, multiplying retention and exposure.

**Mitigation:** Notes stay optional and bounded; UI tells the moderator not to repeat sensitive content. Audit reason codes are fixed and notes are plain text. The proposed separate redaction flow accepts no free-text note and does not edit immutable moderation actions; if existing notes may contain the sensitive value, the owner must decide how to preserve audit immutability while reducing that exposure.

### 4.16 Error and observability leakage

**Threat:** D1 exceptions, stack traces, request bodies, consent fields, keys, hashes, or internal file paths appear in public errors or application logs.

**Mitigation:** Preserve generic response serializers. Log only fixed route/method/error categories required for local debugging; never attach request bodies, raw headers, user text, classifier matched text, token/key, HMAC, digest, or reviewer note. Verify the error envelope and logs in local tests. D1 calls have no per-call abort option, so keep statements bounded and the payload small; do not invent unsupported timeout behavior.

## 5. Abuse cases required in local tests

- Direct caller omits, falsifies, or uses an unknown notice version; no row is created.
- Request supplies a client timestamp or unexpected consent/classifier field; strict parser rejects it.
- Malformed JSON, invalid fields, missing acknowledgement, duplicate, and high-confidence sensitive-pattern rejections consume one bounded attempt but create no submission/classifier/consent/event row and expose no matched value.
- `Content-Length` omitted, understated, malformed, or overstated; actual stream cap still holds.
- Duplicate flood within one bucket; attempt counter limits it while accepted counter remains unchanged.
- Concurrent attempts at the threshold; no over-limit accepted submission.
- Same content from different synthetic requesters; no cross-visitor identity or automatic duplicate rejection is introduced.
- Link flood, repeated-character text, harmless email/number, Taglish text, and Unicode confusables exercise false-positive and false-negative fixtures.
- Message contains a secret-like string; no value is logged, echoed, or placed in classification metadata.
- Explicit Mark redaction is authenticated, concurrency-protected and irreversible through the API; clears body/content hashes, appends a minimal fixed-reason privacy event, preserves approved status/audit chronology, and leaves knowledge/publication state unchanged.
- D1 unavailable/fails during limiter or accepted batch; generic fail-closed error and no partial accepted state.
- Stale human classification write; `409` with no partial audit event.
- Classification signal and human-label changes do not alter status or any knowledge/publication table.
- Expiry/purge removes consent, classifier, labels, classification/privacy/status events, and moderation actions for expired submissions; it is idempotent, failure-observable, and touches only expired intake rows. Retention/deletion verification is a prerequisite to any future remote activation.
- Local moderation auth/CORS fail-closed behavior remains; public bundles remain free of moderation code.

## 6. Residual risks and owner gates

- Heuristic classification cannot guarantee detection of sensitive or abusive content. Human review remains necessary.
- Explicit acknowledgement does not itself settle legal basis, jurisdiction, notice sufficiency, or a requester's understanding.
- IP-derived HMAC is still pseudonymous processing and Cloudflare may apply platform-level log retention outside the application database.
- D1 application limits do not prevent all distributed denial-of-service or billing effects.
- No production purge, admin identity, deployment, or remote database state is designed or enabled here.
- Window-scoped rate identifiers still process network metadata and do not stop distributed sources; durable attempt counting increases D1 writes for rejected requests.
- Conservative pre-persistence PII/secret patterns can miss formats or reject harmless technical examples; the authenticated redaction/tombstone operation is irreversible and must preserve truthful minimal audit without retaining the sensitive body.
- Dropping `content_hash` irreversibly discards existing digest values, and SQLite table rebuilds risk foreign-key/index/audit loss if not rehearsed on populated local fixtures.

Owner approval is required for final multilingual notice, retention/legal basis, exact signal and label allowlists, acceptance of 20 total bounded intake POST attempts per 15 minutes for local testing and its D1 write/false-positive tradeoff, remote rate limits, window-scoped requester derivation, content-hash removal, early-redaction/tombstone behavior, and any later remote deployment/retention controls. Before remote activation, retention, expiry, privacy deletion, and verification operations must be implemented and tested locally with failure monitoring reviewed. Until then, all 4D work remains design-only and any future implementation must start local-only.

## 8. Phase 4D design review findings

- The approved Phase 4A storage contract currently persists unkeyed `content_hash`, creates `idx_visitor_submissions_hash_created`, and separately persists unique `deduplication_hash`. The runtime uses the digest transiently to derive the keyed duplicate token; no read path was found for the persisted digest. Removing that column and index leaves the unique deduplication constraint as the duplicate-suppression mechanism.
- The current accepted counter is an upsert in the same D1 batch as the submission and two initial events. A unique deduplication violation rolls back the batch, which is why a separate proposed attempt counter is needed to charge duplicates. The 20-attempt value remains an unapproved local simulation input, not a production threshold.
- The current bucket HMAC input is stable across 15-minute windows, even though the primary key also includes the window. Stored values can therefore link activity between retained windows. Any next authorized implementation should scope the HMAC input itself to the window, test non-linkability across adjacent windows, and keep the result described as pseudonymous rather than anonymous.
- A 20-attempt cap bounds only one bucket: 20 malformed requests mean 20 durable attempt writes for that requester; five accepted plus 15 malformed requests mean 20 attempt writes plus 20 successful statements in the five existing four-statement batches; five accepted plus 15 duplicates add up to 30 attempted statements in the failed duplicate batches before rollback. These estimates exclude reads and platform logging and are not billing estimates. With rotating identities, writes and temporary rows scale with incoming sources; distributed traffic has no global bound.
- The draft content-hash removal is destructive to the historical digest values. A failed Wrangler migration should leave the original schema/index intact, but a successful migration has no lossless reverse migration. Before any non-disposable D1 migration, require explicit approval, a verified backup/restore point, a populated rehearsal, FK checks, a row-level preservation comparison, and a tested recovery plan. Do not edit the active migrations folder as part of this rehearsal.
- A timestamped 90-day expiry is not itself evidence of deletion. Retention and privacy-deletion operations, including failure/retry behavior and verification, remain a hard prerequisite to any remote activation.
