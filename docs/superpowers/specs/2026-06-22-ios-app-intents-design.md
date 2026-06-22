# iOS Shortcuts / Siri (App Intents) — Design

**Date:** 2026-06-22
**App:** `apps/mobile` (Expo / React Native, iOS)
**Status:** Approved
**Relationship:** Phase 2 of iOS shortcuts work. Phase 1 (home-screen quick
actions) shipped on `feat/ios-quick-actions`; this phase continues on the same
branch.

## Goal

Expose Dorkroom's pages to **Siri, Spotlight, and the Shortcuts app** via Apple's
App Intents framework. Phase 2 ships **open-page** App Shortcuts for the four
Phase-1 pages (Light Meter, Border, Exposure, Reciprocity) and **stubs** one
functional calculator intent to seed Phase 2b — without building the native↔JS
bridge that functional intents require.

## Scope

**In scope:**

- A local Expo config plugin that injects Swift App Intents into the iOS app
  target at prebuild.
- One parameterized `OpenPageIntent` + a `DorkroomPage` app-enum.
- An `AppShortcutsProvider` with four open-page App Shortcuts (Siri phrases,
  short titles, SF Symbols) that auto-register to Siri / Spotlight / Shortcuts app.
- One **stubbed** functional intent (`CalculateReciprocityIntent`) that returns a
  "coming soon" dialog — discoverable in the Shortcuts app, no Siri phrase.

**Out of scope (Phase 2b):**

- Functional calculator intents that actually compute.
- App Group + native↔JS bridge for sharing data/results with React Native.
- `AppEntity` queries, donations, Spotlight result entities, Control Center
  controls, Focus filters.

## Approach

A self-contained **local config plugin** (`apps/mobile/plugins/with-app-intents/`)
owns everything. **No new npm dependency.** Chosen over `@bacons/apple-targets`
(needs a dedicated target; App Shortcuts behave best in the main app target) and
over four separate intents (4× boilerplate vs. one enum-parameterized intent).

The plugin runs in two stages at prebuild — **both are required** or the intents
silently fail to register:

1. `withDangerousMod` (`ios`) — copy `swift/*.swift` into
   `<platformProjectRoot>/AppIntents/`.
2. `withXcodeProject` — add each copied file to the app target's compile sources
   (`project.addSourceFile('AppIntents/<file>', { target: firstTarget.uuid })`),
   **idempotently** so a re-run of prebuild does not create duplicate build refs.

Swift files live at the **iOS project root** (`ios/AppIntents/`), never inside an
Expo module — nesting breaks `AppShortcutsProvider` auto-registration.

**No entitlement and no `NSSiriUsageDescription`** are required: App Shortcuts
(iOS 16+) need neither (that's legacy SiriKit). The iOS 26 deployment target
covers all App Intents APIs used.

## File structure

```
apps/mobile/plugins/with-app-intents/
  index.js                            # the config plugin (2 stages, idempotent)
  swift/
    OpenPageIntent.swift              # OpenPageIntent + DorkroomPage app-enum
    DorkroomShortcuts.swift           # AppShortcutsProvider — 4 open-page shortcuts
    CalculateReciprocityIntent.swift  # stubbed functional intent (Phase 2b seed)
```

## Swift components

### `DorkroomPage` (AppEnum)

Cases `meter`, `border`, `exposure`, `reciprocity`, each with a display title.
Provides `typeDisplayRepresentation` and `caseDisplayRepresentations`.

### `OpenPageIntent` (AppIntent)

- `static var title: LocalizedStringResource = "Open Dorkroom Page"`
- `static var openAppWhenRun = true`
- `@Parameter var page: DorkroomPage`
- `perform()` opens the page's deep link via `UIApplication.shared.open(url)` and
  returns `.result()`. Navigation is then handled by **existing** expo-router
  deep-linking — no new JS code.

Route → URL mapping (reusing the registered `dorkroom://` scheme):

| Page        | URL                  | Tab route        |
| ----------- | -------------------- | ---------------- |
| meter       | `dorkroom://meter`   | `/meter`         |
| border      | `dorkroom://`        | `/` (index tab)  |
| exposure    | `dorkroom://exposure`| `/exposure`      |
| reciprocity | `dorkroom://reciprocity` | `/reciprocity` |

(The exact border URL — scheme root vs. an explicit path — is confirmed on device
during verification; the plan notes the fallback.)

### `DorkroomShortcuts` (AppShortcutsProvider)

`static var appShortcuts: [AppShortcut]` returns four entries, each instantiating
`OpenPageIntent(page:)` with a fixed page plus its phrases, `shortTitle`, and SF
Symbol. **Every phrase must include the `\(.applicationName)` macro** or the
shortcut is dropped during build-time intent indexing.

| Page        | shortTitle  | systemImageName  | Example phrases (all include `\(.applicationName)`)      |
| ----------- | ----------- | ---------------- | -------------------------------------------------------- |
| meter       | Light Meter | `camera.aperture`| "Open Light Meter in Dorkroom" / "Open Dorkroom Light Meter" |
| border      | Border      | `square.dashed`  | "Open Border in Dorkroom" / "Open Dorkroom Border calculator" |
| exposure    | Exposure    | `plusminus`      | "Open Exposure in Dorkroom" / "Open Dorkroom Exposure calculator" |
| reciprocity | Reciprocity | `timer`          | "Open Reciprocity in Dorkroom" / "Open Dorkroom Reciprocity calculator" |

Icons mirror the tab bar and the Phase-1 quick actions.

### `CalculateReciprocityIntent` (stub)

- `static var title: LocalizedStringResource = "Calculate Reciprocity"`
- `@Parameter var meteredSeconds: Double`
- `perform()` returns
  `.result(dialog: "Calculator Shortcuts are coming soon to Dorkroom.")`.
- **Not** added to `appShortcuts` (no Siri phrase — we don't advertise a
  non-working voice command), but discoverable as an action in the Shortcuts app
  (`isDiscoverable` defaults true).
- A header comment marks it the Phase 2b seed: it will compute via `@dorkroom/logic`
  through an App Group / native bridge.

## Config plugin (`index.js`)

A single exported plugin function composing the two stages above. Copies the
Swift files, adds them to the target idempotently (skip if the source ref already
exists; optionally group them under an `AppIntents` PBXGroup). Errors loudly if
`addSourceFile` fails — a silently-disabled intent is worse than a failed build.

## Data flow

```
Siri / Spotlight / Shortcuts app
  → OpenPageIntent.perform()
  → UIApplication.shared.open("dorkroom://<route>")
  → iOS delivers the URL to the app
  → expo-router deep-linking navigates to the tab
```

No new JavaScript — this reuses the deep-link path the app already supports.

## Error handling

- **Plugin:** idempotent copy + add; loud failure on Xcode wiring errors.
- **Intents:** page URLs are static string literals (safe to construct);
  `perform()` always returns a result; the stub returns its dialog.

## Testing / verification

- **JS/plugin:** `bun run typecheck` + `bun run lint` (the plugin is JS).
- **Swift compiles:** `expo prebuild --clean` + a **development build** (native
  change, per `apps/mobile/CLAUDE.md`). Confirm the `.swift` files are in
  `ios/AppIntents/`, referenced in `ios/<App>.xcodeproj/project.pbxproj`, and
  compile cleanly.
- **On-device (user-run):**
  - Spotlight: search "Light Meter" → Dorkroom shortcut appears → opens Meter tab.
  - Siri: "Open Light Meter in Dorkroom" → opens Meter tab. Repeat for each page.
  - Shortcuts app: the four open-page actions appear, plus "Calculate Reciprocity",
    which returns the "coming soon" dialog.
- **No Swift/native unit tests** — consistent with the app convention (native
  behavior is verified on device, not mocked).

## Files touched

- **Create:** `plugins/with-app-intents/index.js` and the three `swift/*.swift`
  files.
- **Modify:** `apps/mobile/app.json` (add `"./plugins/with-app-intents"` to
  `plugins`), `apps/mobile/CHANGELOG.md`.
- No dependency changes.

## Risks / notes

- **pbxproj vs. synchronized file groups:** newer Xcode templates can use
  `PBXFileSystemSynchronizedRootGroup`, where files dropped into the project
  folder auto-include — which could make `addSourceFile` redundant or conflicting.
  The plan verifies at prebuild and adjusts the plugin (skip the `addSourceFile`
  stage if the template auto-includes). This is the main implementation risk.
- **Border deep-link URL:** the scheme-root vs. explicit-path form for the index
  tab is confirmed on device; the plan carries a fallback.
- **Phrases:** the `\(.applicationName)` macro is mandatory in every phrase.
