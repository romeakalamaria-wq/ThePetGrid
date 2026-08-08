# ThePetGrid — Sprint 12.2 Profile Data Sync

Replace these complete files:

- pages/user-profile.html
- js/user-profile.js
- js/auth.js
- css/user-profile.css
- store/pet-store.js
- assets/avatar.png

Fixes:

1. Stable pet ownership
   New pets can store both:
   - owner = display name
   - ownerUsername = stable username

2. Old pet compatibility
   Existing pets that only contain `owner` are matched against known
   username/display-name aliases. PetStore also attempts a safe local migration
   and adds ownerUsername when the relationship can be resolved.

3. Profile About data
   `renderProfileDetails()` is now part of the normal profile render flow, so
   Username / Country / City / Member since / Community values no longer remain
   as placeholder dashes when data exists.

4. Profile pet count
   Pet ownership lookup prioritizes ownerUsername and falls back to username,
   display name and saved profile aliases.

5. Auth normalization
   `loggedUser` keeps stable username plus displayName/name/avatar metadata.

6. Avatar / paw logo
   The default square paw asset can no longer be squeezed into a tall oval by
   global image max-width rules.

7. Cache busting
   user-profile.html requests the new JS/CSS versions explicitly.

Test:
- Open user-profile.html?username=pizza
- Confirm About > Username shows @pizza.
- Confirm the paw avatar is square/circular, not vertically stretched.
- Confirm pets owned by the same username/display name are included.
- Refresh once with Ctrl + Shift + R.

No SQL migration is required for this local/demo compatibility layer.
