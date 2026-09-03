# Organizations Module v1

New pages:
- `pages/organizations.html` — directory/search/filter
- `pages/organization.html?id=<organization-id>` — organization profile

New frontend:
- `css/organizations.css`
- `js/organizations.js`
- `js/organization-profile.js`

Backend:
- `backend/supabase-organizations.sql`

The shared header now injects an `Organizations` navigation item on every page.

v1 deliberately keeps organization data separate from `pets` and `profiles`. Existing pets can be connected later through `organization_pets`, without changing the pets table.
