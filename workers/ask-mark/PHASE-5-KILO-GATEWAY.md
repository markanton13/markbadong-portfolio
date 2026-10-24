# Ask Mark — Kilo Gateway Local Prototype

Status: local-only prototype. AI mode is disabled unless both the Vite client and a loopback Worker are explicitly configured. The multi-model router was validated with mocked responses only; no live generation request was made. This document is not approval to activate visitor traffic.

## Verified Kilo API facts

Checked against Kilo's official documentation and catalog on 2026-10-23:

- Chat completions: `POST https://ai-gateway.kilo.ai/api/v1/chat/completions`. Kilo's current overview and API reference give `https://ai-gateway.kilo.ai/api/v1` as the base URL.
- Authentication: `Authorization: Bearer <KILO_API_KEY>`. The Gateway also allows anonymous free-model access, but this prototype uses the owner-provided key only as a Worker-side secret.
- Curated fixed allowlist: `nvidia/nemotron-3.5-super-vl:free` first, then `dots-studio/dots-3-note-preview:free`. A read-only GET of Kilo's live public catalog on 2026-10-23 returned both exact IDs with explicit numeric zero input and output prices, text input/output modalities, and `max_tokens` support. `inclusionai/ling-2.6-flash:free` was absent from that live catalog. Before generation, the Worker independently rechecks the allowlisted entries for exact IDs, explicit zero prompt/completion prices, text input/output, and `max_tokens`. Missing, malformed, unavailable, paid, or unsupported catalog entries fail closed; if neither remains eligible, no provider generation request is made.
- Model selection is server-side only. The Worker tries the fixed primary then the fixed backup, at most once each. It may switch after transient provider failure, unavailable model, malformed/empty response, or truncated generation. It does not switch after a 400/401/403/429 response, request cancellation, model mismatch, provider content filter, oversized output, or the local grounding/security rejection. No model supplied by a client is accepted.
- Kilo documents 200 anonymous free requests per hour per IP. It does not specify a dependable authenticated free-model quota on the cited documentation; a `429` is handled as a failure. Do not treat the anonymous rate limit as an authenticated quota or service guarantee.
- `kilo-auto/free` is excluded. Its target is selected dynamically and Kilo warns it may route to providers that log prompts or use them to improve services, including NVIDIA free endpoints.

References: [Kilo live model catalog](https://ai-gateway.kilo.ai/api/v1/models), [Gateway overview](https://kilo.ai/docs/gateway), [API reference](https://kilo.ai/docs/gateway/api-reference), [authentication](https://kilo.ai/docs/gateway/authentication), [models and providers](https://kilo.ai/docs/gateway/models-and-providers), [usage and billing](https://kilo.ai/docs/gateway/usage-and-billing), and [provider policies](https://kilo.ai/providers).

## Approved model pool and data handling

The primary is `nvidia/nemotron-3.5-super-vl:free`. Kilo lists it as a text/image/video-input to text-output model and ranks it first in its Ask role leaderboard. Kilo's provider directory reports that NVIDIA trains on and retains prompts. NVIDIA's trial endpoint terms also restrict sensitive data. This makes it suitable only for synthetic/local testing until the exact serving route and applicable terms are confirmed.

The backup is `dots-studio/dots-3-note-preview:free`. The model card describes broad instruction following and text output; Kilo's page ranks it for Ask responses, though lower than the primary. Dots Studio does not appear as a named entry in Kilo's current provider-policy directory, so the exact serving provider, retention, training, and transfer terms are unknown. Kilo's own free-tier/provider warning and privacy policy mean no private, confidential, or real visitor content should be sent while those terms remain unverified.

Kilo's published provider table currently flags NVIDIA as training on and retaining prompts, and Recursive as not training but retaining prompts. The selected Dots route has no provider-policy entry there. Free pricing is not a privacy guarantee, and Kilo's privacy policy says data shared with downstream providers is governed by those providers' terms. The Worker sends only the current question plus one approved evidence item; it never sends conversation history, but that current question can still contain personal information. The sensitive-input filter is heuristic and cannot identify all private content. Keep the AI gate local-only and disabled by default, use synthetic data for tests, and do not activate visitor traffic until downstream routing and processing terms are confirmed.

## Nemotron reasoning-control compatibility

NVIDIA's Nemotron 3.5 Lightning Chat Completions guide documents `chat_template_kwargs: { enable_thinking: false }` to disable reasoning and reserve the `max_tokens` budget for visible answer text. NVIDIA's OpenAI SDK example sends it as an extra body field. The same NVIDIA guide does not document `reasoning.enabled: false` or `reasoning_effort: "none"` for this model.

Kilo's Gateway API reference documents OpenAI-compatible Chat Completions fields but does not list `chat_template_kwargs` or promise forwarding arbitrary provider-specific body fields. It also does not document `reasoning.enabled: false` or `reasoning_effort: "none"`. The two-model router therefore sends none of these unverified controls. The primary remains capped at 240 output tokens; the Dots backup is capped at 768. The final answer remains capped at 1,200 characters and must pass the existing grounding check. For local diagnostics only, the adapter allows 4 seconds for the catalog, 10 seconds for the primary, and 16 seconds for the Dots backup. Its 33-second total includes those 30 seconds, a 2-second processing reserve, and 1 second of scheduling allowance. The smoke client allows 37 seconds and the runner caps its process at 46 seconds. These extended limits apply only to the local-only loopback adapter path; they are not production latency settings. A backup attempt still starts only when at least 2.5 seconds remain.

Kilo's documented Chat Completions `usage` schema guarantees aggregate `completion_tokens` but does not document `completion_tokens_details`. In the OpenAI-compatible usage shape, `completion_tokens_details.reasoning_tokens` is a breakdown within the aggregate completion count. Thus a mocked or upstream response reporting 323 reasoning tokens and 240 completion tokens is inconsistent with that mapping; it does not establish that the model actually used 323 reasoning tokens. The adapter reports the bounded aggregate and omits a reasoning count that exceeds it, setting only `usageMetadataInconsistent: true`. Consistent nested counts remain available when supplied. No reasoning text or response content is logged.

References: [NVIDIA Nemotron 3.5 Lightning guide](https://docs.nvidia.com/nim/large-language-models/2.0.10/get-started/advanced/get-started-nemotron-3.5-lightning.html), [Kilo Gateway API reference](https://kilo.ai/docs/gateway/api-reference), [Kilo NVIDIA Nemotron 3.5 Super VL model page](https://kilo.ai/models/nvidia-nemotron-3-5-super-vl-free), [Kilo Dots3-Note Preview model page](https://kilo.ai/models/dots-studio-dots-3-note-preview-free), and [Dots3-Note model card](https://huggingface.co/dots-studio/dots3-note-prev).

## Provider privacy limitation

Kilo describes a Gateway and model catalog, but that catalog does not establish the stable serving provider or the exact downstream terms for every free route. Kilo's provider directory says NVIDIA trains on and retains prompts; the Dots Studio provider is not listed there, so its route-specific retention/training terms remain unknown. Kilo's privacy policy says data shared with downstream providers follows those providers' terms. Do not send real visitor or confidential content until the routing path, terms, transfers, retention, and lawful processing basis are confirmed.

## Local architecture and controls

1. The existing `/v1/query` flow first performs the unchanged deterministic retrieval from the active approved D1 release.
2. The browser requests generation only when `VITE_ASK_MARK_AI_MODE=local-only`, the Vite server is in development mode, and the configured Worker URL is loopback HTTP. It sends the current question and, for a follow-up only, an approved D1 `item_key` held in component memory. It never sends rendered conversation history.
3. The Worker separately requires `ASK_MARK_AI_MODE=local-only`, a loopback request URL, `generative: true`, and `KILO_API_KEY`. The key and Gateway adapter exist only in Worker code; no `VITE_` key variable exists.
4. The Worker supplies only the current matched approved item, or one current active D1 item selected by the in-memory context key when a follow-up has no direct term match. It does not supply private intake/moderation records, visitor history, or the full knowledge bundle. Retrieved portfolio content and the visitor question are sent as untrusted data, not instructions.
5. Prompts containing high-confidence email, telephone, or credential-like patterns are not forwarded. Request/evidence bytes, response bytes, output length, output tokens, catalog reads, and elapsed time are bounded. The local diagnostic profile caps one catalog GET at 4 seconds, the primary attempt at 10 seconds, and the backup at 16 seconds. The 33-second total consists of 4 seconds for catalog verification, 10 seconds for the primary, 16 seconds for the backup, a 2-second processing reserve, and 1 second of scheduling allowance. The smoke client allows 37 seconds and its process cap is 46 seconds. These extended values are restricted to local-only loopback operation and are not production latency settings. A second attempt starts only with at least 2.5 seconds left, and the request remains capped at two provider attempts. The primary has a 240-token output cap; the backup has a 768-token cap. Both responses remain subject to the same 1,200-character and grounding checks. Credentials, global rate limits, provider content filtering, model mismatch, and local grounding rejection do not trigger a switch. Catalog failures use local-only codes to distinguish timeout, HTTP failure, network failure, invalid JSON/body, schema mismatch, and absence of eligible explicitly free models; no catalog failure triggers a generation request.
6. Local diagnostics expose only allowlisted codes, exact approved model IDs, attempt numbers, bounded elapsed time/status/token counts, content type, choices count, and finish reason. No prompts, evidence, generated answer, provider body, API key, or authorization header is logged. A narrow lexical guard rejects output introducing words absent from the approved evidence (except a small connector-word list), links, or excess output. A rejected or unavailable AI answer returns the original deterministic result and source actions.
7. No D1 schema, intake, moderation, publication, static fallback content, or deployment configuration is changed.

## Local configuration (owner-operated; not performed here)

The local-only secret file is now Git-ignored at `workers/ask-mark/.dev.vars`; `git check-ignore` must continue to confirm this before placing a real key there. Do not place a key in Vite variables, tracked files, command history, screenshots, logs, or chat. No secret file was created by this task.

After reviewing the privacy and cost constraints, an owner may privately create `workers/ask-mark/.dev.vars` containing:

```dotenv
ASK_MARK_AI_MODE=local-only
KILO_API_KEY=<set-the-key-privately>
```

The local Vite environment file for the existing `askmark` mode is ignored by the repository's `*.local` rule. If the owner separately chooses to enable the local experiment, its non-secret values are:

```dotenv
VITE_ASK_MARK_AI_MODE=local-only
VITE_ASK_MARK_API_BASE_URL=http://127.0.0.1:8787
```

Both local modes default off. Never copy these AI flags or any key into preview/production variables. Normal production Vite builds cannot enable the adapter because they are not `DEV` and the Worker rejects non-loopback request URLs.

## Automated local validation and owner-triggered synthetic smoke test

Run the local-only setup and deterministic checks from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\ask-mark-kilo-local.ps1
```

The runner uses a unique temporary D1 persistence directory and seed-import
scratch directory, applies migrations and approved synthetic knowledge there,
starts Wrangler on `127.0.0.1:8787`, checks health and deterministic MarkHQ
retrieval, then stops the Worker and removes only its own temporary files. It
does not call Kilo in PRECHECK mode.

Only after separate owner authorization for one synthetic Kilo request, set the
approval variable in the current PowerShell session and run:

```powershell
$env:ASK_MARK_KILO_SMOKE_APPROVED = 'YES'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\ask-mark-kilo-local.ps1 -Mode SMOKE -OwnerAuthorizedSyntheticSmoke
Remove-Item Env:\ASK_MARK_KILO_SMOKE_APPROVED
```

SMOKE repeats PRECHECK, checks the live Kilo catalog for the two exact
allowlisted IDs, explicit zero input/output prices, and text-completion
capabilities, then invokes the existing synthetic smoke test exactly once. The
Worker independently repeats its price/capability check before generation.
The fixed synthetic MarkHQ question reaches only the loopback Worker. The
Worker can attempt the primary and then the backup once each, subject to the
switching rules above. The runner reports each allowlisted model attempt and
whether the final outcome was no generation request, provider failure,
provider response rejected, or model answer accepted. The smoke-script
invocation count is not treated as the provider-call count. No further live
generation request is authorized by this implementation task.

## Before any public AI activation

- Reverify each model ID, both prices, and text-completion capability using Kilo's live official catalog; zero cost today is not a future price guarantee.
- Obtain and document the exact Gateway routing provider(s), data-processing terms, prompt/output retention, training use, region/transfers, subprocessors, incident contact, and deletion behavior for this model ID.
- Obtain qualified review of lawful basis, transparency/notice, data subject rights, PIA, and cross-border processing. Do not equate acknowledgement with a lawful basis.
- Confirm the production D1 evidence and publication firewall, rate/abuse controls, user-visible AI disclosure, accessibility, and deterministic fallback behavior.
- Review model outputs against approved knowledge and multilingual synthetic tests; confirm a kill switch, key rotation, budget guard, abuse limits, observability without prompt logging, and an owner-approved rollout plan.
- Do not enable public collection or send real visitor questions until the independent technical and privacy release gates are satisfied.
