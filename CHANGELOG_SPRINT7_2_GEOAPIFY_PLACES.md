# Sprint 7.2 — Geoapify Places

## What changed

- Removed all direct Overpass API calls from the map engine.
- Added Geoapify Places API integration.
- Uses official Geoapify pet categories:
  - `pet.veterinary`
  - `pet.animal_shelter`
  - `pet.shop`
  - `pet.service`
  - `pet.dog_park`
- Added browser-side caching for 30 minutes.
- Added request cooldown and one-request-at-a-time protection.
- Added a Map settings panel where the API key can be saved locally.
- Added clearer errors for invalid keys and API limits.

## One-time setup

1. Create a free Geoapify account and API key.
2. Open `pages/map.html`.
3. Expand **Geoapify API settings**.
4. Paste the key and press **Save**.
5. In Geoapify, restrict the key to your development/production HTTP referrers.

The project intentionally does not ship with a private API key.
