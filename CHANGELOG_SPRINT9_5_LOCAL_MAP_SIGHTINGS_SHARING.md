# Sprint 9.5 — Smart Local Map, Sightings and Sharing

## Smart Local Map

- Starts around the signed-in visitor's area with a 50 km radius.
- Radius choices: 5, 10, 25, 50 and 100 km.
- Shows a private radius circle without publishing the user's location.
- Adds `My Area` and `View World` controls.
- Remembers the preferred radius.
- Falls back to world view when location permission is unavailable.

## Lost Pet Response

- Adds `I saw this pet` to active lost reports.
- Allows an exact sighting point, time, landmark and description.
- Displays sighting markers on the Lost & Found map.
- Sends a persistent notification to the pet owner.
- Realtime updates for new sightings.

## Sharing

- Native mobile share menu for installed apps and social networks.
- Desktop options for Facebook, WhatsApp, Messenger, X and email.
- Copy Link and QR code.
- Share actions on Lost & Found reports and Pet Profile.

## Required setup

Run `backend/supabase-lost-pet-sightings.sql` once in Supabase SQL Editor.
