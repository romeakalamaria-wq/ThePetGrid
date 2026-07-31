# Sprint 9.4 — Nearby Lost Pet Alerts Setup

## Required Supabase step

1. Open the Supabase project.
2. Open **SQL Editor**.
3. Open `backend/supabase-nearby-lost-alerts.sql` from this project.
4. Copy the complete SQL file into Supabase SQL Editor.
5. Press **Run** once.

The script is safe to run again if setup is interrupted.

## User activation

1. Log in to ThePetGrid.
2. Press **Nearby Alerts** in the header.
3. Choose a radius: 5, 10, 25 or 50 km.
4. Press **Use my location & save**.
5. Allow location and browser notifications.

The exact user location is private. It is only used by the database to calculate distance.

## Test with two accounts

1. Account A enables Nearby Alerts and saves its location.
2. Account B publishes a Lost report inside Account A's radius.
3. Account A receives a realtime in-site alert.
4. If the site is open in a background tab and browser permission is granted, Account A also receives a browser notification.

Offline push notifications, when the browser is fully closed, require a future service-worker/Web Push deployment.
