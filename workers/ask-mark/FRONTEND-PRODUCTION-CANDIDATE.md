# Batch 2H — Production Frontend Candidate

This checkpoint validates an isolated frontend build connected to the approved Ask Mark production Worker.

## Candidate configuration

- Vite mode: `askmark-production`
- API mode: `remote-production`
- Production Worker: `https://ask-mark-api-production.markantonbadong13.workers.dev`
- Approved Worker hostname: `ask-mark-api-production.markantonbadong13.workers.dev`
- Local browser QA origin: `http://127.0.0.1:5173`

The ordinary `npm run build` remains static-only.

## Automated validation

- Local Worker development remains supported
- Remote preview mode remains isolated
- Production candidate mode requires its exact Vite mode and hostname
- Missing or mismatched configuration disables the remote client
- Normal build contains no preview or production Worker endpoint
- Production candidate build contains the production endpoint only
- D1 response mapping passed
- Unmatched, offline, timeout, and invalid remote responses retain the static fallback
- Full repository validation passed

## Manual browser QA

- MarkHQ returned an approved D1-backed response
- Customer-support experience returned approved knowledge
- Private address and phone request triggered the privacy boundary
- Public-web request triggered the no-web boundary
- Unrelated question retained the safe static fallback
- Offline mode retained a usable static answer
- Returning online restored successful production Worker requests
- MarkHQ project action opened the correct internal project route
- Assistant launcher and panel remained usable at mobile width
- Production Worker requests returned HTTP 200
- Preview Worker was not contacted

## Release boundary

This checkpoint does not change the deployed portfolio.

No Cloudflare Pages build command, production environment variable, custom domain, or live frontend route was changed.

The live portfolio remains static-only until the final Batch 2H cutover checkpoint.
