# iOS Shortcuts / Siri (App Intents) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Dorkroom's four pages to Siri, Spotlight, and the Shortcuts app via App Intents, and stub one functional calculator intent to seed Phase 2b.

**Architecture:** A self-contained local Expo config plugin (`apps/mobile/plugins/with-app-intents/`) injects Swift App Intents into the iOS app target at prebuild — `withDangerousMod` copies `swift/*.swift` into `ios/AppIntents/`, then `withXcodeProject` adds them to the app target's compile sources. Open-page intents open the existing `dorkroom://` deep links, so navigation reuses expo-router's deep-linking with no new JS.

**Tech Stack:** Expo SDK 54, Expo Router 6, `@expo/config-plugins`, Apple App Intents (Swift, iOS 16+ APIs), iOS 26 deployment target.

## Global Constraints

- Package manager is **`bun`** (`bun run …`). No new npm dependency is added in this plan.
- **Swift files live at the iOS project root** (`ios/AppIntents/`), injected by the plugin — never inside an Expo module (breaks `AppShortcutsProvider` auto-registration).
- **Every Siri phrase must include the `\(.applicationName)` macro** or the shortcut is dropped at build-time intent indexing.
- **No entitlement and no `NSSiriUsageDescription`** are added — App Shortcuts (iOS 16+) need neither.
- Deployment target is **iOS 26**, so `@available` annotations are unnecessary.
- The config plugin must be **idempotent** — re-running prebuild must not create duplicate source build refs.
- **No Swift/native or config-plugin unit tests** — consistent with the app convention; native behavior is verified by a real build + on-device test (see Integration Verification), not mocked. Do not invent such tests.
- `apps/mobile/package.json` version is already today's CalVer — **do not bump it**; add a `apps/mobile/CHANGELOG.md` entry only.
- `apps/mobile/ios/` is **not** git-tracked; prebuild output is never committed.

---

### Task 1: Swift App Intents sources

**Files:**
- Create: `apps/mobile/plugins/with-app-intents/swift/OpenPageIntent.swift`
- Create: `apps/mobile/plugins/with-app-intents/swift/DorkroomShortcuts.swift`
- Create: `apps/mobile/plugins/with-app-intents/swift/CalculateReciprocityIntent.swift`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: three Swift files that Task 2's plugin copies and compiles. The plugin depends on these **exact filenames**: `OpenPageIntent.swift`, `DorkroomShortcuts.swift`, `CalculateReciprocityIntent.swift`. `OpenPageIntent(page:)` is instantiated by `DorkroomShortcuts`. The open-page deep links are `dorkroom://meter`, `dorkroom://` (border/index), `dorkroom://exposure`, `dorkroom://reciprocity`.

There is no automated test for Swift here (it compiles only in a real iOS build — see Integration Verification). Author the three files exactly as below.

- [ ] **Step 1: Create `OpenPageIntent.swift`**

`apps/mobile/plugins/with-app-intents/swift/OpenPageIntent.swift`:

```swift
import AppIntents
import UIKit

/// The Dorkroom pages reachable from an App Shortcut.
enum DorkroomPage: String, AppEnum {
    case meter
    case border
    case exposure
    case reciprocity

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Dorkroom Page"

    static var caseDisplayRepresentations: [DorkroomPage: DisplayRepresentation] = [
        .meter: "Light Meter",
        .border: "Border",
        .exposure: "Exposure",
        .reciprocity: "Reciprocity",
    ]

    /// The `dorkroom://` deep link that opens this page. expo-router routes it.
    var url: URL {
        switch self {
        case .meter: return URL(string: "dorkroom://meter")!
        case .border: return URL(string: "dorkroom://")!
        case .exposure: return URL(string: "dorkroom://exposure")!
        case .reciprocity: return URL(string: "dorkroom://reciprocity")!
        }
    }
}

/// Opens the app on a specific page. Backs every open-page App Shortcut.
struct OpenPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Dorkroom Page"
    static var openAppWhenRun = true

    @Parameter(title: "Page")
    var page: DorkroomPage

    init() {}

    init(page: DorkroomPage) {
        self.page = page
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(page.url)
        return .result()
    }
}
```

- [ ] **Step 2: Create `DorkroomShortcuts.swift`**

`apps/mobile/plugins/with-app-intents/swift/DorkroomShortcuts.swift`:

```swift
import AppIntents

/// Auto-registers the open-page App Shortcuts with Siri, Spotlight, and the
/// Shortcuts app. Every phrase includes `\(.applicationName)` (required, or the
/// shortcut is dropped at build-time indexing).
struct DorkroomShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenPageIntent(page: .meter),
            phrases: [
                "Open Light Meter in \(.applicationName)",
                "Open \(.applicationName) Light Meter",
            ],
            shortTitle: "Light Meter",
            systemImageName: "camera.aperture"
        )
        AppShortcut(
            intent: OpenPageIntent(page: .border),
            phrases: [
                "Open Border in \(.applicationName)",
                "Open \(.applicationName) Border calculator",
            ],
            shortTitle: "Border",
            systemImageName: "square.dashed"
        )
        AppShortcut(
            intent: OpenPageIntent(page: .exposure),
            phrases: [
                "Open Exposure in \(.applicationName)",
                "Open \(.applicationName) Exposure calculator",
            ],
            shortTitle: "Exposure",
            systemImageName: "plusminus"
        )
        AppShortcut(
            intent: OpenPageIntent(page: .reciprocity),
            phrases: [
                "Open Reciprocity in \(.applicationName)",
                "Open \(.applicationName) Reciprocity calculator",
            ],
            shortTitle: "Reciprocity",
            systemImageName: "timer"
        )
    }
}
```

- [ ] **Step 3: Create `CalculateReciprocityIntent.swift` (stub)**

`apps/mobile/plugins/with-app-intents/swift/CalculateReciprocityIntent.swift`:

```swift
import AppIntents

// Phase 2b seed: a functional calculator intent. This is a STUB — it returns a
// "coming soon" dialog. Wiring it to the real reciprocity math in @dorkroom/logic
// requires sharing data with the JS layer (App Group + a native bridge), which is
// intentionally out of scope for Phase 2. It is deliberately NOT listed in
// DorkroomShortcuts, so it is discoverable as an action in the Shortcuts app but
// is not advertised as a Siri phrase.
struct CalculateReciprocityIntent: AppIntent {
    static var title: LocalizedStringResource = "Calculate Reciprocity"
    static var description = IntentDescription(
        "Adjust a metered exposure time for reciprocity failure. (Coming soon.)"
    )

    @Parameter(title: "Metered seconds")
    var meteredSeconds: Double

    func perform() async throws -> some IntentResult & ProvidesDialog {
        return .result(dialog: "Calculator Shortcuts are coming soon to Dorkroom.")
    }
}
```

- [ ] **Step 4: Verify the three files exist**

Run:

```bash
ls apps/mobile/plugins/with-app-intents/swift/
```

Expected output (exactly these three):

```
CalculateReciprocityIntent.swift
DorkroomShortcuts.swift
OpenPageIntent.swift
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/plugins/with-app-intents/swift/
git commit -m "feat(mobile): add iOS App Intents Swift sources"
```

---

### Task 2: Config plugin + register in `app.json`

**Files:**
- Create: `apps/mobile/plugins/with-app-intents/index.js`
- Modify: `apps/mobile/app.json` (add the plugin to `plugins`)

**Interfaces:**
- Consumes: the three Swift filenames from Task 1 (listed in `SWIFT_FILES`).
- Produces: a default-exported Expo config plugin `withAppIntents(config)` that, at prebuild, copies the Swift files to `ios/AppIntents/` and adds them to the app target's sources. Registered in `app.json` as `"./plugins/with-app-intents"`.

- [ ] **Step 1: Create the config plugin `index.js`**

`apps/mobile/plugins/with-app-intents/index.js`:

```js
const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// The Swift App Intents sources (in ./swift), copied into ios/AppIntents/ and
// compiled into the app target. Order is irrelevant; all go to the same target.
const SWIFT_FILES = [
  'OpenPageIntent.swift',
  'DorkroomShortcuts.swift',
  'CalculateReciprocityIntent.swift',
];

const GROUP = 'AppIntents';

// Stage 1 — copy the Swift files into ios/AppIntents/ at prebuild.
function withAppIntentsFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const srcDir = path.join(__dirname, 'swift');
      const dstDir = path.join(cfg.modRequest.platformProjectRoot, GROUP);
      fs.mkdirSync(dstDir, { recursive: true });
      for (const file of SWIFT_FILES) {
        fs.copyFileSync(path.join(srcDir, file), path.join(dstDir, file));
      }
      return cfg;
    },
  ]);
}

// Stage 2 — add the copied files to the app target's compile sources.
// Idempotent: a re-run of prebuild must not add duplicate references.
function withAppIntentsBuildPhase(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const target = project.getFirstTarget().uuid;

    if (!project.pbxGroupByName(GROUP)) {
      project.addPbxGroup([], GROUP, GROUP);
    }

    for (const file of SWIFT_FILES) {
      const relPath = `${GROUP}/${file}`;
      if (project.hasFile(relPath)) {
        continue; // already referenced — keep prebuild idempotent
      }
      project.addSourceFile(relPath, { target }, GROUP);
    }
    return cfg;
  });
}

module.exports = function withAppIntents(config) {
  config = withAppIntentsFiles(config);
  config = withAppIntentsBuildPhase(config);
  return config;
};
```

- [ ] **Step 2: Register the plugin in `app.json`**

In `apps/mobile/app.json`, the `plugins` array currently ends with the
`expo-quick-actions` entry. Add `"./plugins/with-app-intents"` as the final
element. The array should read:

```json
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "26.0"
          }
        }
      ],
      [
        "expo-quick-actions",
        {
          "iosActions": [
            {
              "id": "meter",
              "title": "Light Meter",
              "icon": "symbol:camera.aperture",
              "params": { "href": "/meter" }
            },
            {
              "id": "border",
              "title": "Border",
              "icon": "symbol:square.dashed",
              "params": { "href": "/" }
            },
            {
              "id": "exposure",
              "title": "Exposure",
              "icon": "symbol:plusminus",
              "params": { "href": "/exposure" }
            },
            {
              "id": "reciprocity",
              "title": "Reciprocity",
              "icon": "symbol:timer",
              "params": { "href": "/reciprocity" }
            }
          ]
        }
      ],
      "./plugins/with-app-intents"
    ],
```

- [ ] **Step 3: Verify `app.json` is valid JSON**

Run:

```bash
cd apps/mobile && node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('app.json OK')"
```

Expected output:

```
app.json OK
```

- [ ] **Step 4: Smoke-test that the plugin module loads and is a function**

Run:

```bash
cd apps/mobile && node -e "const p=require('./plugins/with-app-intents'); if(typeof p!=='function'){throw new Error('plugin export is not a function')} console.log('plugin loads OK')"
```

Expected output:

```
plugin loads OK
```

(This catches syntax errors and a bad `@expo/config-plugins` require without running a full prebuild.)

- [ ] **Step 5: Lint**

Run:

```bash
cd apps/mobile && bun run lint
```

Expected: exits 0 (no new oxlint/biome findings for `index.js`).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/plugins/with-app-intents/index.js apps/mobile/app.json
git commit -m "feat(mobile): config plugin to wire App Intents into the iOS target"
```

> Note: do **not** run `expo prebuild` in this task — that is the controller-run Integration Verification step, which regenerates the untracked `ios/` directory.

---

### Task 3: Changelog entry

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`

**Interfaces:**
- Consumes: nothing. Produces: nothing (documentation only).

- [ ] **Step 1: Add the entry under the current version's `### Added` section**

In `apps/mobile/CHANGELOG.md`, under `## [2026.06.22]` → `### Added`, append this
bullet as the last item of that list:

```markdown
- iOS Siri / Spotlight / Shortcuts-app support (App Intents): "Open Light Meter
  in Dorkroom" and the equivalent for Border, Exposure, and Reciprocity now work
  by voice, in Spotlight, and as Shortcuts-app actions. A "Calculate Reciprocity"
  action is present as a placeholder ("coming soon") ahead of functional
  calculator intents.
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/CHANGELOG.md
git commit -m "docs(mobile): changelog for iOS App Intents"
```

---

## Integration Verification (controller + user — not a subagent task)

Swift compiles and App Shortcuts register only in a real build, and the main
implementation risk (pbxproj wiring vs. Xcode "synchronized" file groups) can
only be confirmed by an actual prebuild. Run this after Task 3:

1. **Prebuild** (regenerates the untracked `ios/`):
   ```bash
   cd apps/mobile && bunx expo prebuild --clean --platform ios
   ```
   Confirm `ios/AppIntents/` contains the three `.swift` files and that
   `ios/Dorkroom.xcodeproj/project.pbxproj` references them (grep for
   `OpenPageIntent.swift`). If the template uses synchronized file groups and the
   files are auto-included but **not** via `addSourceFile`, adjust the plugin
   (the file-copy stage may suffice on its own); if `addSourceFile` double-adds,
   the `hasFile` guard should prevent it — verify no duplicate `PBXBuildFile`.
2. **Development build + install** (per `apps/mobile/CLAUDE.md` workflow #2):
   ```bash
   source ~/.app-store-connect/eas-asc.env
   cd apps/mobile
   eas build --local --profile development --platform ios --non-interactive \
     --output /tmp/dorkroom-dev.ipa
   DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
   xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-dev.ipa
   xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
   ```
   A successful build confirms the Swift compiled.
3. **On-device (user):**
   - **Spotlight:** search "Light Meter" → a Dorkroom shortcut appears → opens the Meter tab.
   - **Siri:** "Open Light Meter in Dorkroom" → opens the Meter tab. Repeat per page.
   - **Shortcuts app:** the four open-page actions appear, plus "Calculate Reciprocity", which returns the "coming soon" dialog.
   - Confirm the **border** action lands on the Border (index) tab; if `dorkroom://` does not, change `DorkroomPage.border.url` to an explicit path and rebuild.

---

## Self-Review

- **Spec coverage:** config plugin 2-stage (Task 2) ✓; `OpenPageIntent` + `DorkroomPage` (Task 1 Step 1) ✓; `DorkroomShortcuts` 4 shortcuts with `\(.applicationName)` phrases + SF Symbols (Task 1 Step 2) ✓; stub `CalculateReciprocityIntent` returning a dialog, no Siri phrase (Task 1 Step 3) ✓; `app.json` registration (Task 2 Step 2) ✓; changelog (Task 3) ✓; no deps / no entitlements ✓; verification = lint/smoke + prebuild + dev build + device (Task 2 + Integration Verification) ✓. Phase 2b items are out of scope per spec — no task, intentional.
- **Placeholder scan:** every code step shows complete file content or an exact command + expected output; no TBD/TODO.
- **Type/name consistency:** `SWIFT_FILES` in Task 2 lists the exact three filenames created in Task 1. `OpenPageIntent(page:)` is defined in Task 1 Step 1 and used in Task 1 Step 2. The deep-link URLs (`dorkroom://meter`, `dorkroom://`, `dorkroom://exposure`, `dorkroom://reciprocity`) match the spec's mapping table. The `GROUP`/`AppIntents` directory name is consistent between the copy stage and the build-phase stage.
