# Sprint 7.0 — Map Core Rewrite

## Fixed
- Added a glyph endpoint to the shared MapLibre style so cluster count labels render correctly.
- Removed the duplicate map presence subscription. The map now consumes the single global presence manager from `header-live.js`.
- Presence callbacks are registered before `subscribe()`.
- Prevented automatic Overpass requests on every map movement. Services now load only after the user presses **Refresh this area**.
- Kept one shared detailed road style for World Map, Upload Pet and Edit Pet.

## Reliability
- Existing timeout, endpoint fallback and local cache remain enabled.
- Moving the map no longer creates request storms, HTTP 429 errors or repeated aborted requests.

No new SQL is required.
