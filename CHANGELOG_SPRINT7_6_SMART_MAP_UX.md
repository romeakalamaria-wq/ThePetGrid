# Sprint 7.6 — Smart Map UX

- Nearby Geoapify services refresh automatically after map pan or zoom ends.
- Service layer changes trigger an immediate automatic refresh.
- Requests use a 550 ms debounce to avoid unnecessary API calls.
- An in-progress request is cancelled when the user moves the map again.
- Cached results are reused for the same visible area and selected layers.
- Added an on-map loading indicator while nearby services are searched.
- Kept “Refresh now” as an optional manual force-refresh control.
- Increased service popup width, typography, spacing and action-button size.
- Improved service address, phone and website rendering.
