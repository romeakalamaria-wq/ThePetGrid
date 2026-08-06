# ThePetGrid — Atlas Map Shell v1.1

## What changed
- Added the shared Atlas Shell stylesheet and transition engine to `pages/map.html`.
- Restyled the existing map page with the same dark space ambience, glass panels, cyan/violet accents and header language used by Atlas.
- Added the persistent Return to Atlas gateway and common page transitions.
- Kept `js/map.js` and every MapLibre, geolocation, pet, presence and service-layer behavior unchanged.

## Test checklist
1. Open the Map page and confirm the Atlas header/background appears.
2. Test search, filters, My Area, View World and map markers.
3. Enable a service layer at zoom 13+ and verify results and popups.
4. Use Return to Atlas and verify the page transition.
5. Test desktop and mobile width.
