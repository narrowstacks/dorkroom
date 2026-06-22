# @dorkroom/mobile

iOS app for Dorkroom (Expo + Expo Router), reusing `@dorkroom/logic` and
`@dorkroom/api` from source. Targets **iOS 26** with Liquid Glass styling.

## Requirements

- A **custom native build** — `react-native-mmkv`, `react-native-nitro-modules`,
  and `expo-glass-effect` are native modules, so **Expo Go does NOT work**.
- Xcode 26+, CocoaPods, Fastlane (`brew install cocoapods fastlane`), and
  `eas-cli` (`npm i -g eas-cli`) for local builds.
- iOS 26 simulator or device (Liquid Glass).

## Apple auth — App Store Connect API key (no 2FA)

EAS/Fastlane can't answer a security-key (YubiKey) 2FA challenge. Authenticate
with an **App Store Connect API key** instead — it skips interactive Apple login
entirely. Create an **Admin** key at App Store Connect → Users and Access →
Integrations → Team Keys, download the `.p8` once, and store it outside the repo:

```bash
mkdir -p ~/.app-store-connect && chmod 700 ~/.app-store-connect
mv ~/Downloads/AuthKey_*.p8 ~/.app-store-connect/
```

Create `~/.app-store-connect/eas-asc.env` (chmod 600), then `source` it before
any EAS command:

```bash
export EXPO_ASC_API_KEY_PATH="$HOME/.app-store-connect/AuthKey_XXXXXXXXXX.p8"
export EXPO_ASC_KEY_ID="XXXXXXXXXX"          # the key's ID
export EXPO_ASC_ISSUER_ID="…"                # Users and Access → Integrations
export EXPO_APPLE_TEAM_ID="XXXXXXXXXX"        # developer.apple.com → Membership
export EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"      # or COMPANY_OR_ORGANIZATION
```

First-time credential generation (distribution cert + provisioning profile) must
run once **interactively** (it still uses the API key, no Apple login):

```bash
source ~/.app-store-connect/eas-asc.env
eas login                                     # Expo account (not Apple)
eas build --local --profile preview --platform ios   # answer "yes" to create credentials
```

Register a device once (its UDID must be on the team before an internal build can
install): `eas device:create`, or add the UDID at developer.apple.com.

## Build (local) & install to a device

After credentials exist, builds are non-interactive:

```bash
source ~/.app-store-connect/eas-asc.env
cd apps/mobile

# Standalone build — runs on the phone with no Mac/Metro:
eas build --local --profile preview --platform ios --non-interactive \
  --output /tmp/dorkroom-preview.ipa

# Dev-client build — for fast iteration over Metro (see below):
eas build --local --profile development --platform ios --non-interactive \
  --output /tmp/dorkroom-dev.ipa
```

Install and launch on a connected device (Developer Mode on, "Trust This
Computer" accepted). Find the device id with `xcrun devicectl list devices`:

```bash
DEV=<device-id>            # e.g. from `xcrun devicectl list devices`
xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-preview.ipa
xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
```

### Fast iteration with the dev client

```bash
cd apps/mobile
bunx expo start --dev-client --host lan         # Metro; phone must be on same Wi-Fi
# open the installed dev client on the device; JS hot-reloads on save
```

`bunx expo run:ios` also works for a debug build straight to a simulator/device.

## How code is shared (and the gotchas)

- **Metro consumes `@dorkroom/*` from `src`, not `dist`** (`metro.config.js`
  `resolveRequest`), so no `turbo build` is needed before bundling and
  platform overrides (`.native.ts`) are picked up. It also rewrites the API
  package's NodeNext `.js` import specifiers to their `.ts` source.
- **Single React**: `react`/`react-dom` are hard-pinned to the app's copy
  (Expo's 19.1.x) in the Metro resolver, so `@dorkroom/logic` doesn't pull the
  repo-root React 19.2.x and mismatch `react-native-renderer`.
- **Synchronous storage**: `index.js` → `src/polyfills/install-local-storage.ts`
  installs an MMKV-backed `globalThis.localStorage`, so persistence-using shared
  hooks run unchanged. Requires `react-native-nitro-modules` (MMKV 3.x peer) —
  without it the app **segfaults** on first `new MMKV(...)`.
- **Hermes polyfill**: `index.js` (the custom entry) imports
  `src/polyfills/hermes-polyfills.ts` before `expo-router/entry`, polyfilling
  `Array.prototype.toSorted` (used by `@dorkroom/logic`, missing in Hermes).
- **`use-window-dimensions.native.ts`** in `@dorkroom/logic` overrides the web
  resize hook for RN.
- **NativeWind v4 + Tailwind v3 vs the web app's Tailwind v4**: a `postinstall`
  /`eas-build-post-install` script (`scripts/link-nativewind-tailwind.mjs`)
  symlinks Tailwind v3 into NativeWind's own `node_modules` so it doesn't
  resolve the hoisted v4. Runs automatically on install and in EAS Build.

## Out of scope (v1)

Development-recipes DB, custom recipes, favorites, in-app sharing/deep links,
border image overlay.
