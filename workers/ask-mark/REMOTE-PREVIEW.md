# Ask Mark Remote Preview

This environment is an isolated remote preview for the Ask Mark deterministic D1 API.

## Resources

- Worker: ask-mark-api-preview
- Worker URL: https://ask-mark-api-preview.markantonbadong13.workers.dev
- D1 database: ask-mark-knowledge-preview
- D1 region: APAC
- Approved seed version: 2B.1
- Active release: release_0001
- Active knowledge items: 26

This environment is not the production Ask Mark API and is not attached to the production portfolio frontend.

## Validation

Run the complete remote endpoint check:

    npm run check:ask-mark-preview

The check validates:

- Worker health
- Active approved release
- Bootstrap response
- Grounded MarkHQ query
- Project action
- Privacy boundary
- No-web boundary
- Request validation

## Deployment

Validate the Worker bundle without deploying:

    npx wrangler deploy --dry-run --config .\workers\ask-mark\wrangler.preview.jsonc

Deploy the remote preview Worker:

    npm run askmark:preview:deploy

Validate after deployment:

    npm run check:ask-mark-preview

## Migrations

List remote migrations:

    npm run askmark:preview:migrations:list

Apply pending remote migrations:

    npm run askmark:preview:migrate

Review pending migrations before confirming the operation.

## Health Check

    Invoke-RestMethod -Method Get -Uri "https://ask-mark-api-preview.markantonbadong13.workers.dev/v1/health" | ConvertTo-Json -Depth 10

## Recovery Procedure

### Worker unavailable

Redeploy and validate:

    npm run askmark:preview:deploy
    npm run check:ask-mark-preview

### Database schema missing

Check and apply migrations:

    npm run askmark:preview:migrations:list
    npm run askmark:preview:migrate

### Database knowledge missing

Verify that source_records, knowledge_items, publication_releases, and v_active_knowledge are all empty before importing the canonical seed.

The canonical seed import must exclude:

- d1_migrations
- _cf_KV
- sqlite_sequence
- The migrated schema_version setting
- Explicit transaction wrappers

After recovery:

    npm run check:ask-mark-preview

## Safety Boundaries

- Never point preview commands at a production D1 database.
- Never rerun the initial seed against populated tables.
- Never expose private information through approved knowledge.
- Never attach the production portfolio to this preview endpoint without a separate release checkpoint.
- Generated SQL exports under .wrangler must remain uncommitted.
