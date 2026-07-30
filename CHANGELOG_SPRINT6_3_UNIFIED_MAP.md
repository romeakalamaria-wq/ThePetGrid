# Sprint 6.3 — Unified Detailed Map

- Replaced the demo MapLibre background with a complete OpenStreetMap road map on World Map, Upload Pet and Edit Pet.
- Added one shared `js/map-style.js` configuration so every map uses the same visual base.
- Fixed Supabase Presence callback order: all `.on("presence")` handlers are now registered before `.subscribe()`.
- Added live OpenStreetMap/Overpass service layers for veterinary clinics, shelters, pet shops, groomers and dog parks.
- Added three Overpass fallback endpoints, request timeout, abort handling, 15-minute cache and zoom threshold.
- Added branded service markers, popups, directions links and responsive status messages.
- No database migration is required.
