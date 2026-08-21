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
[`events.ts`](apps/dorkroom/src/app/lib/analytics/events.ts).

| Event | When it fires | What it records |
| --- | --- | --- |
| `share` | You create a share link for a preset or a recipe. | Which tool, and whether the link was copied or shared natively. |
| `share_opened` | You open a link someone else shared with you. | Which tool the link points at. |
| `recipe_saved` | You save a custom development recipe. | Whether it was new or an edit, and whether you typed it or imported it. |
| `recipe_deleted` | You delete a custom recipe. | Whether it was one recipe or all of them. |
| `recipe_imported` | You import a recipe from filmdev.org. | Whether the import succeeded. |
| `favorite_toggled` | You favorite or unfavorite a recipe. | Whether it was added or removed. |
| `calculator_used` | A calculator produces a result, once per calculator per visit. | Which calculator, and which mode (for example print size vs enlarger height). |
| `preset_applied` | You tap a built-in preset. | Which calculator, and the preset value (an EV number). |
| `theme_changed` | You switch themes. | Which theme you switched to. |
| `units_changed` | You switch between imperial and metric, or change volume units. | Which setting, and which unit. |
| `search_no_results` | A search returns nothing. | Which page, and how many filters were active. Never the search text. |
| `detail_opened` | You open a film or recipe detail view. | Whether it was a film or a recipe. |
| `filter_applied` | You apply a filter. | Which page, and which filter control. Never the value you chose. |
| `app_error` | Something crashes. | The page path. Never the error message. |
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

## Opting out

Any content blocker or a browser's Do Not Track setting will stop analytics from
loading, and nothing in Dorkroom depends on it. Every calculator, recipe, and
film page works exactly the same with analytics blocked.

## Changing this document

Analytics events are declared in one place,
[`apps/dorkroom/src/app/lib/analytics/events.ts`](apps/dorkroom/src/app/lib/analytics/events.ts).
Adding or changing an event means updating three things together, in the same
pull request:

1. The event catalog in `events.ts`.
2. This file.
3. The table in
   [`apps/dorkroom/src/app/pages/privacy-page.tsx`](apps/dorkroom/src/app/pages/privacy-page.tsx),
   which is what visitors actually read.

A privacy policy that lists less than the app sends is worse than none at all.
