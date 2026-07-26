# Ask Mark Worker — D1 Foundation

This directory contains the isolated Cloudflare Worker and D1 foundation for Ask Mark.

## Completed checkpoints

Batch 2A established and locally validated the versioned schema, publication model,
review trail, and audit foundation.

Batch 2B added the reviewed canonical seed, deterministic hashes, provenance,
matcher terms, a local-only importer, an explicit local reset command, and seed
validation.

Batch 2C adds the first local read-only Worker API:

- `GET /v1/health`
- `GET /v1/bootstrap`
- `POST /v1/query`

The API reads only from the active approved D1 release. It does not write visitor
messages to D1, call Workers AI, search the public web, or change the portfolio
frontend.

Batch 2D connects the visible React concierge through an explicit local
development mode. Approved API matches are preferred; disabled, offline,
timed-out, invalid, or unmatched requests automatically use the frozen
browser matcher.

## Locked rules

- Ask Mark answers only from approved sources.
- Visitor statements never become active knowledge automatically.
- Approved content is versioned; prior versions are never overwritten.
- Publication activates an immutable release snapshot.
- The existing browser matcher remains the deterministic fallback.
- Ask Mark uses a D1 database separate from portfolio analytics.
- No paid service, Resend dependency, vector database, or public-web search is introduced.
- The seed excludes Mark's phone number and private information.
- The importer refuses to overwrite an already populated database.
- Public API responses expose approved answer content and safe action metadata only.
- Query messages are processed in memory and are not persisted by Batch 2D.

## Local commands

```powershell
npm run check:ask-mark-client
npm run check:ask-mark-schema
npm run check:ask-mark-seed
npm run check:ask-mark-api
npm run askmark:d1:reset:local
npm run askmark:d1:list:local
npm run askmark:api:dev
npm run dev:ask-mark
```

`askmark:d1:reset:local` deletes only the ignored local state under
`workers/ask-mark/.wrangler/state`, reapplies migrations, and imports the approved seed.

`askmark:api:dev` serves the Worker only on `127.0.0.1:8787` using the persistent
local D1 state.

dev:ask-mark serves the portfolio on 127.0.0.1:5173 and enables the
development-only D1 bridge. Normal npm run dev remains static-only.

## Next checkpoint

Batch 2G will prepare the production API release gate and custom-domain routing without switching live portfolio traffic until final approval.

## Remote preview

The isolated Cloudflare preview environment, validation commands, and recovery process are documented in [REMOTE-PREVIEW.md](./REMOTE-PREVIEW.md).

## Remote preview frontend

The explicit frontend mode, build isolation rules, and fallback validation are documented in [FRONTEND-REMOTE-PREVIEW.md](./FRONTEND-REMOTE-PREVIEW.md).

## Production release

Batch 2G deployed and validated the isolated read-only production API.
The live portfolio frontend remains disconnected, and no custom route or domain was created.
See [PRODUCTION.md](./PRODUCTION.md).

Batch 2H remains frozen pending a separate reviewed production frontend cutover.
