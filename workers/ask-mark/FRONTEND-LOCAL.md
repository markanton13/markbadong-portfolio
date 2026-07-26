# Batch 2D - Development Frontend Bridge

Batch 2D connects the visible Ask Mark React concierge to the local read-only Worker API.
The frozen browser matcher remains the automatic fallback.

## Safety model

- The API bridge is active only in Vite development mode.
- The API URL must use HTTP and a loopback host.
- Normal npm run dev remains static-only.
- Production builds do not receive the local API URL.
- Offline, timed-out, invalid, or unmatched requests use the static matcher.
- Visitor questions are not persisted.
- No remote D1 deployment or public-web search is introduced.

## Local setup

Prepare the database:

npm run askmark:d1:reset:local

Terminal A - Worker:

npm run askmark:api:dev

Terminal B - Portfolio:

npm run dev:ask-mark

Open http://127.0.0.1:5173

Normal static-only mode:

npm run dev

## Validation

npm run check:ask-mark-client
npm run check
