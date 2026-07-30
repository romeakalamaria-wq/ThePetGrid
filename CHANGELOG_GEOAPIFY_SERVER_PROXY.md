# Geoapify server proxy update

- Added `api/geoapify.js`, a Vercel serverless proxy that reads `VITE_GEOAPIFY_API_KEY` on the server.
- Removed all visitor-facing API-key fields and Map Settings controls.
- Updated `ServiceClient` to call `/api/geoapify` without exposing the key in browser JavaScript.
- Added validation for categories, coordinates, map area and result limits.
- Added `.gitignore` and `.env.example` safeguards.

After pushing, redeploy on Vercel. The existing `VITE_GEOAPIFY_API_KEY` environment variable will be used automatically.
