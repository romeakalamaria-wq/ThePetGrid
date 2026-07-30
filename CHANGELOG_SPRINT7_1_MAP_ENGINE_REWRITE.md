# Sprint 7.1 — Map Engine Rewrite

## Rewritten
- Shared `MapManager` used by World Map, Upload Pet and Edit Pet.
- Dedicated PetLayer, ServiceLayer, ServiceClient and PresenceBridge modules.
- The map no longer creates its own Supabase Presence channel. It consumes the single presence event published by `header-live.js`.
- Pet clusters contain no text layers, so they do not require glyphs and cannot trigger the old `text-field` validation errors.
- Pet services never load automatically while the user moves the map.
- Service requests happen only after clicking **Refresh this area**, at zoom 13+, with one in-flight request, cooldown, cache and sequential endpoint fallback.
- The detailed OpenStreetMap road tiles remain shared across every MapLibre instance.

## No SQL required
The included optional Edge Function folder is reserved for a later server-side services proxy. The current frontend works without deploying it.
