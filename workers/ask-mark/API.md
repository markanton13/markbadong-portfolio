# Batch 2C — Local Read-Only API

Batch 2C exposes the active approved D1 release through three local Worker
endpoints.

## Endpoints

### `GET /v1/health`

Returns service status, API mode, active publication release, seed version, and
approved knowledge count.

### `GET /v1/bootstrap`

Returns approved assistant identity, professional summary, starter questions,
available categories, and project summaries.

### `POST /v1/query`

Accepts:

```json
{
  "message": "What customer support experience does Mark have?"
}
```

The endpoint normalizes the question, scores only active approved matcher terms,
and returns the matched active knowledge version. It does not use fuzzy AI,
public-web search, or visitor-provided claims.

Messages are limited to 500 characters and are not persisted in Batch 2C.

## Local use

First build the persistent local database:

```powershell
npm run askmark:d1:reset:local
```

Then start the Worker:

```powershell
npm run askmark:api:dev
```

Local base URL:

```text
http://127.0.0.1:8787
```

## Validation

```powershell
npm run check:ask-mark-api
```

The test creates a disposable seeded D1 database, starts Wrangler on a temporary
local port, and verifies:

- health and active-release metadata
- bootstrap identity and six seeded projects
- grounded profile and support answers
- privacy-boundary routing
- no-public-web routing
- unsupported-role non-guessing
- request validation
- method handling
- approved-origin CORS

No frontend file is changed in this batch. The frozen static matcher remains the
only browser-integrated behavior until Batch 2D.
