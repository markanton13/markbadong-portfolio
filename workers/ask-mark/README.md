# Ask Mark Worker — D1 Foundation

This directory contains the isolated Cloudflare Worker and D1 foundation for Ask Mark.

## Completed checkpoints

Batch 2A established and locally validated the versioned schema, publication model,
review trail, and audit foundation.

Batch 2B adds a reviewed canonical seed manifest, deterministic hashes, provenance,
matcher terms, a local-only importer, an explicit local reset command, and a
disposable seed validation test.

It does **not** add public query endpoints, visitor submissions, Workers AI,
moderation intake, a remote D1 database, or production deployment.

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

## Local commands

```powershell
npm run check:ask-mark-schema
npm run check:ask-mark-seed
npm run askmark:d1:reset:local
npm run askmark:d1:list:local
```

`askmark:d1:reset:local` deletes only the ignored local state under
`workers/ask-mark/.wrangler/state`, reapplies migrations, and imports the approved seed.

## Next checkpoint

Batch 2C will add the first read-only Worker endpoints:

- `GET /v1/health`
- `GET /v1/bootstrap`
- `POST /v1/query`
