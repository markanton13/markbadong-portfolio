# Batch 2B — Canonical Approved Knowledge Seed

The reviewed seed manifest is:

```text
workers/ask-mark/seeds/approved-knowledge.v1.json
```

It includes approved identity, career history, education, credentials, proof
points, working style, role classifications, guardrails, public contact actions,
and six verified portfolio projects. Every active item has provenance and matcher
terms and is included in `release_0001`.

## Local validation

```powershell
npm run check:ask-mark-seed
```

The test creates a disposable local D1 database, applies all migrations, imports
the seed, validates active-release parity, confirms provenance and matcher
coverage, checks that no private or restricted item is active, and verifies that
a second import is blocked.

The local CLI importer intentionally does not use raw SQL `BEGIN` or
`COMMIT`. Current Wrangler local D1 execution rejects SQL-managed
transactions. The importer therefore runs only against a clean local database
and validates the complete result afterward. Production publication will use
Worker-side D1 batch or storage transaction APIs instead of this bootstrap
importer.
## Persistent local reset

```powershell
npm run askmark:d1:reset:local
```

This deletes only `workers/ask-mark/.wrangler/state`, reapplies migrations, and
imports the reviewed seed. It never touches a remote database.

The seed intentionally excludes Mark's phone number and private information.
Future approved changes must create new knowledge versions and publication
releases rather than editing historical versions in place.
