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

The first build after the Process Timer Live Activity landed adds a widget
extension (`art.dorkroom.mobile.widgets`) and an App Group
(`group.art.dorkroom.mobile`). eas-cli cannot create those non-interactively:
run one `eas build --platform ios --profile development --local` in your own
terminal, accept the prompts (API key auth, no Apple ID login), then builds are
non-interactive again. See the build section of `CLAUDE.md`.

## Build (local) & install to a device

### Quick path — `scripts/ios.sh`

The wrapper script handles the `source`/`PATH`/`eas` setup, auto-detects the
connected iPhone, and streams the full build log to `/tmp/dorkroom-build.log`:

```bash
cd apps/mobile
./scripts/ios.sh server      # Metro dev server (JS/TS-only changes; hot reload)
./scripts/ios.sh dev-build   # local dev-client build → install + launch (native changes)
./scripts/ios.sh build       # standalone preview build → install + launch (no Metro)
./scripts/ios.sh install     # (re)install the last built .ipa + launch
./scripts/ios.sh help        # usage + flags (--clear, --no-launch, --no-install)
```

It still needs the one-time prerequisites below (App Store Connect key,
Fastlane, the iOS platform component, first-build credentials). The raw commands
it wraps:

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

## Versioning

`apps/mobile/package.json` is the single version source (CalVer, `YYYY.MM.DD`).
`app.config.ts` reads it and overrides `version` on top of the static
`app.json`, so the Settings screen (`Constants.expoConfig.version`) and the
store's `CFBundleShortVersionString` always match `package.json` and
`CHANGELOG.md`. Never add `version` to `app.json`. iOS requires one to three
period-separated integers, so `app.config.ts` strips zero padding
(`2026.07.03` becomes `2026.7.3`) and fails the build on anything else.

Check the resolved value with `bunx expo config --type public --json`.

**Build numbers** (`CFBundleVersion`) are owned by EAS: `eas.json` sets
`appVersionSource: "remote"` and the `production` profile has
`autoIncrement: true`, so each `eas build --profile production` bumps the
number stored on EAS servers. The first remote build seeds from the local
`ios.buildNumber` (or 1 if unset). To set it by hand, run
`eas build:version:set`. Do not put `buildNumber` in `app.json`; it is ignored
while the version source is remote.

## TestFlight and App Store

One-time setup:

1. Create the app record in App Store Connect (My Apps, New App): bundle ID
   `art.dorkroom.mobile`, platform iOS, a SKU of your choice. No record
   existed when this was written (`GET /v1/apps?filter[bundleId]=` returned
   empty).
2. Copy its numeric Apple ID (App Information, or the id in the app's URL) and
   put it in `eas.json` as `submit.production.ios.ascAppId`:
   `"submit": { "production": { "ios": { "ascAppId": "<id>" } } }`.
3. Fill the listing from [`docs/store-listing.md`](docs/store-listing.md) and
   upload screenshots (sizes are listed there).

Ship a build:

```bash
source ~/.app-store-connect/eas-asc.env
cd apps/mobile
# 1. bump apps/mobile/package.json + CHANGELOG.md (see the releasing skill)
eas build --profile production --platform ios     # cloud build, auto build number
eas submit --profile production --platform ios --latest   # upload to App Store Connect
```

Or `eas build --profile production --auto-submit` to do both. After Apple
finishes processing (a few minutes), the build appears under TestFlight.
Internal testers (App Store Connect users on the team, up to 100) can install
it immediately with no beta review; add them under TestFlight, Internal
Testing. External testers and App Store release need beta app review and
review submission in App Store Connect.

The ASC key env (`~/.app-store-connect/eas-asc.env`, see "Apple auth" above)
is what lets EAS build and submit non-interactively. Interactive Apple ID
login does not work here because the Apple account's 2FA is a YubiKey only,
which EAS and Fastlane cannot answer; the App Store Connect API key bypasses
the login entirely. `ITSAppUsesNonExemptEncryption` is already `false`
in `app.json`, so submissions skip the export-compliance prompt.

## How code is shared (and the gotchas)

- **Metro consumes `@dorkroom/*` from `src`, not `dist`** (`metro.config.js`
  `resolveRequest`), so no `turbo build` is needed before bundling and
  platform overrides (`.native.ts`) are picked up. It also rewrites the API
  package's NodeNext `.js` import specifiers to their `.ts` source.
- **Single React**: `react`/`react-dom` are hard-pinned to the app's copy
  (Expo's 19.1.x) in the Metro resolver, so `@dorkroom/logic` doesn't pull the
  repo-root React 19.2.x and mismatch `react-native-renderer`.
- **Synchronous storage**: `app/_layout.tsx` (first import, `installLocalStorage()`) → `src/polyfills/install-local-storage.ts`
  installs an MMKV-backed `globalThis.localStorage`, so persistence-using shared
  hooks run unchanged. Requires `react-native-nitro-modules` (MMKV 4 peer) —
  without it the app **segfaults** on first `createMMKV(...)`.
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

## License

AGPL-3.0-only, like the rest of the repo, **plus** the additional permission in
[`LICENSE-EXCEPTION`](../../LICENSE-EXCEPTION) at the repo root.

That exception exists for this app specifically. Apple conditions App Store
distribution on end users accepting terms that restrict rights the AGPLv3
grants (device-count limits, DRM on the delivered binary). Without the
exception, AGPLv3 section 12 would forbid shipping here at all: this is what
got VLC pulled from the App Store in 2011. The exception waives only the
license conditions that collide with those store terms.

It does **not** waive copyleft or source availability. A modified build
distributed through an app store must still be AGPLv3 and must still make its
Corresponding Source available.
