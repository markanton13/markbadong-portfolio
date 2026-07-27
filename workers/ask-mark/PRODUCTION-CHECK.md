# Ask Mark Production Regression Check

This check compares the live Ask Mark production system against the frozen
post-launch baseline in `production-baseline.json`.

## Public check

Run:

    npm run check:ask-mark-production

Public mode verifies:

- the unique Pages deployment, Pages domain, and custom domain
- the live custom-domain Ask Mark chunk and production Worker configuration
- Worker health, release metadata, and bootstrap behavior
- approved and unapproved CORS behavior
- grounded MarkHQ routing
- privacy, no-web, unsupported-request, and validation boundaries

## Authenticated check

Authenticated mode is available as an explicit opt-in. The default command
remains public-only and does not invoke Wrangler or query production D1.

Confirm that Wrangler is authenticated:

    node node_modules/wrangler/bin/wrangler.js whoami

Then run:

    npm run check:ask-mark-production -- --authenticated

Authenticated mode first runs every public production check, then additionally
verifies:

- the active Worker deployment ID and deployment strategy
- the single active Worker version and 100 percent traffic allocation
- the production D1 database name, UUID, and table count
- application table, active view, migration, and schema-version parity
- active release, approved seed, published release, and release-item parity
- source, snapshot, knowledge, approval, provenance, matcher, active, and
  unsafe-record counts
- foreign-key integrity through `PRAGMA foreign_key_check`
- SQLite integrity through `PRAGMA quick_check`

Authenticated results are compared with the frozen values in
`production-baseline.json`. The checker fails closed when any identity,
release, schema, count, safety, or integrity assertion differs.

## Safety requirements

- The checker must never deploy, roll back, migrate, seed, or edit Cloudflare.
- It remains separate from `npm run check` because it contacts production.
- Authenticated D1 checks may execute only one SELECT statement or an approved
  PRAGMA foreign_key_check or PRAGMA quick_check diagnostic.
- Every D1 result must report zero rows written, zero changes, and changed_db false.
- The full preview Worker URL must not be active in the production bundle.
- The preview hostname may remain in the shared inactive client allowlist.

## Existing local coverage

Browser offline, timeout, invalid-response, unmatched-response, and static
fallback behavior remain covered by `npm run check:ask-mark-client`.

## Environment notes

Cloudflare Pages production is pinned to Node 22. The post-launch audit was
run locally on Node 26.5.0, so Node-sensitive behavior should be validated
against Node 22 before a production release.

The recorded runtime SHA-256 is a historical Batch 2G validation attestation.
Its exact reconstruction procedure was not preserved. The production checker
must not pretend to recompute it. It instead verifies the live Worker version,
D1 release, database parity, integrity, and public API contract.
