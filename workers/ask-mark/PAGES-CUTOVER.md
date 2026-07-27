# Batch 2H — Cloudflare Pages Cutover

## Audited Pages configuration

- Project: `markbadong-portfolio`
- Git repository: `markanton13/markbadong-portfolio`
- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- Automatic deployments: enabled
- Build system: Version 3
- Production variables: `NODE_VERSION` and `VITE_TRACKER_ENABLED`

No `VITE_ASK_MARK_*` variable is required in the Pages dashboard.

## Deterministic build selection

The repository build command uses Cloudflare Pages system variables:

- Cloudflare Pages plus branch `main` uses Vite mode `askmark-production`.
- Cloudflare Pages preview branches use ordinary static-only mode.
- Local `npm run build` uses ordinary static-only mode.
- A branch named `main` outside Cloudflare Pages remains static-only.

The production Worker URL remains confined to `.env.askmark-production`.

## Release boundary

Committing this selector on the feature branch does not change `markbadong.com`.

The live cutover occurs only after the validated branch reaches `main` and the corresponding production Pages deployment succeeds.
