# Ask Mark Worker — D1 Foundation

This directory contains the isolated Cloudflare Worker and D1 foundation for Ask Mark.

## Batch 2A scope

This first batch establishes only the database model for:

- system settings and registered canonical sources
- immutable source snapshots
- knowledge items and immutable knowledge versions
- provenance, matcher terms, and knowledge relations
- publication releases and atomic active-release selection
- review decisions and append-only audit events

It does **not** add public query endpoints, visitor submissions, Workers AI, moderation intake, or production deployment.

## Locked rules

- Ask Mark answers only from approved sources.
- Visitor statements never become active knowledge automatically.
- Approved content is versioned; prior versions are never overwritten.
- Publication activates an immutable release snapshot.
- Rollback reactivates a prior release and preserves the audit trail.
- The existing browser matcher remains the deterministic fallback.
- Ask Mark uses a D1 database separate from the portfolio analytics database.
- No paid service, paid vector database, Resend dependency, or public-web search is introduced.

## Planned migration order

1. `0001_system_sources.sql`
2. `0002_knowledge_core.sql`
3. `0003_publication.sql`
4. `0004_review_audit.sql`

The migrations are additive and forward-only. No destructive migration should be introduced without a separately approved backup and rollback plan.

## Next checkpoint

After reviewing these migrations:

1. Create the D1 database locally or through Wrangler.
2. Add the real non-secret Wrangler binding configuration.
3. Replay all migrations from an empty local database.
4. Add schema-validation tests.
5. Begin the canonical source importer in Batch 2B.
