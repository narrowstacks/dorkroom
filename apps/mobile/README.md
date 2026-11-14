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

## Privacy

- The film log (rolls, shots, gear), attached photos, settings and optional
  frame locations are stored on the device, in the app's own data (which iOS
  backups include). Nothing is sent to the developer, and the app does not
  collect data: it has no accounts and no analytics.
- Permissions, each asked for at the moment you use the feature that needs it:
  camera (the Meter and the negative inverter), photos (choosing a photo to
  attach or convert, saving captures), notifications (Process Timer alerts) and
  location, while the app is in use only (when you tap "Add location" on a
  frame). Location is never read in the background and never looked up on its
  own, and the app does not turn coordinates into a place name.
- The Home Screen search (Spotlight) lists your rolls and your recently opened
  recipes. For a roll it holds the roll's name, film, camera, the lenses used,
  its EI, its status and how many frames are shot; for a recipe, its name (film
  and developer), time, dilution, EI and temperature. It never holds notes,
  places or coordinates. The index is on the device only: nothing is made
  public or sent anywhere, and a deleted roll is removed from it.
- Home Screen and Lock Screen widgets show only what the app passes them, which
  iOS keeps in a container shared with the widget extension on the device. The
  Favorites widget gets your favorite tools' ids with their fixed names, icons
  and links, in your order, and nothing else. Favorites themselves are a list
  of tool ids (fixed names, never text you typed) in the app's own data.
- Exports contain what you choose to export: a roll's CSV or GPX file, or the
  whole log as JSON, includes any frame locations you added. Sharing one sends
  it where you choose to send it.
- A roll's map shows its frame locations on Apple Maps. When you open it, iOS
  fetches the map tiles for the area in view from Apple, as any map does; the
  app itself sends your coordinates nowhere. The map does not show or ask for
  your current location.

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
