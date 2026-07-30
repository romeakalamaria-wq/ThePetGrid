# Sprint 7.8.1 — Marker Stability Fix

- Keeps the last pet GeoJSON collection in memory.
- Restores missing MapLibre pet layers after style or render updates.
- Prevents duplicate event listeners when layers are restored.
- Validates pet coordinates before rendering markers.
- Keeps the selected pet highlighted while its popup is open.
- Keeps the popup open during map movement.
