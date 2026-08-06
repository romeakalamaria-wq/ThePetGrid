# ThePetGrid — Atlas Login Sync Fix

Replace these complete files:

- `pages/world-experience.html`
- `js/auth.js`
- `js/supabase-client.js`

## What this fixes

- The Atlas now loads the shared authentication system.
- The Atlas account button waits for the real Supabase session.
- When signed in, `Log In` changes to the current username.
- The account button links to `my-profile.html`.
- Lost Alert bell and the rest of the Atlas header remain untouched.
- Login/logout changes continue to synchronize through `thepetgrid:auth-changed`.

## Test

1. Log in on the demo.
2. Open Atlas / Global.
3. The upper-right account button must show your username instead of `Log In`.
4. Click it to open My Profile.
5. Log out and return to Atlas; it should show `Log In` again.

After replacement, use `Ctrl + Shift + R`.
