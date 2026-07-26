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
- Query messages are processed in memory and are not persisted by Batch 2C.

## Local commands

```powershell
npm run check:ask-mark-schema
npm run check:ask-mark-seed
npm run check:ask-mark-api
npm run askmark:d1:reset:local
npm run askmark:d1:list:local
npm run askmark:api:dev
```

`askmark:d1:reset:local` deletes only the ignored local state under
`workers/ask-mark/.wrangler/state`, reapplies migrations, and imports the approved seed.

`askmark:api:dev` serves the Worker only on `127.0.0.1:8787` using the persistent
local D1 state.

## Next checkpoint

Batch 2D will connect a development-only frontend API client while preserving the
frozen browser matcher as the automatic network-failure fallback.
