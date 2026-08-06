# ThePetGrid — Atlas Transition Patch D1 + D2

This ZIP contains the first two safe steps of the Atlas Transition Engine.

## D1 — Atlas state save
Before **Open profile** leaves the Atlas, it saves:

- selected pet ID
- pet latitude and longitude
- camera latitude, longitude and altitude
- timestamp

Storage key:

`thepetgrid_atlas_state`

## D2 — Pet Story state read
When `pet.html` loads, `pet-profile.js` safely reads the saved state.

The state is temporarily exposed as:

`window.ThePetGridAtlasReturnState`

This prepares the project for **D3 — Back to Atlas and camera restoration**.

## Replace

- `js/world-experience.js`
- `js/pet-profile.js`
- `pages/pet.html`

No CSS changes are required in this step.
