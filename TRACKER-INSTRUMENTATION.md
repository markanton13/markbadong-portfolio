# MARKBADONG Portfolio — Tracker Instrumentation

**Branch:** `feature/tracker-instrumentation-disabled`
**Collector:** `https://collect.markbadong.com/api/events`
**Initial state:** Disabled

## Safety behavior

The browser collector is bundled into the portfolio but performs no network requests unless:

```text
VITE_TRACKER_ENABLED=true
```

is explicitly present during the Vite build.

If the variable is absent or set to any other value, initialization exits immediately. This keeps production collection disabled while the event coverage is validated.

## Implemented event coverage

- `page_view` for approved portfolio routes
- `project_view` when an approved project case-study route loads
- `resume_open` for existing résumé links
- `resume_download` for any résumé link carrying a `download` attribute
- `github_click` for GitHub links
- `linkedin_click` for LinkedIn links
- `email_click` for Gmail compose and copy-address controls
- `contact_click` for contact-section and Telegram interactions
- `booking_click` for the Google Calendar popup shell and fallback link
- `external_demo_click` for release, demo, and other external proof links

## Data behavior

- Anonymous visitor UUID: browser local storage
- Anonymous session UUID: browser session storage
- No cookies
- No raw IP is collected by the portfolio
- Referrer is submitted, but the server stores only its hostname
- Country, device, browser, timestamp, page label, and source host remain server-owned
- Failed analytics requests never block navigation or normal site interactions

## Local validation

Use a local environment file that remains ignored by Git:

```text
VITE_TRACKER_ENABLED=true
VITE_TRACKER_ENDPOINT=http://127.0.0.1:8787/api/events
```

The local Worker must separately allow the local Vite origin during validation.

## Production enablement rule

Do not set `VITE_TRACKER_ENABLED=true` in Cloudflare Pages until every required event has been validated and the rollback record is complete.
