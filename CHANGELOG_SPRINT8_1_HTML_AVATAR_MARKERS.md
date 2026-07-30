# Sprint 8.1 — HTML Avatar Markers

- Replaced dynamic MapLibre `icon-image` / `map.addImage()` pet markers with stable HTML markers.
- Removed the source of `styleimagemissing` errors.
- Kept native GeoJSON clustering for performance.
- HTML markers are displayed only for currently unclustered visible pets.
- Online pets use a green animated border.
- Offline pets use a grey border.
- Verified pets use a gold border and verification badge.
- The selected pet uses an orange animated halo and stays visible while its popup is open.
- Popup opening no longer changes or removes the marker image.
