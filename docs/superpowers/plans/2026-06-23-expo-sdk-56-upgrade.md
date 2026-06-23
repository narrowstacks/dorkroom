# Expo SDK 54 → 56 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `apps/mobile` from Expo SDK 54 (RN 0.81.5 / React 19.1.0) to Expo SDK 56 (RN 0.85 / React 19.2), incrementally through SDK 55, with each SDK landing as its own verified, on-device-tested commit.

**Architecture:** Two sequential phases — **Phase A: 54 → 55**, **Phase B: 55 → 56** — exactly as Expo recommends (one SDK at a time, so a breakage is attributable to a single jump). Within each phase: bump `expo` + run `expo install --fix`, align the version-pinned native deps, fix the SDK-specific code breakages, sync the Metro React pin, then rebuild natively and verify on device. The risky Nitro chain (MMKV 4.x + VisionCamera, both via `react-native-nitro-modules`) is proven out in a **Phase 0 spike before any real work** so we don't sink time into an upgrade that can't compile its camera.

**Tech Stack:** Expo SDK 55/56, React Native 0.83→0.85, React 19.2, expo-router v6→v7, NativeWind v4 (Tailwind v3), react-native-reanimated 4.x + worklets, react-native-nitro-modules (VisionCamera + MMKV), EAS local builds, oxlint + Biome, tsgo typecheck.

## Global Constraints

Copied verbatim from the repo's rules — every task implicitly includes these:

- **iOS-only, dark-only, New Architecture, targets iOS 26.** `app.json` keeps `newArchEnabled: true`, `userInterfaceStyle: "dark"`, `expo-build-properties` `ios.deploymentTarget: "26.0"`. Do not add light-mode branches. (SDK 56 min is iOS 16.4 / Xcode 26.4 — we are above the floor; ensure local Xcode ≥ 26.4.)
- **Node ≥ 20.19.4** (SDK 56 floor). Current env: v22.22.3 — fine; verify on any CI/EAS image.
- **Never use `any`** — specific types or `unknown`.
- **Never import internal package paths** — only `@dorkroom/ui`, `@dorkroom/logic`, `@dorkroom/api`.
- **NativeWind v4 with Tailwind v3 syntax** — the `postinstall`/`eas-build-post-install` symlink (`scripts/link-nativewind-tailwind.mjs`) must keep working; do not bump mobile to Tailwind v4.
- **MMKV needs `react-native-nitro-modules` or the app segfaults** on first use. Keep them version-compatible and verify on device, never with mocked tests.
- **Testing reality:** only **pure** modules are unit-tested (geometry/format/layout/EV math in `@dorkroom/logic`). Camera, native modules, navigation, config plugins, quick actions, App Intents are **device-verified, not unit-tested**. Do **not** write fake tests that mock native behavior. For native tasks, the "test" is typecheck + lint + native build + an on-device smoke test.
- **Version alignment (SDK 55+):** every `expo-*` package uses the SDK major (e.g. `expo-blur@^56.0.0` for SDK 56). Let `expo install --fix` set these; do not hand-pin `expo-*` ranges.
- **Dependency freshness gate:** `bunfig.toml` has `minimumReleaseAge: 604800` (7 days). If a needed release is <7 days old, install with `bun install --minimum-release-age 0` (note it in the commit body) rather than editing the global gate.
- **CalVer + changelog:** `apps/mobile/package.json` version → today's date on the day it lands; add an entry to **`apps/mobile/CHANGELOG.md`** (mobile has its own changelog, separate from the root web-app one). Do not touch the root `CHANGELOG.md`.
- **Verification gate (run from `apps/mobile`):** `bun run lint` (oxlint + Biome formatting), `bun run typecheck` (tsgo, strict), `bun run test` (vitest, pure modules). Plus React Doctor from repo root must stay 100/100: `npx react-doctor@latest --verbose` — `@dorkroom/mobile` must remain 100.
- **Build/verify commands** (full setup in `apps/mobile/README.md`): native dev build is
  `source ~/.app-store-connect/eas-asc.env && eas build --local --profile development --platform ios --non-interactive --output /tmp/dorkroom-dev.ipa`,
  then install/launch via `devicectl` on the connected iPhone. Apple 2FA is YubiKey-only, so EAS Apple auth uses the App Store Connect API key (`.p8`) sourced from that env file.

**Smoke-test checklist (the "on-device verification" referenced by native tasks):**
1. App launches past the splash without a redbox.
2. **Persistence (MMKV):** change a setting / calculator input, force-quit, relaunch → value persisted.
3. **Native tabs:** all tabs switch, Lucide PNG icons + labels render.
4. **Glass UI:** `GlassCard` surfaces render as dark Liquid Glass (not a flat fallback) on iOS 26.
5. **Camera meter:** open the meter screen, grant camera, confirm live preview + focus tap + EV readout updates (`expo-blur` panel legible, `expo-symbols` lock icon renders).
6. **Quick actions:** long-press the home-screen icon → 4 actions route correctly.
7. **App Intents / Siri:** the "Open Light Meter" Action Button intent + a Siri phrase still resolve.

---

## File Structure

Files touched across the upgrade (most are config; code changes are small and contained):

- `apps/mobile/package.json` — `expo` bump, version-aligned `expo-*`, native dep bumps (reanimated/worklets/mmkv/screens/etc.), CalVer version.
- `apps/mobile/metro.config.js:30-34, 58-67` — React/react-dom hard-pin (keep pinning the app copy; React is 19.2 in both 55 and 56, so the *value* doesn't change, but re-verify the pin still resolves a single instance).
- `apps/mobile/app/_layout.tsx:6, 25-29` — `@react-navigation/native` `ThemeProvider`/`DarkTheme` usage (Phase B / expo-router fork).
- `apps/mobile/src/screens/meter-screen.tsx:10` — `useIsFocused` from `@react-navigation/native` (Phase B / expo-router fork).
- `apps/mobile/src/components/meter/blur-panel.tsx` — `expo-blur` `<BlurView>` → `<BlurTargetView>` wrapper API (Phase A).
- `apps/mobile/app.json` — confirm `plugins`, `experiments.typedRoutes`, deployment target survive each bump; no expected edits but verify after `expo prebuild`.
- `apps/mobile/eas.json:3` — `cli.version` floor (bump if SDK 56 requires a newer EAS CLI).
- `apps/mobile/plugins/with-app-intents/` — Swift App Intents config plugin; no code edit expected, but rebuild + device re-verify each phase.
- `apps/mobile/CHANGELOG.md` — one entry per SDK landing.

---

## Phase 0 — De-risk the Nitro chain BEFORE committing to the upgrade

The whole upgrade is gated on whether `react-native-nitro-modules` (and thus **MMKV 4.x** and **VisionCamera**) compiles against RN 0.85. Prove this first on a throwaway branch. If it fails, stop and report — the rest of the plan is moot until upstream ships.

---

## ✅ SPIKE RESULTS (2026-06-23) — GO

Ran the spike on branch `spike/expo56-nitro` (direct to SDK 56). **Native build compiled, app renders, MMKV persistence + camera meter both verified on device.** The Nitro chain (MMKV 4.x + VisionCamera) works on RN 0.85 — no upstream blocker. Every failure encountered was a JS-side API migration, all fixed. These findings **supersede the assumptions in Phases A/B below**:

**Resolved versions (`expo install --fix` on SDK 56):** RN `0.85.3`, react/react-dom `19.2.3`, all `expo-*` `@^56`, `@types/react 19.2.17`, `typescript 6.0.3`. Notable: **gesture-handler DOWNGRADED `^3.0.1` → `2.31.2`** (SDK 56's vetted version), reanimated `4.3.1` + worklets `0.8.3` (the matched pair — *not* 4.4/0.9 as assumed), screens `4.25.2`, safe-area `5.7.0`, svg `15.15.4`, slider `5.2.0`. Nitro chain: nitro-modules `0.35.9` (unchanged), **mmkv `4.3.1`** (major bump), vision-camera `5.0.11` (unchanged).

**Fixes applied, in the order they surfaced (each was a separate redbox):**
1. **Stale React copy** — `apps/mobile/node_modules/react@19.1.0` lingered after the bump; metro pin redirected to it → "Incompatible React versions" (react 19.1.0 vs renderer 19.2.3). Fix: `rm -rf apps/mobile/node_modules/react react-dom && bun install` → single hoisted `react@19.2.3`. **The metro.config.js react/react-dom pin is now a no-op** (no nested copy to point at) — update its comment / simplify in the real branch; its "two different versions" rationale is gone.
2. **Stale expo-router peers** — `expo-linking@8.0.12` and `@expo/metro-runtime@6.1.2` (transitive leftovers; expo-router 56 only *peers* them so `--fix` didn't bump them). Fix: `npx expo install expo-linking @expo/metro-runtime` → `56.0.14` / `56.0.15`. (Adds a duplicate `@expo/metro-runtime` that expo-doctor flags — dedupe in the real branch.)
3. **MMKV 3→4 API** — v4 removed the runtime `MMKV` class (it's now a *type*); `new MMKV(cfg)` → `undefined`. Fix: `import { createMMKV }` + `createMMKV(cfg)` in **4 files**: `src/polyfills/install-local-storage.ts`, `src/lib/meter-calibration.ts`, `src/lib/meter-settings.ts`, `src/lib/tab-bar-settings.ts`.
4. **NativeTabs API** — `Icon`/`Label` are no longer standalone exports of `expo-router/unstable-native-tabs`; they're `NativeTabs.Trigger.Icon` / `NativeTabs.Trigger.Label` (props unchanged, `src` still takes a `require()` PNG). Fix: `app/(tabs)/_layout.tsx`.
5. **react-navigation split** — `useIsFocused` (in `src/screens/meter-screen.tsx`) and `DarkTheme`/`ThemeProvider` (in `app/_layout.tsx`) must import from **`expo-router`** (which re-exports them from its vendored fork), not `@react-navigation/native`. Plain import-source swap, no logic change.

**Corrections to the plan below:**
- **Task A4 (expo-blur `BlurTargetView`) was NOT needed** — plain `<BlurView>` still renders fine in SDK 56; the meter screen's blur panel works unchanged. Skip that task.
- The react-navigation migration (Task B3) is a simple import swap to `expo-router` — no codemod required for our two sites.

**Cleanup still owed for a real (non-throwaway) branch:**
- `src/lib/tab-bar-settings.test.ts` mocks `MMKV: class {}` → mock `createMMKV` instead (vitest, device-irrelevant but breaks `bun run test`).
- Remove `@react-navigation/native` from `package.json` deps **and** `expo.install.exclude` (now unused).
- Dedupe the duplicate `@expo/metro-runtime` (expo-doctor finding).
- Simplify/annotate the now-inert metro.config.js react pin.
- Decide `typescript@6.0.3` bump vs. exclude; run the full gate (lint / typecheck / test / react-doctor 100) + CalVer + `apps/mobile/CHANGELOG.md`.
- **Open question:** SDK 56 went direct cleanly — the incremental 54→55→56 split below is now optional (its attribution value is spent). Consider collapsing to a single 54→56 PR.

### Task 0: Nitro/VisionCamera/MMKV spike on a throwaway branch

**Files:**
- Create (throwaway, not committed): a scratch SDK-56 dependency set in `apps/mobile/package.json`.

**Interfaces:**
- Produces: a go/no-go decision. Confirmed working versions of `react-native-nitro-modules`, `react-native-nitro-image`, `react-native-vision-camera`, `react-native-mmkv` against RN 0.85 → feed these into Phase B Task B2.

- [ ] **Step 1: Create a scratch branch off main**

```bash
cd /Users/aaron/workspace/dorkroom
git checkout main && git pull
git checkout -b spike/expo56-nitro
```

- [ ] **Step 2: Jump straight to SDK 56 in the spike (we only want to know if it builds)**

```bash
cd apps/mobile
npx expo install expo@^56
npx expo install --fix
```

- [ ] **Step 3: Bring the Nitro chain to its newest releases and check resolution**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo install react-native-nitro-modules react-native-mmkv react-native-vision-camera react-native-reanimated react-native-worklets
# Inspect what resolved + their RN peer ranges:
for p in react-native-nitro-modules react-native-nitro-image react-native-vision-camera react-native-mmkv react-native-reanimated react-native-worklets; do
  echo "== $p =="; npm view "$p" version peerDependencies --json
done
```

Expected: versions resolve without an `ERESOLVE`/peer conflict. Note any that pin `react-native` below `0.85` — that is a red flag to investigate in Step 5.

- [ ] **Step 4: Clean prebuild + local native build (the real test — does it compile?)**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo prebuild --clean --platform ios
source ~/.app-store-connect/eas-asc.env
eas build --local --profile development --platform ios --non-interactive --output /tmp/dorkroom-spike.ipa
```

Expected: CocoaPods resolves and the Nitro pods (`NitroModules`, VisionCamera, MMKV) compile against RN 0.85. **If pods fail to resolve or compile, STOP** — record the exact error and report; the upgrade is blocked on upstream.

- [ ] **Step 5: Install on device and run the MMKV + camera smoke tests only**

```bash
DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-spike.ipa
xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
```

Expected: app launches (no MMKV segfault), a persisted setting survives a relaunch, and the camera meter shows a live preview with a moving EV readout. This confirms the two highest-risk features.

- [ ] **Step 6: Record the result, then discard the spike**

Write the working versions into this plan's Phase B Task B2 (replace the "from the spike" placeholders). Then:

```bash
cd /Users/aaron/workspace/dorkroom
git checkout main
git branch -D spike/expo56-nitro
git worktree prune 2>/dev/null || true
```

Expected: GO decision documented with concrete versions, or a NO-GO with the blocking error. **Do not proceed to Phase A until this is GO.**

---

## Phase A — SDK 54 → 55 (RN 0.83, React 19.2)

Headline 55 changes that affect us: New Arch becomes mandatory (we're already on it — no-op), **version alignment** (all `expo-*` → `^55`), and the **`expo-blur` `BlurTargetView`** API change. `expo-router` is still v6-on-react-navigation here, so the navigation imports are untouched in this phase.

### Task A1: Create the working branch and capture a baseline

**Files:**
- None modified; baseline only.

- [ ] **Step 1: Branch off main**

```bash
cd /Users/aaron/workspace/dorkroom
git checkout main && git pull
git checkout -b chore/expo-sdk-55
```

- [ ] **Step 2: Capture a green baseline so regressions are attributable**

```bash
cd apps/mobile
bun run lint && bun run typecheck && bun run test
cd /Users/aaron/workspace/dorkroom && npx react-doctor@latest --verbose
```

Expected: lint/typecheck/vitest all pass; React Doctor reports `@dorkroom/mobile` 100/100. If anything is already red, fix or note it before upgrading so it isn't blamed on the bump.

### Task A2: Bump Expo to SDK 55 and auto-align the SDK packages

**Files:**
- Modify: `apps/mobile/package.json` (expo + all `expo-*`, peer deps).

**Interfaces:**
- Produces: a `package.json` whose `expo` is `^55` and every `expo-*` is `^55`, with RN at 0.83 and React 19.2.

- [ ] **Step 1: Bump Expo and let Expo align the rest**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo install expo@^55
npx expo install --fix
```

Expected: `react-native` → `0.83.x`, `react`/`react-dom` → `19.2.x`, all `expo-*` → `^55.x`. Review the `package.json` diff; ensure no `expo-*` stayed on a `~15.x`/`~1.x` SDK-54 pin.

- [ ] **Step 2: Run Expo Doctor to surface remaining mismatches**

```bash
npx expo-doctor
```

Expected: no version-mismatch errors (the existing `expo.doctor` excludes for `react-native-nitro-image` and `@react-navigation/native` remain valid). Resolve anything new it flags.

### Task A3: Align the version-coupled native deps for RN 0.83

**Files:**
- Modify: `apps/mobile/package.json` (reanimated, worklets, screens, safe-area-context, gesture-handler, svg, slider, mmkv/nitro as needed).

**Interfaces:**
- Consumes: confirmed versions from the Phase 0 spike where applicable.
- Produces: native deps whose peer ranges include RN 0.83.

- [ ] **Step 1: Bump the animation/native stack together**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo install react-native-reanimated react-native-worklets react-native-screens \
  react-native-safe-area-context react-native-gesture-handler react-native-svg \
  @react-native-community/slider react-native-reorderable-list
```

Note: `react-native-reanimated` ≥4.4 requires `react-native-worklets@0.9.x` (a jump from our `0.5.1`) and declares `react-native: "0.83 - 0.86"`. They must move together.

- [ ] **Step 2: Verify each native dep's RN peer range covers 0.83**

```bash
for p in react-native-reanimated react-native-worklets react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-svg @react-native-community/slider react-native-reorderable-list; do
  echo "== $p =="; npm view "$p@$(node -p "require('./node_modules/$p/package.json').version")" peerDependencies --json
done
```

Expected: none pin `react-native` to a range excluding 0.83. Investigate any that do before continuing.

### Task A4: Migrate `expo-blur` to the `BlurTargetView` API

**Files:**
- Modify: `apps/mobile/src/components/meter/blur-panel.tsx`

**Interfaces:**
- Consumes: `expo-blur@^55`.
- Produces: `BlurPanel` unchanged in signature (`{ children, style }`), still rendering a rounded dark blur — now via the SDK-55 target/view split.

- [ ] **Step 1: Read the installed expo-blur 55 API surface before editing**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
cat node_modules/expo-blur/build/index.d.ts
```

Expected: confirms the exported `BlurView` and the new `BlurTargetView` (the content the blur samples must be wrapped/declared). Use the real exported names from this file in Step 2 (do not guess if they differ).

- [ ] **Step 2: Update `blur-panel.tsx` to wrap blurred content per the 55 API**

Replace the file body with the target-view form (adjust prop/wrapper names to exactly match Step 1's `.d.ts`):

```tsx
import { BlurTargetView, BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

/**
 * A rounded dark-blur backdrop so overlaid readouts and dials stay legible
 * against any scene behind the camera feed. SDK 55+ requires the blurred
 * content to live inside a BlurTargetView that the BlurView samples.
 */
export function BlurPanel({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <BlurTargetView style={[styles.panel, style]}>
      <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
      {children}
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, overflow: 'hidden' },
});
```

- [ ] **Step 3: Typecheck the change**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile && bun run typecheck
```

Expected: PASS, no `any`, the blur import resolves. (Visual correctness of the blur is verified on device in Task A6 — it is not unit-testable.)

### Task A5: Re-sync the Metro React pin and run the JS gate

**Files:**
- Modify (if needed): `apps/mobile/metro.config.js:30-34`

**Interfaces:**
- Produces: a single React instance at 19.2 across the app and `@dorkroom/*` source.

- [ ] **Step 1: Confirm the Metro hard-pin still points at the app's React copy**

The pin redirects every `react`/`react-dom` import to `apps/mobile/node_modules/<name>`. React is 19.2 in both the app (via Expo 55) and the repo root, so the comment's "19.1.0 vs 19.2.3" rationale is now "keep one instance" — update the comment at `metro.config.js:22-25` to say the pin guarantees a single React instance (versions may otherwise both be 19.2 but be two physical copies). No logic change expected.

- [ ] **Step 2: Start Metro clean once to shake out bundler/cache breakage**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
bunx expo start --dev-client --clear
# Let it build the bundle, watch for resolver errors, then Ctrl-C.
```

Expected: the JS bundle builds with no "multiple React copies" / unresolved-module errors.

- [ ] **Step 3: Full JS gate + React Doctor**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile && bun run lint && bun run typecheck && bun run test
cd /Users/aaron/workspace/dorkroom && npx react-doctor@latest --verbose
```

Expected: all green; `@dorkroom/mobile` stays 100/100.

### Task A6: Native build + on-device verification for SDK 55

**Files:**
- None (build/verify only).

- [ ] **Step 1: Clean prebuild and local dev build**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo prebuild --clean --platform ios
source ~/.app-store-connect/eas-asc.env
eas build --local --profile development --platform ios --non-interactive --output /tmp/dorkroom-dev.ipa
```

Expected: build succeeds (pods compile against RN 0.83).

- [ ] **Step 2: Confirm config-plugin output landed (App Intents + plist)**

```bash
unzip -o -q /tmp/dorkroom-dev.ipa "Payload/Dorkroom.app/Info.plist" -d /tmp/dr-check
plutil -p /tmp/dr-check/Payload/Dorkroom.app/Info.plist | grep -A20 ShortcutItems
```

Expected: the 4 quick-action `ShortcutItems` and camera usage string are present.

- [ ] **Step 3: Install, launch, run the full smoke-test checklist**

```bash
DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-dev.ipa
xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
```

Expected: all 7 items in the **Smoke-test checklist** pass — pay special attention to #5 (camera meter, now using the new `BlurTargetView`) and #2 (MMKV persistence).

### Task A7: Version, changelog, commit SDK 55

**Files:**
- Modify: `apps/mobile/package.json` (`version`), `apps/mobile/CHANGELOG.md`.

- [ ] **Step 1: Set CalVer to today and add a changelog entry**

Set `apps/mobile/package.json` `version` to today's date (`YYYY.MM.DD`). Prepend to `apps/mobile/CHANGELOG.md` (Keep a Changelog format):

```markdown
## [YYYY.MM.DD]

### Changed
- Upgrade to Expo SDK 55 (React Native 0.83, React 19.2). Aligned all `expo-*`
  packages to the SDK major, bumped reanimated/worklets/screens et al, and
  migrated `expo-blur` to the new `BlurTargetView` API.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aaron/workspace/dorkroom
git add apps/mobile
git commit -m "chore(mobile): upgrade to Expo SDK 55"
```

Expected: a single SDK-55 commit. **Do not push without explicit request.** Optionally open a PR for SDK 55 on its own so the two jumps review independently.

---

## Phase B — SDK 55 → 56 (RN 0.85, React 19.2)

Headline 56 changes that affect us: **expo-router forks from React Navigation** (our two `@react-navigation/native` import sites need attention — a codemod exists), **`expo/fetch` becomes the default `globalThis.fetch`** (affects `@dorkroom/api`), iOS min 16.4 / Xcode 26.4 (we're above), Node ≥ 20.19.4 (we're fine). Not relevant to us: `@expo/vector-icons` no longer transitive (we use `lucide-react-native`), DOM/webview backing change (unused), file-system `copy`/`move` async (unused).

### Task B1: Branch from the SDK-55 commit and bump Expo to 56

**Files:**
- Modify: `apps/mobile/package.json` (expo + all `expo-*`).

- [ ] **Step 1: Branch off the SDK-55 work**

```bash
cd /Users/aaron/workspace/dorkroom
git checkout chore/expo-sdk-55   # or main if 55 already merged
git checkout -b chore/expo-sdk-56
```

- [ ] **Step 2: Bump Expo and align**

```bash
cd apps/mobile
npx expo install expo@^56
npx expo install --fix
npx expo-doctor
```

Expected: `react-native` → `0.85.x`, all `expo-*` → `^56.x` (e.g. `expo-glass-effect@^56.0.4`, confirmed published). Resolve any doctor mismatch.

### Task B2: Apply the Nitro-chain versions proven in Phase 0

**Files:**
- Modify: `apps/mobile/package.json` (nitro-modules, mmkv, vision-camera, reanimated/worklets if a newer pair is needed for RN 0.85).

**Interfaces:**
- Consumes: the GO versions recorded by Phase 0 Task 0 Step 6.

- [ ] **Step 1: Pin the spike-confirmed versions**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
# Replace <ver> with the exact versions Phase 0 confirmed build on RN 0.85:
npx expo install react-native-nitro-modules@<ver> react-native-vision-camera@<ver> \
  react-native-mmkv@<ver> react-native-reanimated@<ver> react-native-worklets@<ver>
```

Note: MMKV 3.x → 4.x is a **major** bump — re-read its 4.0 release notes for any storage/API breaking change and check `src/polyfills/install-local-storage.ts` and `src/lib/*` MMKV usage still compiles. If a needed release is <7 days old, append ` --` and run via `bun install --minimum-release-age 0` and note it in the commit body.

- [ ] **Step 2: Typecheck against the new native dep types**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile && bun run typecheck
```

Expected: PASS. Fix any MMKV-4 API drift in the polyfill / lib stores surfaced here.

### Task B3: Run the expo-router fork codemod and fix navigation imports

**Files:**
- Modify: `apps/mobile/app/_layout.tsx:6, 25-29`, `apps/mobile/src/screens/meter-screen.tsx:10`

**Interfaces:**
- Consumes: `expo-router@^56`.
- Produces: `app/_layout.tsx` theming + `meter-screen.tsx` focus detection sourced from expo-router (or an explicitly-kept direct `@react-navigation/native` dep), with focus behavior verified on device.

- [ ] **Step 1: Run the official codemod**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo-router-codemod@latest   # name per the SDK 56 changelog's router-migration note
```

Expected: it rewrites expo-router-internal react-navigation imports. Review every file it changed.

- [ ] **Step 2: Verify `useIsFocused` in `meter-screen.tsx` is wired to the expo-router navigator**

`src/screens/meter-screen.tsx:10` imports `useIsFocused` from `@react-navigation/native`. After the fork, prefer expo-router's own focus API. Check what 56's expo-router exports:

```bash
grep -E "useIsFocused|useFocusEffect" node_modules/expo-router/build/index.d.ts
```

If expo-router re-exports `useIsFocused`/`useFocusEffect`, switch the import to `from 'expo-router'`. If only `useFocusEffect` exists, convert the boolean usage to focus/blur state:

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const [isFocused, setIsFocused] = useState(false);
useFocusEffect(
  useCallback(() => {
    setIsFocused(true);
    return () => setIsFocused(false);
  }, [])
);
```

Keep the camera-activation semantics identical (camera runs only while the screen is focused).

- [ ] **Step 3: Verify `ThemeProvider`/`DarkTheme` in `_layout.tsx`**

`app/_layout.tsx:6` imports `DarkTheme, ThemeProvider` from `@react-navigation/native`, rendered at lines 25-29. `@react-navigation/native` remains a **direct** dependency (`^7.x`, excluded from `expo install`), so these still resolve. Confirm they still drive expo-router's navigators after the fork:

```bash
grep -E "ThemeProvider|DarkTheme" node_modules/expo-router/build/index.d.ts
```

If expo-router 56 exports its own `ThemeProvider`/`DarkTheme`, switch to those (the canonical post-fork path). If it doesn't, keep the `@react-navigation/native` import — it's a valid direct dep. Either way the app must stay forced-dark (the dark Liquid Glass rendering at lines 15-18 depends on it).

- [ ] **Step 4: JS gate**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile && bun run lint && bun run typecheck && bun run test
```

Expected: all green.

### Task B4: Validate the `expo/fetch` default against `@dorkroom/api`

**Files:**
- None expected; investigation + possible opt-out.

**Interfaces:**
- Consumes: `@dorkroom/api`'s use of `globalThis.fetch`.

- [ ] **Step 1: Confirm how `@dorkroom/api` calls fetch**

```bash
grep -rn "fetch(" /Users/aaron/workspace/dorkroom/packages/api/src
```

Expected: identify whether it relies on any RN-fetch-specific behavior (e.g. `FormData`, blob/stream responses, custom headers) that `expo/fetch` handles differently.

- [ ] **Step 2: Device-verify a real network path (covered in B6) — opt out only if broken**

If API calls misbehave under `expo/fetch`, opt back into RN fetch by setting `EXPO_PUBLIC_USE_RN_FETCH=1` (document why in the changelog). Do **not** set it preemptively — prefer the new default.

### Task B5: Confirm EAS CLI / toolchain floors for SDK 56

**Files:**
- Modify (if needed): `apps/mobile/eas.json:3` (`cli.version`).

- [ ] **Step 1: Check EAS CLI and Xcode/Node floors**

```bash
eas --version
xcodebuild -version
node --version
```

Expected: Node ≥ 20.19.4 (have 22.x), Xcode ≥ 26.4, EAS CLI satisfies SDK 56. If the SDK 56 changelog requires a newer EAS CLI than the current `eas.json` floor (`>= 16.0.0`), bump `cli.version` accordingly and upgrade the CLI.

### Task B6: Native build + full on-device verification for SDK 56

**Files:**
- None (build/verify only).

- [ ] **Step 1: Clean prebuild + local dev build**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
npx expo prebuild --clean --platform ios
source ~/.app-store-connect/eas-asc.env
eas build --local --profile development --platform ios --non-interactive --output /tmp/dorkroom-dev.ipa
```

Expected: pods compile against RN 0.85 (already proven in Phase 0) and the App Intents Swift plugin still builds.

- [ ] **Step 2: Verify plist/App-Intents output**

```bash
unzip -o -q /tmp/dorkroom-dev.ipa "Payload/Dorkroom.app/Info.plist" -d /tmp/dr-check
plutil -p /tmp/dr-check/Payload/Dorkroom.app/Info.plist | grep -A20 ShortcutItems
```

Expected: quick-action ShortcutItems + camera usage string present.

- [ ] **Step 3: Install, launch, run the FULL smoke-test checklist**

```bash
DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-dev.ipa
xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
```

Expected: all 7 smoke-test items pass. Focus areas this phase: **#5 camera meter focus/EV** (Nitro/VisionCamera on 0.85), **#2 MMKV persistence** (MMKV 4.x), tab/screen **focus behavior** (router fork — meter camera must start/stop on focus), a **real network fetch** (B4 / `expo/fetch`), and **#7 App Intents/Siri**.

- [ ] **Step 4: Standalone (release-bundle) sanity build**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile
source ~/.app-store-connect/eas-asc.env
eas build --local --profile preview --platform ios --non-interactive --output /tmp/dorkroom-preview.ipa
# install/launch with the same devicectl commands
```

Expected: the minified release bundle (no Metro) behaves identically — catches any dev-only shimming that hides a 56 break.

### Task B7: Version, changelog, commit SDK 56

**Files:**
- Modify: `apps/mobile/package.json` (`version`), `apps/mobile/CHANGELOG.md`.

- [ ] **Step 1: Set CalVer + changelog entry**

Set `apps/mobile/package.json` `version` to today's date. Prepend to `apps/mobile/CHANGELOG.md`:

```markdown
## [YYYY.MM.DD]

### Changed
- Upgrade to Expo SDK 56 (React Native 0.85, React 19.2). Migrated to the
  expo-router/React-Navigation split, bumped the Nitro-backed native modules
  (react-native-mmkv 4.x, react-native-vision-camera, react-native-nitro-modules)
  for RN 0.85, and adopted the `expo/fetch` default.
```

- [ ] **Step 2: Final gate + commit**

```bash
cd /Users/aaron/workspace/dorkroom/apps/mobile && bun run lint && bun run typecheck && bun run test
cd /Users/aaron/workspace/dorkroom && npx react-doctor@latest --verbose
git add apps/mobile && git commit -m "chore(mobile): upgrade to Expo SDK 56"
```

Expected: all green, `@dorkroom/mobile` 100/100, one SDK-56 commit. **Do not push without explicit request.**

---

## Self-Review

- **Spec coverage:** Every breaking change identified in the investigation maps to a task — version alignment (A2/B1), native dep bumps (A3/B2), expo-blur API (A4), Metro React pin (A5), expo-router fork (B3), `expo/fetch` (B4), Node/iOS/Xcode/EAS floors (Global Constraints + B5), Nitro chain risk (Phase 0). Non-applicable 56 changes (vector-icons, DOM webview, fs copy/move) are explicitly noted as out of scope.
- **Sequencing:** Phase 0 gates the whole effort; Phase A fully lands and verifies before Phase B starts (incremental, per Expo guidance).
- **Testing honesty:** Native/camera/navigation tasks verify via typecheck + native build + device smoke tests, never fabricated unit tests — consistent with the repo's testing rules.
- **Open verification points (resolve during execution, not guesses):** exact `expo-blur` 55 export names (A4 Step 1 reads the `.d.ts`), the codemod package name (B3 Step 1, per the 56 changelog), and whether expo-router 56 re-exports `useIsFocused`/`ThemeProvider` (B3 Steps 2-3 grep the installed `.d.ts` before choosing the target). Each is resolved by inspecting installed sources rather than assuming an API.
```
