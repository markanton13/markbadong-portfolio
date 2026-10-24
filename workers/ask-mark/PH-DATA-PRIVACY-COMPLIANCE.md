# Ask Mark — Philippine Data Privacy Compliance Review

Review date: 2026-10-23
Scope: Read-only repository and design review for Ask Mark and proposed Phase 4D. This is a preliminary engineering PIA and compliance gap analysis, not a legal opinion or a finding that the project complies with Philippine law.

## 1. Executive finding

Public visitor intake is a **no-go** pending the privacy and technical release gates in Section 11. The reviewed source keeps the deterministic answer path, local-only intake/moderation, and publication paths separate. The owner has confirmed that Ask Mark is an independently developed and individually operated professional portfolio project at markbadong.com, not a company or separate business entity. The individual portfolio owner is the proposed PIC for visitor processing, subject to confirmation of applicable legal obligations. The owner has designated [privacy@markbadong.com](mailto:privacy@markbadong.com) as the official public privacy contact. The owner reports that Cloudflare Email Routing forwards it to a verified private Gmail inbox and that end-to-end delivery was tested; this routing and its operational monitoring were not independently verified. The owner’s formal legal identity/jurisdiction remains undocumented. Repository source cannot establish deployed Cloudflare settings, the actual D1 location/replication mode, account contract, logging configuration, DPO/registration status, or operational deletion.

The schema stores a 90-day expiry timestamp and the code contains a purge helper, but no scheduled purge invocation was found in the Worker route/configuration. An expiry timestamp does not delete a row. Phase 4D must not promise a maximum 90-day retention period until purge, backups, logs, moderation notes, and deletion verification are designed and tested end to end.

No lawful basis has been selected for each purpose. A privacy notice and acknowledgement checkbox are not themselves a lawful basis. Legitimate interest is not available for sensitive personal information and, for ordinary personal information, requires a documented purpose, necessity, and balancing assessment under NPC Circular 2023-07.

No remote environment, visitor record, private secret, or Cloudflare account was accessed. This document authorizes no intake, moderation, classification persistence, migration, or external data processing.

## 2. Roles and accountability

| Party | Preliminary role | Required confirmation |
|---|---|---|
| Individual portfolio owner who determines Ask Mark’s purposes and means (owner-confirmed operating model; proposed PIC) | Proposed personal information controller (PIC), subject to qualified review of applicable law and facts | Confirm the owner’s formal legal identity and jurisdiction and whether the DPA applies to each purpose. The official public privacy contact is privacy@markbadong.com; the owner reports tested Cloudflare Email Routing to a verified private Gmail inbox. Assign/confirm ongoing mailbox monitoring and response coverage. No company or separate business entity operates the project. |
| Cloudflare, Inc. and applicable group entities | Likely personal information processor (PIP) for Pages, Workers, D1 and enabled logging/observability performed for the PIC; may separately control account, billing, security and service telemetry | Confirm account agreement, applicable DPA version, actual services/features, subprocessors, data location, backups, logs, support access and deletion terms. |
| Cloudflare subprocessors | May process data to provide or support Cloudflare services | Review current service-specific subprocessor list and identify which services receive Ask Mark data. Generic public lists do not prove the actual data flow. |
| GitHub, npm, local Node/Wrangler tools | No intended live visitor-data processing role | Do not place visitor data/secrets in repositories, issues, builds, CI, tools or fixtures. Verify any actual integrations before release. |

The PIC remains accountable for personal data under its control or custody, including processing outsourced domestically or internationally. A vendor contract does not transfer PIC accountability.

The owner’s individual operation and professional portfolio purpose support proportionate, scale-appropriate privacy governance; they do not by themselves establish an exemption from RA 10173 or its IRR. The individual remains accountable for obligations that apply. The governance design should fit a one-person operation (a monitored privacy contact, concise processing/data-flow register, access controls, retention/deletion schedule, rights and incident procedures, processor register, and periodic review) while preserving each applicable statutory and regulatory safeguard. Qualified review must determine which formal organizational procedures, DPO duties, and registrations apply to this specific operator.

## 3. Data inventory and purpose register

“Implemented and verified” describes repository behavior and local tests only; it is not a legal compliance certification. Provider/account/browser behavior remains unverified.

| Data / source | Processing purpose | Status and privacy issue |
|---|---|---|
| Existing Ask Mark query text | Transient deterministic matching against approved knowledge to return an answer; no application D1 insert was found in the query handler | Answer path is deterministic/read-only. Incidental personal data in a query is still possible. Cloudflare/platform handling and lawful basis/notice are unknown; do not say “not collected” merely because the handler does not insert it. |
| Intake message, visitor-selected type and language (English, Filipino/Tagalog, Taglish) | Proposed private review of questions, corrections and feedback | Local-only handler/schema exists in the worktree; remote activation was not verified. Free text may contain personal or sensitive personal information despite warnings/detectors. |
| Requester network address, transient | Route/security processing and derivation of a requester bucket | Worker source reads CF-Connecting-IP or a local synthetic requester; raw address is not intended for D1. IP can be personal information in context. Edge processing/logging and its basis/retention are unknown. |
| Requester bucket HMAC, deduplication HMAC, proposed attempt HMAC | Abuse limiting and duplicate suppression | Pseudonymous, not anonymous. Current bucket HMAC does not include the window in its input, allowing cross-window linkage while stored. Proposed attempt HMAC is not implemented. Hashes/keys must not appear in logs or responses. |
| Persisted content_hash (unkeyed digest) | Digest of normalized submission content | Current local schema stores it; draft removal is not an active migration. Low-entropy messages can be guessed and identical messages linked. Removal is irreversible for existing digest values. |
| Opaque submission/event/moderation IDs, status, timestamps, expiry | Link submissions to private review, record lifecycle, concurrency and audit | IDs are identifying when linked to a message/person. Status/audit data must expire or have a documented lawful retention exception. |
| Moderator actor IDs, fixed reason codes, optional free-text note_text | Attribute private human moderation decisions | Local-only moderation workflow exists. Notes can copy visitor secrets or PI. Production identity/access controls are not ready. |
| Classification signals and proposed human label | Advisory triage and human review | Pure deterministic signals exist locally but are not persisted. Classification must never approve/reject/publish or change moderation status; stored labels/signals would themselves be linked personal data. |
| Privacy notice acknowledgement/version/time | Proposed evidence of notice presentation/acknowledgement | Draft only. Not identity proof and not necessarily consent. Need justify whether evidence is necessary, basis, contents and expiry. |
| Privacy-rights request email and sender/recipient metadata | Respond to access, correction, objection, erasure/blocking, portability, complaint, and other applicable rights requests | The owner-designated public address is privacy@markbadong.com. The owner reports Cloudflare Email Routing forwards to a verified private Gmail inbox and passed end-to-end delivery testing. A request may itself contain PI or SPI. Cloudflare/Gmail processing roles, account terms, location, access, retention, deletion, and monitoring arrangements require review. Email delivery does not establish that the sender is the person linked to an anonymous submission. |
| Request path, method, timestamp, origin, content type/length, IP, edge/security events | Routing, security, abuse prevention, provider delivery | Application reads a subset. Worker catch handler currently logs route/method and exception text. Cloudflare logging/Logpush configuration was not checked. Define collection, basis, access, destinations, regions and retention. |
| Build, local test and fixture data | Development/verification | Only synthetic fixtures should be used. No visitor data or secrets were accessed in this review. |

### Sensitive personal information

Free text can include sensitive personal information despite a warning or detector. DPA categories include, among others, age, marital status, ethnicity, religious/philosophical/political affiliations, health, education, sexual life, offenses, government identifiers, and information classified as sensitive by law. Passwords, keys and access tokens may not fit that legal category but remain highly sensitive security material.

The detector is limited and must not be represented as complete DLP. If sensitive information is persisted, the project needs a private response, access controls, redaction/deletion, backup treatment, audit policy, and breach assessment. A rejected request may still pass through browser, network, Worker runtime and provider security systems.

## 4. Philippine DPA compliance matrix

Status meanings: **Implemented and verified** means a specific technical behavior is supported by inspected source/local tests, not legal compliance. **Partially implemented**, **Missing**, **Requires legal/owner determination**, and **Not applicable** are used as written.

| Requirement | Status | Finding |
|---|---|---|
| RA 10173 §11: transparency, legitimate purpose, proportionality, data quality and retention | Partially implemented | Bounded fields/purpose are documented; controller identity, complete notice, lawful basis, recipients/transfers and verified deletion are missing. |
| RA 10173 §12: lawful basis for personal information | Requires legal/owner determination | No basis is selected separately for query, intake, abuse metadata, moderation, or platform logging. |
| RA 10173 §13: lawful basis for sensitive personal information | Missing / requires legal determination | Free text may include SPI despite blocking. No applicable §13 basis or disposition procedure is approved. Legitimate interest cannot be relied on for SPI/privileged information under Circular 2023-07. |
| RA 10173 §16: data subject rights | Partially implemented | Opaque IDs/history exist, but no published privacy contact, request process, proportionate matching/verification, or tested correction/deletion path exists. |
| RA 10173 §20 and Circular 2023-06: organizational, physical, technical safeguards | Partially implemented | Local gates, bounded validation, prepared D1 statements, private routes, no-store responses, optimistic concurrency and table separation exist. Security/privacy program, production identity/MFA, access/device policies, vendor assurance, monitoring, incident drills, backups and deletion controls are absent or unverified. |
| RA 10173 §14; IRR §§44–45 and 50: outsourcing and transfer accountability | Requires legal/owner determination | Cloudflare likely acts as processor for hosting/database. Account contract, instructions, processor terms, subprocessors, transfer safeguards and comparable protection are not confirmed. |
| Circular 2023-04: notice and valid consent if consent is the basis | Partially implemented | English, Filipino and Taglish drafts exist. PIC/DPO identity/contact, recipients/transfers, purpose/basis, actual retention, rights/request route and translation review remain. Privacy notice is distinct from consent. |
| Circular 2023-07: legitimate interest | Missing | Any ordinary-PI use needs documented purpose, necessity, balancing, safeguards, transparency and periodic review; not a basis for SPI/privileged data. |
| Circular 2023-06 §§4–6: inventory, PIA, Privacy Management Program, training/control framework | Partially implemented | This is a preliminary engineering PIA, not an owner-approved organizational PIA or PMP. PIC must validate, complete, own, update and retain it. |
| Circular 2023-06 §§9–11: retention and processor security | Missing / partially implemented | 90-day expiry timestamps exist; no automatic purge was found. Backup/log/note lifetimes and deletion evidence are unknown. |
| Circular 2023-06 §§12–16: authorized database and restricted online access | Partially implemented | Local routes/admin key exist. Production identity, need-to-know roles, MFA/secure access, account/device controls and access review are absent or unverified. |
| Circular 2023-06 privacy-by-design/default | Partially implemented | Source intends local-only gates and disabled remote settings; live remote settings are unverified. Unlawful/incompatible functions must remain deactivated. |
| Circular 2022-04 §§5–9: DPO/DPS registration, declaration and automated processing | Requires legal/owner determination | Headcount, SPI subject count, risk threshold, entity type, previous filing and profiling status are unknown. Registration is mandatory if any threshold applies; automated decision-making/profiling requires registration in all instances. If outside mandatory registration and not voluntarily registered, Section 6 requires a sworn declaration. DPO designation and DPO registration are distinct issues. |
| IRR Rule IX / Circular 16-03: breach management | Missing | No named incident lead/DPO, escalation/assessment workflow, response contact tree, evidence process, or drill was found. For a reportable breach, the 72-hour clock runs from knowledge/reasonable belief; it does not apply identically to every event. |
| Public response/publication firewall | Implemented and locally verified for inspected code path | Intake has no write path to knowledge/source/publication tables; no public submission-read route was found. Preserve tests and independently verify deployed settings/bundles before release. |
| AI/automated moderation | Not applicable to current design | No external AI or AI moderation decision is in the design. A future deterministic classifier still needs an assessment of profiling/automated-decision registration under Circular 2022-04. |
## 5. Privacy notice and acknowledgement review

The Phase 4D document includes English, Filipino and Taglish drafts that say Mark privately reviews messages, they are not automatically published, a personal response is not guaranteed, visitors should not include contact/sensitive information, and 90 days is proposed.

The drafts are **not ready to activate**. Before finalization:

1. Identify the PIC legal name and a monitored privacy/DPO contact.
2. State recipients/classes of recipients, Cloudflare as processor, support access and applicable subprocessors.
3. State each purpose and its approved lawful basis separately.
4. Explain actual data/scope: message, selected language/type, network metadata, moderation/audit history and pseudonymous identifiers.
5. State the actual enforced retention for each class; do not promise 90 days until purge, backups and logs are verified.
6. Explain rights, request route and NPC complaint rights.
7. Have fluent human reviewers check equivalent meaning/readability in English, Filipino and Taglish. Make notice and initially unchecked acknowledgement accessible by keyboard, screen readers, zoom and visible focus.
8. If consent is chosen, implement specific, informed, freely given consent, evidence and withdrawal/deletion. Otherwise label the checkbox only as acknowledgement of the notice, never as consent or the processing basis.

The 90-day period is a proposed project policy, not a statutory DPA period. It needs a necessity rationale and tested deletion across primary D1, backups, logs, moderation notes, exports and derived identifiers.

## 6. Preliminary Privacy Impact Assessment

This proportionate preliminary PIA follows NPC components: inventory/repositories/lifecycle; purposes and lawful bases; privacy principles; rights/freedoms; and confidentiality, integrity and availability risks. The PIC must validate actual operations, locations, vendors, volumes and visitor populations and update it when processing changes.

### Data flow

1. Visitor views the draft notice and enters a short question, correction or feedback message. Public intake is not authorized.
2. Browser sends the request to the portfolio Worker over HTTPS. Cloudflare processes network transport and Worker execution; the Worker can see request network metadata.
3. Local-only handler bounds and validates the body and conservatively rejects a small set of detected contact/secret patterns. This is not complete DLP.
4. Current local storage design stores normalized text, selected type/language, unkeyed content_hash, keyed deduplication/requester hashes, opaque IDs, status, events, timestamps and expiry.
5. A local-only Mark moderation route can read private rows and write moderation actions/events; optional notes are free text.
6. Approved knowledge/publication tables are separate; no automatic publication route was found.
7. A purge helper deletes expired submissions and accepted-rate rows, but no scheduled invocation was found; provider backups/log disposal are unknown.

### Risk register

| Risk | Initial likelihood/impact | Existing mitigation | Residual treatment |
|---|---|---|---|
| SPI, contact information or credential enters free text | Medium / High | Warning and high-confidence detector | Incomplete detection; no tested deletion/backups. Approve lawful handling, Mark-only redaction, access and incident process. |
| Notice, controller identity, purpose, recipient or basis inadequate | High / High | Multilingual drafts | Blocked on legal/owner and Cloudflare facts. |
| Expiry is mistaken for deletion | High / High | expires_at and purge helper | No scheduler/monitor/backup proof. Hard release blocker. |
| IP/HMAC treated as anonymous | Medium / High | No raw IP intended in D1; HMAC | Stable cross-window HMAC; Cloudflare may process IP/logs. Scope, expire, purge and disclose as pseudonymous. |
| Private submission/note exposure | Medium / High | Local-only gate, private routes, no public read | Production auth/MFA/access not ready; exception message logged. |
| Cross-border/provider controls incomplete | Medium / High | Public Cloudflare DPA/security docs | Actual account terms, settings, processors and transfers unknown. |
| Abuse/D1 amplification or shared-network false positives | Medium / Medium–High | Bounded body and existing local controls | Proposed 20 attempt limiter not implemented/tested here; rotating sources remain. |
| Unkeyed content hash guessed or linked | Medium / Medium | Draft hash removal | Existing local schema stores it; removal is irreversible and requires rehearsal/backup/recovery. |
| Visitor cannot exercise rights anonymously | Medium / Medium | Official privacy contact designated; opaque local submission ID | Rights-request handling, proportionate verification, request-record retention, and verified deletion across systems/providers are not yet operational. |
| Moderation audit preserves sensitive content | Medium / High | Private route, fixed reason codes | Free-text note can copy PI; immutable audit conflicts with erasure. Define note and tombstone policy. |
| Multilingual false classification | Medium / Medium | Deterministic advisory signals | No semantic decision allowed; use human review and language-reviewed fixtures. |
| Accidental publication | Low / Critical | Dedicated tables, no publication write path | Preserve firewall tests and verify exact deployed route/bundle/config. |

## 7. Anonymous data-subject rights handling proposal

The owner has designated [privacy@markbadong.com](mailto:privacy@markbadong.com) as the official public privacy contact. The owner reports that Cloudflare Email Routing forwards this address to a verified private Gmail inbox and passed an end-to-end delivery test; this setup has not been independently verified. Before collection, document who checks the inbox, coverage/backup arrangements, applicable response timelines, access protections, and retention for request correspondence. A message to this address may contain personal data, including the sender’s email, headers, request text, or inadvertently submitted SPI. Use that data only as necessary to handle the request, keep it out of application logs and the visitor-submission D1 tables, and include Cloudflare Email Routing and Gmail in the processor/data-flow review. Do not invite sensitive details or identity documents by default.

A visitor may provide an opaque submission ID plus minimal context (approximate date and a short non-sensitive description) to help locate a record. Do not require a name, identity document, email, or phone beyond the contact channel the visitor chose. The sending address alone does not prove that the sender is the person linked to an anonymous submission. If additional verification is necessary, explain why and request the least information that can reasonably verify the request; use a safer alternative where available. Do not disclose a record based on guessed message content alone.

Proposed operational steps:

1. Assign the owner or another specifically authorized operator to check the mailbox on a documented schedule, maintain restricted account access, and define a contingency for missed coverage. Do not claim a response SLA until the applicable legal deadline and realistic operational coverage are approved.
2. Create a separate restricted rights-request case with a random case ID and minimum metadata: received date, request category, opaque submission ID if supplied, verification steps, decision/legal exception, action date, and closure. Do not duplicate full email text or attachments into application logs, tickets, moderation notes, or the intake database. Approve a retention period for the correspondence/case record before use.
3. Acknowledge the request through a safe channel and explain what limited information is needed to locate and proportionately verify the relevant record. An email address alone is not proof of the visitor’s identity or link to a submission.
4. Search only authorized private records using the supplied opaque ID and minimal context. Do not disclose another person’s record or confirm sensitive contents to an unverified requester.
5. Assess the specific right, identity/record match, third-party information, statutory exceptions, legal claims/holds, lawful basis, and technical ability across the primary database, moderation/audit records, exports, application/platform logs, email systems and backups.
6. Have the PIC/operator or qualified reviewer authorize and carry out access, correction, objection, blocking/erasure, portability, or other applicable action using a reviewed procedure. Verify the action, including dependent records and processors; state accurately any backup expiry or lawful retention that prevents immediate erasure. Do not promise deletion where it cannot be verified.
7. Respond without exposing another person’s data, explain the outcome and any applicable limitation, and preserve only the minimum case evidence for a documented lawful purpose. Escalate identity disputes, legal uncertainty, breach concerns, missed response deadlines, or processor deletion limitations to the PIC and qualified privacy/legal adviser.

Handle the applicable rights to be informed, access, correction, objection, blocking/erasure, damages, portability where statutory conditions apply, and complaint to the NPC. Include privacy@markbadong.com in the approved notices. The contact address is selected; mailbox monitoring, response ownership/timelines, verification standard, exceptions, request-record retention, and evidence policy still require operational and legal approval. Email Routing/Gmail terms and their handling of request data must be reviewed with the other Cloudflare processor and transfer arrangements.

## 8. Cloudflare processing, geography and contracts

Cloudflare is an expected infrastructure processor for Pages/Workers/D1 and, per the owner, Cloudflare Email Routing forwards the designated privacy-contact email to Gmail. The processing roles and applicable terms for the email-routing/Gmail flow must be reviewed against actual account/service terms. Cloudflare’s published DPA applies where Cloudflare processes personal data as processor/subprocessor under a qualifying customer agreement. Its subprocessor list is service-specific and should be checked against actual enabled services. Public documents and the owner-reported delivery test do not establish account contract terms, data locations, retention, or deletion behavior.

Cloudflare D1 documentation says the primary database is ordinarily created near where it is created; a location hint is not a guarantee. When read replication is enabled, replicas may be distributed in supported regions. No account-side D1 location or replication mode was inspected. Do not claim Philippine data residency. Assess actual terms, support/administrative access, subprocessors, transfer safeguards and whether further contractual safeguards (including NPC Advisory 2024-01 model clauses) are appropriate under IRR accountability.

Worker source emits console.error with route, method and exception message. It does not directly pass message text/raw IP to this call, but arbitrary exception text is not a safe log allowlist. Before public intake, replace this with fixed error categories and verify every logging path excludes request bodies, headers, message text, notes, keys, hashes, SQL values and stack traces. Whether Workers Logs/Logpush is enabled and its access/retention settings is unknown; the owner must verify this in Cloudflare without exposing logs to development review.

Maintain a processor register: service/legal entity, role/instructions, data/purpose, agreement/DPA version/effective date, subprocessors, location/replication, support access, logs/backups retention, breach notice, deletion/return terms, assurance evidence and contract owner. No account credentials or settings were accessed or changed for this review.

## 9. NPC registration and DPO assessment

NPC Circular 2022-04 makes DPS registration mandatory if a PIC/PIP employs at least 250 people, processes SPI of at least 1,000 individuals, or processes data likely to pose risk to rights/freedoms. A DPS involving automated decision-making or profiling is registrable in all instances. A PIC/PIP outside mandatory registration that does not voluntarily register must submit the sworn declaration under Section 6; the current NPC process uses its registration system. Confirm current forms/deadlines before launch.

The project is individually operated and has no separate company/business entity, but the owner’s formal legal identity/jurisdiction, relevant headcount facts, SPI subject count, likely-risk assessment, prior filing, and DPO status still need confirmation. A deterministic advisory classifier is intended not to decide moderation outcomes, but whether it constitutes profiling or creates a likely-risk threshold requires legal/owner assessment. Qualified counsel must determine whether the owner meets Circular 2022-04’s definition and treatment of an “Individual Professional,” whether any de facto DPO provision applies, and whether formal DPO designation/registration is required. DPO designation and DPS registration/exemption are separate applicability questions. Individual ownership and professional-portfolio operation are not assumed to create an exemption.
## 10. Breach and security-incident procedure

Before activation, name an incident lead and DPO/accountable contact and adopt a procedure that:

- receives reports from Worker, D1, Cloudflare, repository/CI, moderator and visitors;
- preserves timestamps/evidence without copying message text into unprotected tickets;
- contains unauthorized access/disclosure and contacts Cloudflare under the contract;
- determines data categories, subjects/volume, acquisition/access, likelihood of serious harm, and whether SPI or identity-fraud information is involved;
- applies the DPA/IRR and NPC Circular 16-03 notification test and documents the decision;
- where notification is required, notifies NPC and affected data subjects within 72 hours of knowledge/reasonable belief, based on available information and current prescribed channel; documents permitted delay/postponement and follow-up;
- tracks support, remediation, recovery, lessons and closure;
- is exercised in a tabletop before activation and periodically.

The 72-hour rule is not a generic deadline for every availability/security event, and it does not excuse prompt containment or assessment. Confirm current reporting channel and requirements at incident time.

## 11. Explicit production compliance release checklist

Every item is a hard gate. Passing technical tests alone does not establish legal compliance.

- [ ] Record the individual portfolio owner as proposed PIC; confirm formal legal identity/jurisdiction and DPA applicability with qualified counsel; publish privacy@markbadong.com in approved notices and document mailbox monitoring, response coverage and account safeguards; determine applicable DPO/accountable-person obligations.
- [ ] Obtain qualified legal review of lawful bases for query, intake, abuse/security metadata, moderation/audit, sensitive-data contingencies and processor telemetry. If legitimate interest is used, document purpose, necessity, balancing, safeguards and transparency; never use it for SPI/privileged information.
- [ ] Decide treatment for minors/vulnerable visitors, SPI, credentials and missed detections. Approve a safe response and deletion/redaction path.
- [ ] Complete and approve the organizational PIA/inventory; adopt Privacy Management Program, security/access/retention policies, incident procedures and personnel training.
- [ ] Confirm Circular 2022-04 facts and file required DPS/DPO registration, updates or sworn declaration. Resolve whether any processing qualifies as profiling/automated decision-making.
- [ ] Verify actual Cloudflare agreement/DPA, roles, subprocessors, transfer safeguards, D1 location/replication, support access, logs/Logpush, backups, deletion and breach terms.
- [ ] Human-review equivalent accessible English, Filipino and Taglish notice. Include PIC/contact, purposes/bases, data categories, recipients/processors/transfers, actual retention, rights/request channel and no-response guarantee.
- [ ] Choose consent only if legally appropriate and implement valid consent/withdrawal. Otherwise document another lawful basis and keep acknowledgement separate.
- [ ] Prove expiry/deletion for primary D1, content/dedup hashes, requester/attempt identifiers, moderation events/actions/notes, exports, logs and backups. Verify schedule, alerting, retry, restoration and deletion evidence. Do not promise 90 days until this passes.
- [ ] Approve minimal audit vs redaction/deletion, especially free-text moderator notes and immutable history.
- [ ] Verify preview/production intake/moderation disabled until separately authorized. Independently inspect deployed bindings, route responses, DB identities, bundle outputs and secret handling without exposing secret values.
- [ ] Pass disposable local D1, concurrency/rate-limit, access-control, rights-operation, multilingual/accessibility, deletion/failure-injection and publication-firewall tests.
- [ ] Complete remote abuse/cost review and obtain separate owner approval; no paid CAPTCHA/AI is implied.
- [ ] Record legal/owner approvals, deployment/migration and recovery plans, operator, monitoring and privacy review date. Production intake remains disabled until both privacy and technical gates are signed off.

## 12. Decisions still required

1. What formal legal identity and jurisdiction should identify the individual portfolio owner, and does qualified counsel confirm the owner is the PIC for each relevant purpose under RA 10173?
2. The public privacy contact address is set to privacy@markbadong.com. Who is accountable for monitoring it, what coverage and response timelines apply, and how will request email/case records be secured, minimized and expired?
3. Which lawful basis applies separately to query, intake, abuse metadata, moderation/audit and provider telemetry under §§12 and 13?
4. What happens when SPI is submitted despite warnings/detectors, and is any DPA §13 criterion applicable?
5. Does the individual operator meet the Circular 2022-04 definition/treatment of an Individual Professional, and what DPO designation/registration obligations apply? Do actual facts trigger DPS/DPO registration or allow a DPS exemption declaration? Is any processing profiling/automated decision-making?
6. Which Cloudflare entity/contract/DPA, subprocessors, D1 location/replication, support access, log destinations and backup lifecycle apply?
7. Is 90 days necessary and enforceable for every class? What backup/log window can honestly be disclosed?
8. Is acknowledgement evidence necessary, and what minimum evidence, lawful basis and expiry justify storing it?
9. What audit survives redaction, and how will notes/immutable history avoid retaining visitor secrets?
10. Does the proposed privacy@markbadong.com request workflow provide proportionate verification and timely handling of anonymous visitors’ rights without unnecessary identity collection, and what response timelines/exceptions should it follow?
11. Who runs purge/redaction/access reviews/incident response, and how is deletion verified?

## 13. Evidence scope and repository gaps

Read-only sources reviewed: Phase 4A/4B/4C and Phase 4D design/threat documents; intake, moderation and Worker route/error source; relevant local D1 migrations; local-only configuration structure. No environment secret contents, visitor records, existing local/preview/production D1, Cloudflare account or production logs were accessed.

Findings:

- Deterministic answer handling queries approved knowledge; intake/moderation use separate paths and no public submission-read route was found.
- Local intake code gates on local-only mode/key; preview/production source configurations are intended to omit those activation values. This does not prove deployed remote state.
- Local intake schema stores normalized message, content_hash, deduplication hash, requester bucket HMAC, status, IDs and timestamps. The bucket HMAC input excludes the window. The classifier is pure and not persisted.
- A 90-day expires_at and purge helper exist, but no scheduled invocation was found. The helper deletes submissions and accepted-rate rows; it does not cover any future attempt table. Rate-bucket rows currently receive the window end as expiry. The Phase 4D documents’ 24-hour rate-bucket claim does not match current code.
- Moderation notes are optional free text and deletion cascades to events/actions. There is no approved early-redaction workflow.
- Worker exception handling logs route/method and the thrown exception message. Request bodies are not directly passed by this call, but arbitrary error text is not suitably constrained for a public intake release.
- No consent UI or acknowledgement persistence is authorized. No deployed setting or remote data was examined.

These are repository/operational gaps, not proof that a live service currently collects visitor submissions.

## 14. Official sources reviewed

Official NPC/Cloudflare links checked on 2026-10-23; re-check current text/contracts before release. Circulars and statutes are legal instruments; NPC FAQs and explanatory pages are guidance and do not replace the underlying law or qualified legal advice.

### Philippine law and NPC

- [Republic Act No. 10173 — Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/) — especially §§11–13, 14, 16, 20–21 and accountability provisions.
- [Implementing Rules and Regulations of RA 10173](https://privacy.gov.ph/wp-content/uploads/2023/06/IRR_RA-10173-as-amended.pdf) — transparency, retention, rights, security, breach, outsourcing, registration and accountability.
- [NPC Circular 2023-04 — Guidelines on Consent](https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf).
- [NPC Circular 2023-06 — Security of Personal Data](https://privacy.gov.ph/wp-content/uploads/2024/03/NPC-Circular-Repeal-16-01-Signed.pdf); see the [NPC announcement](https://privacy.gov.ph/npc-issues-circulars-to-strengthen-personal-data-protection-in-ph/).
- [NPC Circular 2023-07 — Guidelines on Legitimate Interest](https://privacy.gov.ph/wp-content/uploads/2024/01/NPC-Circular-No.-2023-07_Guidelines-on-Legitimate-Interest_13-December-2023.pdf).
- [NPC Circular 2022-04 — Registration, DPO and DPS](https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04-2.pdf); [current registration FAQ](https://privacy.gov.ph/pips-and-pics/faqs/) and [exemption process](https://privacy.gov.ph/pips-and-pics/exemption/).
- [NPC Advisory 2017-03 — Privacy Impact Assessment Guidelines](https://privacy.gov.ph/wp-content/uploads/2022/01/NPC_AdvisoryNo.2017-03.pdf).
- [NPC Circular 16-03 — Personal Data Breach Management](https://privacy.gov.ph/wp-content/uploads/2022/01/sgd-npc-circular-16-03-personal-data-breach-management.pdf) and [current breach reporting guidance](https://privacy.gov.ph/pips-and-pics/breach-reporting/).
- [NPC Data Subject Rights](https://privacy.gov.ph/data-subject-rights/) and [right to erasure or blocking](https://privacy.gov.ph/right-to-erasure-or-blocking/).
- [NPC Advisory 2024-01 — Model Contractual Clauses for Cross-Border Transfers](https://privacy.gov.ph/pips-and-pics/advisories-circulars/).

### Cloudflare

- [Cloudflare Customer Data Processing Addendum](https://www.cloudflare.com/cloudflare-customer-dpa/) — match version/effectivity to actual account agreement.
- [Cloudflare Services subprocessor list](https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/).
- [Cloudflare D1 Data Location](https://developers.cloudflare.com/d1/configuration/data-location/).
- [Cloudflare Workers Logs documentation](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) — product-level limits; account logging configuration remains unknown.
