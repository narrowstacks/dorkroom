# Dedicated "Open Light Meter" Intent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated, parameter-free `OpenLightMeterIntent` and surface it as the first App Shortcut, so the light meter is the clean one-tap pick for the Action Button / Siri / Spotlight.

**Architecture:** A new Swift `AppIntent` opens the existing `dorkroom://meter` deep link; it is added as the first entry in the existing `DorkroomShortcuts` provider and wired through the existing `with-app-intents` config plugin (one more filename in `SWIFT_FILES`). Additive — the existing meter open-page shortcut stays.

**Tech Stack:** Apple App Intents (Swift), Expo config plugin (`@expo/config-plugins`), Expo SDK 54, iOS 26 target.

## Global Constraints

- Package manager is **`bun`**. No new npm dependency.
- **Additive:** do not remove or change the existing `OpenPageIntent` / `DorkroomPage` / the four existing `AppShortcut` entries.
- The new `AppShortcut` is the **first** entry in `DorkroomShortcuts.appShortcuts`.
- Its Siri phrases must be **distinct** from the existing meter shortcut's ("Open Light Meter in Dorkroom" / "Open Dorkroom Light Meter") and **every phrase must include `\(.applicationName)`**.
- Deployment target iOS 26 → no `@available` annotations.
- The config plugin stays idempotent; `SWIFT_FILES` simply gains the new filename.
- No Swift/config unit tests by design — verified by build + on-device test (Integration Verification). Do not invent such tests.
- Do not bump `apps/mobile/package.json` version; add a `apps/mobile/CHANGELOG.md` entry only.
- `apps/mobile/ios/` is not git-tracked.

---

### Task 1: Dedicated `OpenLightMeterIntent` + register it

**Files:**
- Create: `apps/mobile/plugins/with-app-intents/swift/OpenLightMeterIntent.swift`
- Modify: `apps/mobile/plugins/with-app-intents/swift/DorkroomShortcuts.swift`
- Modify: `apps/mobile/plugins/with-app-intents/index.js`

**Interfaces:**
- Consumes: the existing `dorkroom://meter` deep link and the existing `DorkroomShortcuts` provider / `with-app-intents` plugin.
- Produces: `OpenLightMeterIntent` (parameter-free `AppIntent`), surfaced as the first `AppShortcut`. The plugin's `SWIFT_FILES` now lists four files.

- [ ] **Step 1: Create `OpenLightMeterIntent.swift`**

`apps/mobile/plugins/with-app-intents/swift/OpenLightMeterIntent.swift`:

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

- [ ] **Step 2: Add the App Shortcut as the first entry in `DorkroomShortcuts.swift`**

In `apps/mobile/plugins/with-app-intents/swift/DorkroomShortcuts.swift`, replace:

```swift
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenPageIntent(page: .meter),
```

with (inserts the dedicated shortcut as the first entry, before the existing meter open-page shortcut):

```swift
    static var appShortcuts: [AppShortcut] {
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
        AppShortcut(
            intent: OpenPageIntent(page: .meter),
```

(The rest of the file — the four existing `AppShortcut` entries — is unchanged.)

- [ ] **Step 3: Add the new file to `SWIFT_FILES` in the plugin**

In `apps/mobile/plugins/with-app-intents/index.js`, replace:

```js
const SWIFT_FILES = [
  'OpenPageIntent.swift',
  'DorkroomShortcuts.swift',
  'CalculateReciprocityIntent.swift',
];
```

with:

```js
const SWIFT_FILES = [
  'OpenPageIntent.swift',
  'OpenLightMeterIntent.swift',
  'DorkroomShortcuts.swift',
  'CalculateReciprocityIntent.swift',
];
```

- [ ] **Step 4: Smoke-test the plugin still loads and lint passes**

Run:

```bash
cd apps/mobile && node -e "const p=require('./plugins/with-app-intents'); if(typeof p!=='function'){throw new Error('plugin export is not a function')} console.log('plugin loads OK')" && bun run lint
```

Expected: prints `plugin loads OK`, then lint exits 0 with no new findings.

- [ ] **Step 5: Verify the four Swift files are present**

Run:

```bash
ls apps/mobile/plugins/with-app-intents/swift/
```

Expected (four files):

```
CalculateReciprocityIntent.swift
DorkroomShortcuts.swift
OpenLightMeterIntent.swift
OpenPageIntent.swift
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/plugins/with-app-intents/
git commit -m "feat(mobile): dedicated Open Light Meter App Intent"
```

> Do **not** run `expo prebuild` here — that is the controller-run Integration Verification step.

---

### Task 2: Changelog entry

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`

**Interfaces:**
- Consumes: nothing. Produces: nothing (documentation only).

- [ ] **Step 1: Add the entry under the current version's `### Added` section**

In `apps/mobile/CHANGELOG.md`, under `## [2026.06.22]` → `### Added`, append this
bullet as the last item of that list (after the App Intents bullet added in the
previous phase):

```markdown
- A dedicated "Open Light Meter" Shortcuts/Siri action (separate from the generic
  open-page shortcuts) so the light meter can be assigned to the iPhone Action
  Button for one-press access.
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/CHANGELOG.md
git commit -m "docs(mobile): changelog for dedicated light meter shortcut"
```

---

## Integration Verification (controller + user — not a subagent task)

Run after Task 2 (mirrors the Phase 2 verification):

1. **Prebuild** — confirm the plugin now injects **four** Swift files and stays idempotent:
   ```bash
   cd apps/mobile && bunx expo prebuild --platform ios --clean --no-install
   ls ios/AppIntents/   # expect 4 .swift files incl OpenLightMeterIntent.swift
   for f in OpenPageIntent OpenLightMeterIntent DorkroomShortcuts CalculateReciprocityIntent; do
     echo "$f: $(grep -cE "PBXBuildFile.*$f\\.swift" ios/*.xcodeproj/project.pbxproj)"
   done   # each must be 1
   ```
2. **Development build + install** (per `apps/mobile/CLAUDE.md` workflow #2):
   ```bash
   source ~/.app-store-connect/eas-asc.env
   cd apps/mobile
   eas build --local --profile development --platform ios --non-interactive --output /tmp/dorkroom-dev.ipa
   DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
   xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-dev.ipa
   xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
   ```
   A successful build confirms the new Swift compiled; confirm `Metadata.appintents/` is present in the IPA.
3. **On-device (user):**
   - Settings → Action Button → Shortcut → **Open Light Meter**; press the Action Button → app opens on the Meter tab.
   - "Open Light Meter" also appears in Spotlight / Siri / the Shortcuts app as a distinct action.
   - The dedicated Siri phrases ("Open the light meter in Dorkroom", etc.) work and don't clash with the existing meter shortcut.

---

## Self-Review

- **Spec coverage:** new parameter-free `OpenLightMeterIntent` opening `dorkroom://meter` (Task 1 Step 1) ✓; first `AppShortcut` with distinct `\(.applicationName)` phrases (Task 1 Step 2) ✓; wired through plugin `SWIFT_FILES` (Task 1 Step 3) ✓; additive — existing entries untouched (Task 1 Step 2 note) ✓; changelog (Task 2) ✓; verification = lint/smoke + prebuild(×4, idempotent) + dev build + device (Task 1 + Integration Verification) ✓.
- **Placeholder scan:** every code step shows full file content or an exact command + expected output; no TBD/TODO.
- **Type/name consistency:** `OpenLightMeterIntent` (Step 1) is the exact type instantiated in `DorkroomShortcuts` (Step 2) and the filename `OpenLightMeterIntent.swift` matches the `SWIFT_FILES` entry (Step 3) and the `ls`/grep checks. The deep link `dorkroom://meter` matches the existing meter mapping. Phrases differ from the existing meter shortcut's, per the constraint.
