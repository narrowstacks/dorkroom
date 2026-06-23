# iOS Home Screen Quick Actions — Design

**Date:** 2026-06-22
**App:** `apps/mobile` (Expo / React Native, iOS)
**Status:** Approved (Phase 1)

## Goal

Let users jump straight to a specific page of the Dorkroom iOS app by
long-pressing the app icon on the home screen and choosing an action. Phase 1
ships home-screen quick actions for the four most useful pages, with the **light
meter** as the headline action. Siri / Shortcuts-app integration (App Intents)
is a deliberately deferred Phase 2.

## Scope

**In scope (Phase 1):**

- Home-screen quick actions (long-press app icon → action menu) for 4 pages.
- Tapping an action deep-links to the corresponding tab.

**Out of scope (Phase 2, not built now):**

- App Intents — Siri voice commands, Spotlight, the Shortcuts app, automations.
  Noted here only because the per-page route mapping established in Phase 1 is
  the same concept Phase 2 reuses, so none of this work is throwaway.

## Approach

Use **`expo-quick-actions`** (Evan Bacon; actively maintained). It provides the
two pieces required:

1. **Config plugin** — declares the actions statically in `app.json`. Static
   actions appear in the long-press menu **immediately on install, before the
   app's first launch**, requiring no runtime registration code. The plugin
   supports `symbol:` SF Symbol icons, letting us reuse the exact icons already
   used in the tab bar.
2. **`useQuickActionRouting()`** hook (from `expo-quick-actions/router`) —
   handles the tap and navigates Expo Router to the action's `params.href`.

**Why static (config plugin) over the dynamic `setItems()` API:** these are four
fixed pages. Static declaration is simpler, needs no runtime registration code,
and surfaces the actions before first launch. The only runtime addition is the
single routing hook.

The `dorkroom://` URL scheme and the tab routes already exist, so deep-linking
to a tab route simply selects that tab — no new routing code beyond the hook.

## The four actions

Declared under the plugin in `app.json`, ordered top-to-bottom as shown in the
menu (Light Meter first). iOS displays a maximum of four quick actions, so the
list is exactly four.

| Order | Title       | SF Symbol icon         | href (route)     |
| ----- | ----------- | ---------------------- | ---------------- |
| 1     | Light Meter | `symbol:camera.aperture` | `/meter`       |
| 2     | Border      | `symbol:square.dashed`   | `/` (index tab) |
| 3     | Exposure    | `symbol:plusminus`       | `/exposure`    |
| 4     | Reciprocity | `symbol:timer`           | `/reciprocity` |

Icons mirror the existing tab-bar icons in `app/(tabs)/_layout.tsx`.

## Files touched

- **`apps/mobile/package.json`** — add the `expo-quick-actions` dependency.
- **`apps/mobile/app.json`** — add `expo-quick-actions` to `plugins` with the
  four `iosActions` above.
- **`apps/mobile/app/_layout.tsx`** — call `useQuickActionRouting()` inside
  `RootLayout` so action taps route to `params.href`.
- **`apps/mobile/CHANGELOG.md`** — add a changelog entry (mobile app uses its own
  changelog per project convention).

## Data flow

```
Long-press app icon
   → iOS reads static UIApplicationShortcutItems (from config plugin / app.json)
   → user taps an action
   → expo-quick-actions delivers the action to JS
   → useQuickActionRouting() reads params.href
   → Expo Router navigates to the route → correct tab is selected
```

## Verification

Quick actions require a real native build and cannot be exercised by the Vitest
unit suite (and snapshotting config-plugin output would be brittle for little
value). Verification is therefore:

1. `bun run typecheck` and `bun run lint` pass in `apps/mobile`.
2. `expo prebuild` regenerates iOS native config without error.
3. A device/simulator build: long-press the app icon, confirm the four actions
   appear in the correct order with correct icons, and tap each one to confirm
   it opens the correct tab.

## Risks / notes

- **`expo-quick-actions` compatibility** with Expo 54 + New Architecture
  (`newArchEnabled: true`) + iOS 26 deployment target must be confirmed at
  install time. If incompatible, fall back to writing
  `UIApplicationShortcutItems` directly via an Info.plist config-plugin mod plus
  handling taps through `expo-linking` / the existing `dorkroom://` scheme.
- The Border action's href is `/` (the index route within the `(tabs)` group).
