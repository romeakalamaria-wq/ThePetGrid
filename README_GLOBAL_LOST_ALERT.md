
# ThePetGrid — Global Lost Alert

## What it does

Shows one compact banner across the site when there is an active Lost report.

It displays:

- pet name and breed/type
- last known location
- relative time
- one **View** button

The banner disappears automatically when there are no active Lost reports.

## Data sources

1. Supabase `lost_pet_reports` / `public_lost_pet_reports`
2. Local development fallback:
   `thepetgrid_lost_found_reports`

## Add to every page inside `pages/`

Inside `<head>`:

```html
<link rel="stylesheet" href="../css/lost-alert.css">
```

Before `</body>` and after Supabase scripts:

```html
<script src="../js/lost-alert.js"></script>
```

## Add to the root `index.html`

Inside `<head>`:

```html
<link rel="stylesheet" href="css/lost-alert.css">
```

Before `</body>`:

```html
<script src="js/lost-alert.js"></script>
```

No HTML container is required. The component creates itself automatically.
