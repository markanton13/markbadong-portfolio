# Ask Mark — Phase 5 Local Conversational Prototype

Status: local-only prototype; not a new model integration or release approval.

## Behavior

Ask Mark continues to use the existing approved deterministic query API and frozen static fallback. The browser keeps its current messages and last approved topic in React component state. A small set of supported follow-ups already defined by the static knowledge layer can now be answered directly from that approved static data. Such a turn does not make another API request. Unsupported follow-ups continue through the existing query path and its polite no-match/static fallback. Nothing generates new portfolio claims.

The prototype does not send conversation history as context to the Worker, write it to browser storage, analytics, cookies, or D1, add a route, change intake/moderation, or contact an external AI service. Closing the component/page discards the in-memory state; the UI's existing “Clear conversation” action also clears it.

## Data flow

1. A visitor question and rendered conversation messages live in the mounted React component state.
2. For a follow-up recognized by the existing contextual static rules, the client uses the existing approved portfolio fallback data and source links locally.
3. For other questions, the client keeps the existing API configuration rules and sends only the current question to the deterministic read-only `/v1/query` endpoint. It does not send prior turns.
4. If the API is disabled, unavailable, or unmatched, the existing static answer is returned. The API's existing source/knowledge allowlist and publication behavior are unchanged.

The existing provider may process request metadata for delivery and security. Its request logging and retention settings remain outside repository verification. Do not describe this prototype as preventing Cloudflare or browser/network infrastructure from processing a request.

## Grounding and limits

This is deterministic contextual handling, not a generative LLM. Contextual turns reuse prewritten, approved static answers and known links. An unsupported follow-up does not gain new factual content from conversation state; it uses the existing API and fallback behavior. The static knowledge snapshot can lag the active D1 release, so current facts should still be checked against the published résumé/project pages. No response or personal follow-up from Mark is guaranteed.

## Local verification

With the repository's existing Node 22 runtime and installed dependencies, run:

```powershell
node --test src/components/assistant/askMarkConversation.test.js
node scripts/check-ask-mark.mjs
node scripts/check-ask-mark-client.mjs
npm run lint
```

These checks are local and do not need a D1 migration or remote service. Do not run preview/production build or deployment scripts as a substitute for inspecting environment selection.

## Before considering a model

Keep all model choices deferred. A separate owner-approved design should compare zero-additional-cost options available within existing hosting/account limits, confirm whether any actually have no marginal charge, and assess provider retention/training, processor terms, transfers, prompt exposure, security, accuracy, and a tested disable/fallback path. No conversation should be sent to a model until those reviews are complete. Existing intake and moderation remain disabled and unchanged.
