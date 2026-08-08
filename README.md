# ThePetGrid — Sprint 12.1 Profile Identity

Replace these complete files:

- pages/user-profile.html
- js/user-profile.js
- css/user-profile.css

Adds:
- Dynamic Reputation score.
- Reputation level.
- Up to 4 meaningful profile badges.
- Community contribution progress.
- Reputation uses existing real local/demo activity:
  pets, followers, pet likes, community posts/comments/reactions,
  sightings, resolved Lost & Found helper fields, and gifts.
- Profile identity updates when relevant localStorage data changes.
- Mobile header compatibility fix so the page does not override the shared
  hamburger menu behavior.

No SQL migration is required for this Sprint 12.1 demo/local version.

Test:
1. Open pages/user-profile.html?username=<existing username>
2. Confirm Reputation / Badges / Contribution appear below the bio.
3. Test mobile menu.
4. Add a pet/post/comment and refresh the profile to verify the score changes.
