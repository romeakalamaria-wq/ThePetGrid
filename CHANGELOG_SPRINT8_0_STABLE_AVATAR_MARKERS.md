# Sprint 8.0 — Stable Avatar Markers

## Implemented

- Replaced plain circle pet points with circular avatar markers rendered inside MapLibre.
- Status-based marker borders:
  - green: online
  - gray: offline
  - gold: verified
  - orange halo: selected pet
- Added a small online/offline status dot and verified badge to each marker.
- Kept clusters with a premium orange visual and count.
- Fixed marker visibility while opening and closing a popup:
  - selection halo is now below the avatar layer
  - popup opening no longer clears or replaces the pet source
  - the active popup is managed as a single stable instance
  - pet GeoJSON is reasserted safely after popup close
- Added avatar fallbacks when an image cannot load because of CORS or a broken URL.
- Restores custom images and layers after a MapLibre style refresh.
