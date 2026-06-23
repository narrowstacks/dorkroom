# Dedicated "Open Light Meter" App Intent — Design

**Date:** 2026-06-22
**App:** `apps/mobile` (Expo / React Native, iOS)
**Status:** Approved
**Relationship:** Phase 3, a small increment on the Phase 2 App Intents work.
Continues on `feat/ios-quick-actions` (combined PR).

## Goal

Add a dedicated, parameter-free **"Open Light Meter"** App Intent so the light
meter is the obvious one-tap pick for the iPhone **Action Button** (and for
Control Center / a single Siri or Spotlight shortcut), rather than being one of
four options behind the generic `OpenPageIntent` / `DorkroomPage` parameter.

## Scope

**In scope:**

- A new parameter-free `OpenLightMeterIntent` (Swift), opening `dorkroom://meter`.
- A new `AppShortcut` for it, listed **first** in `DorkroomShortcuts` (most
  prominent), with Siri phrases distinct from the existing meter open-page
  shortcut.
- Wire the new Swift file through the existing config plugin.

**Decided:**

- **Additive** — the existing meter entry on `OpenPageIntent`/`DorkroomPage` stays.
  The light meter is intentionally reachable two ways; the dedicated intent is the
  prominent, cleanly-named one. (User chose this over replace-and-dedupe.)

**Out of scope:**

- Claiming the Action Button programmatically (not possible — the user binds it in
  Settings). Control Center widget/control. Any change to the other three pages.

## Approach

The light meter currently surfaces as one `DorkroomPage` case on the generic
`OpenPageIntent` (title "Open Dorkroom Page"). For the Action Button's Shortcut
picker and the Shortcuts actions list, a discrete, parameter-free intent named
"Open Light Meter" reads far better than a generic intent plus a parameter.

Add `OpenLightMeterIntent` alongside the existing intents and register it as the
first `AppShortcut`. It reuses the proven `dorkroom://meter` deep link, so no new
navigation code. The new Swift file is injected by the **existing**
`with-app-intents` config plugin — only its `SWIFT_FILES` list grows by one.

## Files touched

- **Create:** `apps/mobile/plugins/with-app-intents/swift/OpenLightMeterIntent.swift`
- **Modify:** `apps/mobile/plugins/with-app-intents/swift/DorkroomShortcuts.swift`
  (add the `AppShortcut`, first), `apps/mobile/plugins/with-app-intents/index.js`
  (add the filename to `SWIFT_FILES`), `apps/mobile/CHANGELOG.md`.

## The intent

```swift
import AppIntents
import UIKit

/// A dedicated, parameter-free intent to open the light meter — the natural pick
/// for the Action Button, Control Center, or a one-tap Siri/Spotlight shortcut.
struct OpenLightMeterIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Light Meter"
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(URL(string: "dorkroom://meter")!)
        return .result()
    }
}
```

## The App Shortcut (first entry in `DorkroomShortcuts.appShortcuts`)

```swift
AppShortcut(
    intent: OpenLightMeterIntent(),
    phrases: [
        "Open the light meter in \(.applicationName)",
        "Start \(.applicationName) light meter",
        "Meter the light with \(.applicationName)",
    ],
    shortTitle: "Light Meter",
    systemImageName: "camera.aperture"
)
```

Phrases are deliberately distinct from the existing meter open-page shortcut
("Open Light Meter in Dorkroom" / "Open Dorkroom Light Meter") to avoid phrase
collisions between the two meter shortcuts. Every phrase includes the required
`\(.applicationName)` macro.

## Data flow

Action Button / Siri / Spotlight / Shortcuts → `OpenLightMeterIntent.perform()`
→ opens `dorkroom://meter` → expo-router navigates to the Meter tab. Identical to
the existing meter path; no new JS.

## Error handling

The deep-link URL is a static literal (safe); `perform()` always returns
`.result()`. `openAppWhenRun = true` foregrounds the app.

## Testing / verification

- **JS/plugin:** `bun run typecheck` + `bun run lint` (the `SWIFT_FILES` edit).
- **Prebuild:** `expo prebuild` copies and references **four** Swift files now
  (idempotent — counts stay at 1 per file on re-run).
- **Dev build:** compiles; `Metadata.appintents/` present in the built app.
- **On-device (user):** assign Settings → Action Button → Shortcut → "Open Light
  Meter"; a press opens the Meter tab. The dedicated "Open Light Meter" also
  appears in Spotlight / Siri / the Shortcuts app. (Two meter entries in Spotlight
  is expected per the additive choice.)
- No Swift/native unit tests — consistent with the app convention.

## Risks / notes

- **Phrase collision** between the two meter shortcuts — mitigated by the distinct
  phrase set above.
- **Duplicate meter entries** in Spotlight / Shortcuts — accepted (additive choice).
