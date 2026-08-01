# Sprint 9.4.2 — Clear Navigation and Password Recovery

## Navigation

- Removed `Add Pet` from beside the emergency Lost & Found action.
- Added `Add New Pet` as a highlighted action in the signed-in user menu.
- Added a clear `Add Your Pet` call-to-action on the Pets page.
- Kept the existing Add Pet action in My Profile.

## Password recovery

- Added `Forgot your password?` to Log In.
- Added Supabase password-reset email delivery.
- Added a secure Reset Password page.
- Added password confirmation and minimum-length validation.
- Added success/error feedback and automatic return to Log In.

## Supabase setting

Add the deployed reset page URL to Authentication > URL Configuration > Redirect URLs:

`https://the-pet-grid.vercel.app/pages/reset-password.html`

Local testing may also use:

`http://127.0.0.1:5500/pages/reset-password.html`
