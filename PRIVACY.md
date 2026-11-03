# Privacy

The version of this document rendered for readers lives at
[dorkroom.art/privacy](https://dorkroom.art/privacy). This copy is the one that
travels with the source.

## The short version

Dorkroom has no accounts and no cookies. It counts which tools get used so the
ones people rely on keep getting attention, and it does that without collecting
anything that could identify you or reveal what you were working on. Your
recipes, favorites, and calculator settings are stored in your own browser and
never leave it.

## What we use

- **[Vercel Web Analytics](https://vercel.com/docs/analytics/privacy-policy)**
  for page views and the events listed below.
- **Vercel Speed Insights** for page load timings.

Both are cookieless, and neither builds a profile of you across sites or visits.

Every URL is stripped of its query string and hash before it is sent. That
matters here because Dorkroom encodes real work in URLs: a shared border preset
carries your print dimensions, and the film and recipe pages carry what you
searched for. None of that reaches the analytics service. The redaction runs in
[`redact.ts`](apps/dorkroom/src/app/lib/analytics/redact.ts) and is wired up in
[`main.tsx`](apps/dorkroom/src/main.tsx).

## Every event we record

The catalog below is generated from, and must stay in sync with,
[`tracked-events.ts`](apps/dorkroom/src/app/lib/analytics/tracked-events.ts).

| Event | When it fires | What it records |
| --- | --- | --- |
| `share` | You create a share link for a calculation, a preset, a recipe or a film. Sharing the same link again on the same page is not counted again. | Which tool, and whether the link was copied, shared natively, or shown for copying by hand. |
| `share_opened` | You open a link someone else shared with you. Links from a Share button carry a `source=share` marker so the page can tell; links from the site search never do. | Which tool the link points at. |
| `recipe_saved` | You save a custom development recipe. | Whether it was new or an edit, and whether you typed it or imported it. |
| `recipe_deleted` | You delete a custom recipe. | Nothing else; there is no bulk-delete action. |
| `recipe_imported` | You import a recipe from filmdev.org. | Whether the import succeeded. |
| `favorite_toggled` | You favorite or unfavorite a recipe. | Whether it was added or removed. |
| `calculator_used` | A calculator produces a result, once per calculator per visit. | Which calculator, and which mode (for example print size vs enlarger height). |
| `preset_applied` | You tap a built-in preset. | Which calculator, and the preset value — an EV, a stop increment, a focal length in mm, an exposure time in seconds, or a built-in preset's position in the list (mat board sizes, border presets). Presets you save yourself are never tracked. |
| `theme_changed` | You switch themes. | Which theme you switched to. |
| `units_changed` | You switch between imperial and metric, or change volume units. | Which setting, and which unit. |
| `search_no_results` | A search returns nothing. | Which page, and how many filters were active. Never the search text. |
| `home_search` | A search on the home page settles (once per search, not per keystroke). | What kind of answer it showed (a recipe, a calculator, a list of matches, or nothing) and how many matches it listed. Never the search text. |
| `nav_search` | A search from the search button in the navigation bar settles (once per search, not per keystroke). | What kind of answer it showed (a recipe, a calculator, a list of matches, or nothing) and how many matches it listed. Never the search text. |
| `detail_opened` | You open a film or recipe detail view. | Whether it was a film or a recipe. |
| `filter_applied` | You apply a filter. | Which page, and which filter control. Never the value you chose. |
| `app_error` | Something crashes. | Which of Dorkroom's pages you were on, chosen from a fixed list. Never the error message, and never a path you typed. |
| `route_not_found` | You land on a page that does not exist. | Whether you arrived from inside Dorkroom, from elsewhere, or directly. |

Each event carries at most two of these short labels and nothing else. There is
no identifier tying one event to another, so they cannot be reassembled into a
session or a person.

## What we never collect

- Accounts, names, email addresses, or any way to contact you.
- Cookies. Dorkroom sets none, for analytics or anything else.
- Anything you type: search terms, recipe names, notes, or print dimensions.
- Your saved recipes, favorites, and presets. These live in your browser and are
  never uploaded.
- IP addresses or device fingerprints stored against your activity.
- Any data sold, shared, or handed to advertisers. There are no ad networks
  here.

## The iOS app

The Dorkroom iOS app shares its calculators and film data with the website, but it handles data differently. The sections above describe the website; this section describes the app.

- **No analytics.** The app has no analytics, crash reporting, advertising, or tracking code, and no cookies. It does not track you, so it never shows the App Tracking Transparency prompt. The Vercel Analytics events above are for the website only.
- **The light meter and camera.** The light meter reads the exposure time and ISO that the camera's own auto-exposure chooses for the scene and works out a reading from them. It does not analyze, record, or upload the camera's video frames. The negative inverter's live preview is processed on your phone too. A photo is taken only when you press the shutter, and it stays on your phone.
- **Photos.** You choose a photo for a film log shot or the negative inverter with the system photo picker, which hands the app only the photo you picked. The app adds to your Photos library only when you tap Save in the negative inverter or turn on "Also save meter photos to Photos" in Settings (off by default), and it asks iOS for add-only permission. It never reads your library.
- **The film log stays on your phone.** Rolls, shots, cameras, lenses, and the photos attached to shots are stored only on your phone: the text in the app's local storage and the photos in the app's documents folder. There is no account and no sync, and none of it is uploaded. It leaves your phone only when you export or share it from the share sheet. Like other app data, iOS may include it in your device backups, depending on your backup settings. Deleting the app deletes it. The negative inverter keeps its last photo and settings in the app's private data folder the same way.
- **What the app sends over the network.** The only server the app talks to is api.dorkroom.art, to download film, developer, and recipe data. Nothing from your film log, photos, or calculators is sent. The app keeps those downloads on your phone for up to 7 days so it works offline. As with any request, your IP address reaches the server.
- **The per-install client ID.** Each request carries an ID that the app makes up the first time it runs, from the time of that first launch plus random characters. It is stored on your phone, is not derived from your device, Apple ID, or advertising identifier, and is not linked to a name, email address, or any account. It exists so the API can limit how many requests each install makes per minute, instead of limiting all installs together. The API checks it, with your IP address, against a rate limit that resets every minute, using the rate-limiting service Unkey. Dorkroom's API code does not write it to logs or to a database. Deleting the app deletes the ID, and a reinstall gets a new one.
- **Links.** Privacy Policy, Support, Licenses, GitHub, Newsletter, and links inside recipes open in your browser, where the site you reach has its own policy.

## Opting out

Any content blocker or a browser's Do Not Track setting will stop analytics from
loading, and nothing in Dorkroom depends on it. Every calculator, recipe, and
film page works exactly the same with analytics blocked.

## Changing this document

Analytics events are declared in one place,
[`apps/dorkroom/src/app/lib/analytics/tracked-events.ts`](apps/dorkroom/src/app/lib/analytics/tracked-events.ts).
Adding or changing an event means updating three things together, in the same
pull request:

1. The event catalog in `tracked-events.ts`.
2. This file.
3. The table in
   [`apps/dorkroom/src/app/pages/privacy-page.tsx`](apps/dorkroom/src/app/pages/privacy-page.tsx),
   which is what visitors actually read.

A privacy policy that lists less than the app sends is worse than none at all.
