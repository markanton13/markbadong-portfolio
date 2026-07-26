# Ask Mark Remote Preview Frontend

Batch 2F adds an explicit frontend mode that connects the local portfolio to the isolated remote Ask Mark preview API.

## Modes

- npm run dev
  - Frozen static-only concierge.

- npm run dev:ask-mark
  - Local frontend connected to the local Worker and local D1.

- npm run dev:ask-mark-preview
  - Local frontend connected to the remote preview Worker and APAC D1.

- npm run build
  - Normal production build. It contains no preview endpoint configuration.

- npm run build:ask-mark-preview
  - Explicit preview build containing the allowlisted preview endpoint.

## Preview configuration

The file .env.askmark-preview contains:

- VITE_ASK_MARK_API_MODE=remote-preview
- The approved remote Worker base URL
- The exact allowed Worker hostname

The client requires:

- Vite mode askmark-preview
- API mode remote-preview
- HTTPS
- Exact approved hostname
- No custom port
- No username or password
- No alternate path, query, or fragment

## Manual validation completed

- Remote MarkHQ response returned through D1.
- Remote customer-support response returned through D1.
- Offline mode produced a failed network request but retained the frozen static answer.
- Returning online restored successful remote requests.

## Automated validation

    npm run check:ask-mark-client
    npm run check:ask-mark-preview

## Build isolation

The preview build must contain the approved preview endpoint.

The normal production build must not contain either the preview URL or hostname.

Always remove dist before comparing preview and normal builds so stale preview assets cannot create a false failure.

## Safety boundary

This mode does not switch the deployed production portfolio to the remote API.
The ordinary production build remains static-only until a separately approved release checkpoint.
