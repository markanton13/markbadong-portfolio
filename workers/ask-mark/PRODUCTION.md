# Batch 2G — Production Ask Mark API

Batch 2G deployed and validated the isolated deterministic read-only Ask Mark production API.

## Validated resources

- Worker: `ask-mark-api-production`
- Endpoint: `https://ask-mark-api-production.markantonbadong13.workers.dev`
- Worker version: `4cda19fe-0ca8-48a3-a131-5633983d0305`
- Deployment allocation: 100%
- D1 database: `ask-mark-knowledge-production`
- D1 UUID: `88b44848-8ff3-4a95-8fbf-112cb2e26cbd`
- Schema version: `2A.1`
- Seed version: `2B.1`
- Active release: `release_0001`
- Active knowledge items: 26
- Runtime SHA-256: `2905BF114A6C483D917C01B33A230E0B78D259B4C938CA9345803FE6F165F447`

## Validation completed

- Production migrations and approved seed passed
- 4 sources and 4 source snapshots
- 26 approved knowledge versions
- 52 provenance links
- 82 active matcher terms
- Health and complete API contract passed
- Foreign-key validation passed
- SQLite quick check returned `ok`
- API requests performed no D1 writes

## Safety boundaries

- Answers use approved active knowledge only.
- Visitor messages are not stored.
- The Worker does not browse the public internet.
- No Workers AI, OpenAI, Resend, or vector database is used.
- No custom Worker route or domain was created.
- The production portfolio frontend remains disconnected.
- The frozen browser matcher remains the live frontend behavior.

## Worker rollback

Validated baseline version: `4cda19fe-0ca8-48a3-a131-5633983d0305`.

Worker rollback does not restore or modify D1 data.
Never rerun the initial production seed import against the populated production database.

## Release freeze

Batch 2G ends with the validated API available only through its isolated `workers.dev` endpoint.

Batch 2H remains frozen pending a separate reviewed production frontend cutover.
