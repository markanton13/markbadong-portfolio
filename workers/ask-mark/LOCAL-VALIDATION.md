# Batch 2A Local Validation

This checkpoint validates the Ask Mark schema against a disposable local D1
database. It does not create, modify, or connect to a remote Cloudflare
database.

## Commands

From the repository root:

```powershell
npm install
npm run check:ask-mark-schema
npm run check
```

The schema check:

1. Deletes only `workers/ask-mark/.wrangler-schema-check`.
2. Applies all four migrations to a new local D1 database.
3. Applies the migration command a second time to verify replay safety.
4. Confirms the expected 13 application tables.
5. Confirms the `v_active_knowledge` view.
6. Confirms four entries in `d1_migrations`.
7. Confirms schema version `2A.1`.
8. Removes the disposable database after a successful run.

On failure, the disposable state is retained for inspection.

## Persistent local database

For manual local work:

```powershell
npm run askmark:d1:migrate:local
npm run askmark:d1:list:local
```

These commands use `workers/ask-mark/.wrangler/state`, which is ignored by Git.

## Safety boundaries

- Every included command uses `--local`.
- The configured database ID is an all-zero non-production placeholder.
- No remote database is created.
- No deployment command is defined.
- No API token, account ID, secret, or private content belongs in this config.
- `workers_dev` is disabled.
- The placeholder Worker returns HTTP 503 and does not expose a public API.
