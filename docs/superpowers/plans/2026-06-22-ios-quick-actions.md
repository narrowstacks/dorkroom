# iOS Home Screen Quick Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add home-screen quick actions (long-press the iOS app icon) that deep-link to the Light Meter, Border, Exposure, and Reciprocity pages.

**Architecture:** Declare four static iOS quick actions via the `expo-quick-actions` config plugin in `app.json` (so they appear before first launch), and call the library's `useQuickActionRouting()` hook in the root layout so a tapped action navigates Expo Router to that action's `params.href`. No new routing or scheme work — the `dorkroom://` scheme and tab routes already exist.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native 0.81 (New Architecture), `expo-quick-actions@^6.0.2`, iOS 26 deployment target.

## Global Constraints

- Package manager is **`bun`** (`bun add`, `bun run …`). The repo uses Turborepo + workspaces.
- `bunfig.toml` enforces a **7-day `minimumReleaseAge`** on installs. `expo-quick-actions@6.0.2` was published 2026-05-27, so it clears the gate; no override flag needed.
- **Never use `any`** — use specific types or `unknown`.
- **Never import internal package paths** — use `@dorkroom/ui`, `@dorkroom/logic`, `@dorkroom/api` (not relevant to this plan's files, but holds).
- Mobile app uses its **own changelog** (`apps/mobile/CHANGELOG.md`) and independent CalVer. `apps/mobile/package.json` is already `2026.06.22` (today) — **do not bump it**; only add a changelog entry.
- Quick actions **cannot be exercised by the Vitest unit suite** — they require a native build. Verification is typecheck/lint + `expo prebuild` + manual device/simulator check. Do **not** invent JS unit tests for native behavior.
- iOS shows a **maximum of 4** quick actions. The list is exactly four, ordered Light Meter → Border → Exposure → Reciprocity.

---

### Task 1: Install `expo-quick-actions` and declare the four static iOS actions

**Files:**
- Modify: `apps/mobile/package.json` (adds the dependency — written by `bun add`)
- Modify: `apps/mobile/app.json` (add plugin entry with `iosActions`)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a configured `expo-quick-actions` plugin whose four actions each carry `params.href` — the route strings `"/meter"`, `"/"`, `"/exposure"`, `"/reciprocity"` that Task 2's hook will navigate to. The action `id`s are `meter`, `border`, `exposure`, `reciprocity`.

- [ ] **Step 1: Install the dependency**

Run (from the mobile app directory):

```bash
cd apps/mobile && bun add expo-quick-actions@^6.0.2
```

Expected: `package.json` gains `"expo-quick-actions": "^6.0.2"` under `dependencies`, and the install completes without a `minimumReleaseAge` error.

- [ ] **Step 2: Verify the version landed**

Run:

```bash
cd apps/mobile && grep expo-quick-actions package.json
```

Expected output (a line like):

```
    "expo-quick-actions": "^6.0.2",
```

- [ ] **Step 3: Add the config plugin with the four actions to `app.json`**

In `apps/mobile/app.json`, replace the existing `plugins` array:

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
      ]
    ],
```

with this (adds the `expo-quick-actions` entry after `expo-build-properties`):

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
      ]
    ],
```

- [ ] **Step 4: Verify `app.json` is still valid JSON**

Run:

```bash
cd apps/mobile && node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('app.json OK')"
```

Expected output:

```
app.json OK
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json
git commit -m "feat(mobile): declare iOS home screen quick actions"
```

---

### Task 2: Wire `useQuickActionRouting()` into the root layout and regenerate native config

**Files:**
- Modify: `apps/mobile/app/_layout.tsx` (import + hook call in `RootLayout`)

**Interfaces:**
- Consumes: the four actions' `params.href` route strings declared in Task 1.
- Produces: runtime handling — tapping a quick action navigates Expo Router to `params.href`. No exported symbols.

- [ ] **Step 1: Add the import**

In `apps/mobile/app/_layout.tsx`, add this import alongside the other `expo-*` imports (e.g. right after the `expo-status-bar` import on line 9):

```tsx
import { useQuickActionRouting } from 'expo-quick-actions/router';
```

- [ ] **Step 2: Call the hook inside `RootLayout`**

In the same file, change the `RootLayout` function so the hook runs before the `return`. Replace:

```tsx
export default function RootLayout() {
  return (
    <SafeAreaProvider>
```

with:

```tsx
export default function RootLayout() {
  // Route home-screen quick action taps to the action's `params.href`.
  useQuickActionRouting();

  return (
    <SafeAreaProvider>
```

- [ ] **Step 3: Typecheck**

Run:

```bash
cd apps/mobile && bun run typecheck
```

Expected: exits 0 with no errors. (Confirms `expo-quick-actions/router` resolves and the hook is typed.)

- [ ] **Step 4: Lint**

Run:

```bash
cd apps/mobile && bun run lint
```

Expected: exits 0 (no new oxlint/biome findings).

- [ ] **Step 5: Regenerate native iOS config and confirm the actions are emitted**

Run:

```bash
cd apps/mobile && bun run native:prebuild
```

Expected: prebuild completes without error. Then confirm the plugin wrote the actions into the generated Info.plist:

```bash
cd apps/mobile && grep -A2 UIApplicationShortcutItemType ios/Dorkroom/Info.plist | head
```

Expected: the output contains the action types (e.g. `meter`, `border`, `exposure`, `reciprocity`) under `UIApplicationShortcutItems`. If `UIApplicationShortcutItems` is absent, the plugin did not apply — stop and recheck Task 1 Step 3.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): route quick action taps via useQuickActionRouting"
```

> Note: `bun run native:prebuild` regenerates files under `apps/mobile/ios/`. Stage those only if the repo already tracks the `ios/` directory (check `git status`); if `ios/` is gitignored, leave it untracked. Do not hand-edit generated files.

---

### Task 3: Add the changelog entry

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (documentation only).

- [ ] **Step 1: Add the entry under the current version's `### Added` section**

In `apps/mobile/CHANGELOG.md`, under the existing `## [2026.06.22]` → `### Added` list, append this bullet as the last item of that list:

```markdown
- iOS home screen quick actions: long-pressing the app icon now shows shortcuts
  that jump straight to the Light Meter, Border, Exposure, and Reciprocity pages.
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/CHANGELOG.md
git commit -m "docs(mobile): changelog for iOS quick actions"
```

---

## Manual Verification (after all tasks)

These steps need a real build and a human/simulator — they are not automated:

1. Build & run the app on a device or simulator (`bun run ios` from `apps/mobile`, or an EAS build).
2. Long-press the Dorkroom home-screen icon.
3. Confirm four actions appear, top-to-bottom: **Light Meter, Border, Exposure, Reciprocity**, each with the expected SF Symbol icon.
4. Tap each action in turn and confirm it launches the app on the correct tab (Light Meter → Meter tab, Border → Border/index tab, Exposure → Exposure tab, Reciprocity → Reciprocity tab).

---

## Self-Review

- **Spec coverage:** Library choice + static config (Task 1) ✓; four actions with exact icons/hrefs (Task 1 Step 3) ✓; `useQuickActionRouting()` in `_layout.tsx` (Task 2) ✓; dependency added (Task 1 Step 1) ✓; changelog (Task 3) ✓; verification = typecheck/lint/prebuild + manual (Task 2 + Manual Verification) ✓. Phase 2 (App Intents) is out of scope per spec — no task, intentionally.
- **Placeholder scan:** No TBD/TODO; every code step shows the full code or exact command + expected output.
- **Type consistency:** Action `id`s (`meter`/`border`/`exposure`/`reciprocity`) and `href`s (`/meter`, `/`, `/exposure`, `/reciprocity`) are identical between Task 1's declaration and Task 2's consumer description. `useQuickActionRouting` import path (`expo-quick-actions/router`) matches the verified library API.
