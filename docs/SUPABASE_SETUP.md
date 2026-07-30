# ThePetGrid — Supabase Setup

## 1. Create the project

Create a Supabase project and wait until the database is ready.

## 2. Create the database tables

Open **SQL Editor**, paste the full contents of:

`backend/supabase-schema.sql`

Run the script once.

## 3. Add the browser credentials

Open:

`js/supabase-config.js`

Replace these two placeholders:

```js
url: "PASTE_YOUR_SUPABASE_URL_HERE",
publishableKey: "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE"
```

Use the Project URL and publishable/anon browser key from the Supabase dashboard.
Never place the `service_role` key in this file.

## 4. Authentication settings

For the first local test, choose one of these:

- Keep email confirmation enabled and confirm the registration email.
- Temporarily disable email confirmation while developing locally.

Add your Live Server URL to the allowed redirect URLs when email confirmation is enabled, for example:

`http://127.0.0.1:5500/**`

## 5. Test

1. Open the project with Live Server.
2. Go to `pages/login.html`.
3. Register a new account.
4. Confirm the email when required.
5. Log in.
6. Check Supabase **Authentication → Users** and **Table Editor → profiles**.

## Current integration status

- Supabase client: ready.
- Register: connected when credentials are added.
- Login: connected when credentials are added.
- Logout/session restoration: connected.
- Profiles table and automatic profile creation: ready.
- Pets, likes, favorites, follows, messages and notifications tables: ready.
- Existing pet/community/message screens still use their current local demo data. Their database migration is the next phase.

Until the two Supabase credentials are entered, login automatically stays in safe local demo mode.
