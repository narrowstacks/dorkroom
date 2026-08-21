# CLAUDE.md - `@dorkroom/mobile` (iOS app)

The native iOS app (Expo / React Native). It reuses `@dorkroom/logic` and
`@dorkroom/api` from the monorepo and renders them with a dark, Liquid-Glass UI.

> Read the root `/CLAUDE.md` first. Monorepo-wide rules (no `any`, no internal
> package paths, CalVer, toolchain) apply here too. This file covers what is
> **specific to the mobile app**. `apps/mobile/README.md` has the full build,
> credentials, and code-sharing reference; this file is the day-to-day
> conventions and the build-vs-reload decision guide.

## Before you start

1. **Use Context7** for Expo, Expo Router, NativeWind, React Native, and
   `react-native-vision-camera` docs before changing how they're used.
2. This app is **iOS-only**, **dark-only**, targets **iOS 26**
   (`expo-build-properties` sets `deploymentTarget: "26.0"`), and runs on the
   New Architecture.

## Structure

```
index.js                 # custom entry: Hermes polyfills, then expo-router/entry
app/                     # expo-router file-based routes (typed routes on)
  _layout.tsx            # root Stack: polyfills, API config, dark theme, providers
  +native-intent.ts      # deep-link path rewriting
  (tabs)/
    _layout.tsx          # NativeTabs; useQuickActionRouting + usePinnedTabs live HERE
    index.tsx            # each tab file is a two-line re-export of a src/screens/ screen
    film-log/            # nested Stack: roll list, roll form, shot, gear
    development/         # nested Stack: recipe browser, recipe detail, timer
    more/                # tool directory, tab-pin editor, and [tool] detail route
src/
  screens/               # the actual screen components, one per tool
  components/            # PascalCase exports, kebab-case files; feature folders
  hooks/                 # mobile-only hooks (camera, meter, film log, pinned tabs)
  lib/                   # MMKV-backed stores, tool registry, export/share helpers
  schemas/               # Zod schemas for locally persisted data (film log)
  providers/             # query-client + query-persister
  polyfills/             # Hermes polyfills, MMKV localStorage shim
  theme/tokens.ts        # palette mirrored from web, for non-className values
  test/                  # vitest mocks for native modules
plugins/                 # local config plugins (with-app-intents, with-ios-scene-lifecycle)
scripts/                 # ios.sh, tab-icon and grain generators, nativewind tailwind link
```

Path alias: `@/*` maps to `src/*` (see `tsconfig.json`).

## Conventions

### Screens live in `src/screens`, routes are re-exports

A route file under `app/(tabs)/` does one thing: re-export a screen.

```tsx
// app/(tabs)/index.tsx
import { BorderScreen } from '@/screens/border-screen';
export default BorderScreen;
```

This exists because **every tool is reachable two ways**: as a pinned tab, and
as a `/more/<tool>` detail route inside the More stack. `app/(tabs)/more/[tool].tsx`
maps a tool id onto the same screen component through a `SCREENS` map. Adding a
tool means touching three places: the screen in `src/screens/`, an entry in
`TOOLS` in `src/lib/tools.ts`, and the `SCREENS` map in `more/[tool].tsx`. Miss
the third and the tool renders "Unknown tool."

`src/lib/tools.ts` is the registry: id, label, Lucide icon name, route, and
category. `pinnable: false` keeps a tool out of the pin editor (`film-log` uses
this because it is a permanent tab).

### Routing and screens

- **expo-router v6** with file-based, **typed routes** (`experiments.typedRoutes`).
  Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`), each `Trigger` with
  a Lucide-generated PNG asset rendered via `<Icon src={...}>` (icons come from
  `scripts/generate-tab-icons.mjs`) and `<Label>`.
- The visible tab set is **user-configurable**. `usePinnedTabs()` drives which
  triggers render; Film Log, Recipes, and More are always present.
- **Dark only.** Don't add light-mode branches. `app/_layout.tsx` forces
  `Appearance.setColorScheme('dark')`, uses `DarkTheme`, `StatusBar style="light"`,
  and `headerShown: false`. `app.json` sets `userInterfaceStyle: "dark"`.
- **Screens are thin view layers.** A screen is an exported `PascalCaseScreen`,
  pulls all state and logic from a shared `@dorkroom/logic` hook (e.g.
  `useExposureCalculator`), and composes `<Screen>` plus `GlassCard` plus row
  components. Calculator math belongs in `@dorkroom/logic`, never in a screen.
- **No in-page title header.** The tab bar or the pushed stack header already
  names the screen, so don't render a redundant `<Text>Reciprocity</Text>`
  heading.
- Wrap normal content in `<Screen>` (scrolls, padding 16, gap 16, bg `#0b0b0c`).
  Full-bleed screens (the camera meter) skip it.

### Styling

- **NativeWind v4 with Tailwind v3 syntax** via `className`. This is Tailwind
  v3, not the web app's v4, so don't use v4-only utilities. A `postinstall`
  script (`scripts/link-nativewind-tailwind.mjs`) symlinks v3 into NativeWind;
  it also runs as `eas-build-post-install` so remote builds get the same link.
- Palette in practice: bg `#0b0b0c`, text `text-white` / `text-white/60..80`,
  accent `bg-rose-600` / `text-rose-400`, pills `rounded-full`, cards
  `rounded-2xl`/`rounded-xl`. For values that can't be a class (sizes passed to
  native props, computed colors) use `theme/tokens.ts`.
- Prefer `GlassCard` for surfaces: Liquid Glass on iOS 26, translucent
  `bg-white/10` fallback elsewhere. Capability checks are computed **once at
  import**, never per render (see `glass-card.tsx`).

### Components

- PascalCase names, kebab-case files; props interface named `ComponentNameProps`;
  accept an optional `className`. Generic when it removes duplication
  (`OptionRow<T>`).
- Co-locate a feature's pieces in a subfolder with their **pure** helpers and
  `*.test.ts` beside them (`components/border/geometry.ts` plus `geometry.test.ts`).
  Keep geometry, format, and layout math pure and tested; keep the `.tsx` a thin
  renderer.

### Persistence and data

- Storage is **synchronous MMKV**. Two patterns:
  - Shared `@dorkroom/logic` hooks read and write `globalThis.localStorage`,
    backed by the MMKV shim installed in `app/_layout.tsx` via
    `installLocalStorage()`. That call **must** stay first, before anything reads
    persisted state.
  - Mobile-only state uses `new MMKV({ id: '…' })` directly with a named id
    (`meter-settings.ts`, `meter-calibration.ts`, `tab-bar-settings.ts`,
    `film-log-storage.ts`). Pull defaults from `@dorkroom/logic` constants and
    guard reads with `Number.isFinite`.
  - Film log data is validated with Zod on read (`src/schemas/film-log.schema.ts`).
    It is user data with no server copy, so a parse failure must degrade, not throw.
- Server data goes through TanStack Query (`providers/query-client.ts`: no
  window-focus refetch, retry 2, 5-min `staleTime`) and is **persisted to MMKV**
  by `PersistQueryClientProvider`. `gcTime` is kept equal to the persister's
  `QUERY_CACHE_MAX_AGE`, so changing one means changing the other or cached
  queries get collected out from under the cache.

### Shared code (the sharp edges)

- Import only from `@dorkroom/logic` / `@dorkroom/api`, **never** internal paths.
  Metro resolves these from each package's **`src`** (no `turbo build` needed) and
  picks up `.native.ts` overrides.
- `react`/`react-dom` are hard-pinned to the app's copy in `metro.config.js`;
  MMKV needs `react-native-nitro-modules` or the app **segfaults** on first use;
  Hermes is missing `Array.prototype.toSorted`, polyfilled by `index.js` importing
  `src/polyfills/hermes-polyfills` before `expo-router/entry`. Don't "fix" these
  by editing the resolver without reading the README notes first.

### Quality gate (run from `apps/mobile`)

```bash
bun run test        # vitest, pure modules only (see Testing)
bun run typecheck   # tsc --noEmit, strict, no `any`
bun run lint        # oxlint (lint) + biome (formatting only)
```

`bun run build` here is a deliberate no-op: native builds go through Expo/EAS,
not turbo.

- **Testing reality:** only **pure** modules are unit-tested (geometry, format,
  layout, storage serialization, and the EV/solver math in `@dorkroom/logic`).
  `src/test/` holds mocks for the native modules that pure code touches
  incidentally. Camera, native modules, navigation, config plugins, and quick
  actions are **not** unit-testable here. Verify those **on device** (see below).
  Don't write fake tests that mock native behavior to manufacture coverage.
- **Typecheck depends on generated types.** `.expo/types` comes from expo-router's
  typed routes. A fresh worktree has none (so typecheck under-checks routes) and a
  stale checkout has old ones (so it fails on routes that are fine). Run the dev
  server once to regenerate before trusting a route-related error.

### Versioning

- The mobile app versions **independently** from the web app: its own
  `apps/mobile/CHANGELOG.md` and its own CalVer in `apps/mobile/package.json`.
  Web-app changes go in the root `CHANGELOG.md`. Don't mix them.
- Never apply the `eas-build` label to a PR unless you intend to trigger a build.

---

## Build vs. reload: decide by what changed

Three workflows, cheapest first. Pick the **cheapest one that covers your
change**. Full commands and credential setup are in `apps/mobile/README.md`.

### Quick path: `scripts/ios.sh`

`scripts/ios.sh` wraps all three workflows so you don't have to remember the
`source`/`PATH`/`eas` incantation. Run from `apps/mobile`:

```bash
./scripts/ios.sh server              # 1. Metro dev server (JS/TS-only changes; hot reload)
./scripts/ios.sh server --tailscale  # 1b. same, but reachable over Tailscale (off-LAN device)
./scripts/ios.sh dev-build   # 2. local dev-client build, install + launch (native changes)
./scripts/ios.sh build       # 3. standalone preview build, install + launch (no Metro)
./scripts/ios.sh install     # (re)install the last built .ipa + launch
./scripts/ios.sh help        # usage
```

Flags: `--clear` (server, stale bundler cache), `--tailscale` (server, serve
over Tailscale, see below), `--port=N` (server), `--no-launch`, `--no-install`
(build only). The script auto-detects the connected iPhone, sources the App
Store Connect key env, and resolves `eas`/`fastlane`/`pod`/`bun` onto `PATH`
itself. It handles the gotchas that bite the raw commands:

- `eas` isn't on `PATH` in a fresh shell (node/npm are nvm lazy-load shims,
  `eas` has none), so it locates the nvm node bin that actually has `eas`.
- Builds stream the **full** log to `/tmp/dorkroom-build.log` via `tee`, never
  `tail`, which buffers the real Xcode error and masks the exit code.
- One-time prereqs still apply (see the note at the end of this section):
  `brew install fastlane`, the iOS platform component in Xcode, and first-build
  credential generation. The sections below document what each command does.

### 1. Just reload Metro, for JS/TS-only changes

Use when you changed **only** JavaScript/TypeScript: components, screens, hooks,
styling (`className`), types, or shared logic in `@dorkroom/logic` /
`@dorkroom/api`. The installed dev client picks it up over Fast Refresh, no
rebuild.

```bash
cd apps/mobile
bunx expo start --dev-client --host lan        # phone on same Wi-Fi; save, hot reload
```

Restart Metro with `--clear` (not a native rebuild) when the **bundler** config
changes or its cache goes stale: edits to `metro.config.js`, `babel.config.js`,
`global.css`/Tailwind config, adding or removing a **JS-only** dependency, or
weird stale-module errors.

```bash
bunx expo start --dev-client --host lan --clear
```

**Over Tailscale (off-LAN device):** `./scripts/ios.sh server --tailscale`. Use
when the phone isn't on the same Wi-Fi (other network, cellular). Plain-HTTP
Metro can't work here: iOS ATS treats Tailscale's `100.64.0.0/10` CGNAT range
as non-local (unlike your `192.168.x` LAN), and this dev build has no
`NSAllowsArbitraryLoads`. The flag serves Metro over **trusted HTTPS** instead.
It mints a Let's Encrypt cert for this Mac's MagicDNS name (`tailscale cert`,
which requires HTTPS enabled on the tailnet), binds Metro to loopback
advertising that hostname, and fronts it with `tailscale serve`. It prints a
`dorkroom://` deep link; the phone needs Tailscale connected with MagicDNS
("Use Tailscale DNS") on. Ctrl-C tears the proxy down. No native rebuild, still
Fast Refresh.

### 2. New **development build**, for native changes (dev client over Metro)

Rebuild the native dev client when the change touches **native code or native
config**, because Metro can't hot-reload native:

- adding, removing, or upgrading a dependency with **native iOS code** (e.g.
  `expo-quick-actions`, `react-native-vision-camera`, anything with a config plugin)
- editing the **`plugins`** array in `app.json` or a plugin's options, including
  the local plugins in `plugins/` (`with-app-intents`, `with-ios-scene-lifecycle`)
- changing native iOS config: `Info.plist` keys, **permission/usage strings**,
  the **URL scheme**, bundle id, **deployment target**, app icon / splash
- **home-screen quick actions / SF Symbol shortcut items**, entitlements

```bash
source ~/.app-store-connect/eas-asc.env
cd apps/mobile
eas build --local --profile development --platform ios --non-interactive \
  --output /tmp/dorkroom-dev.ipa
```

Then install and launch on the connected device, with Metro running so it loads
JS at runtime:

```bash
DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-dev.ipa
xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
```

Sanity-check that a config-plugin change actually landed by reading the built
plist before installing, e.g.:

```bash
unzip -o -q /tmp/dorkroom-dev.ipa "Payload/Dorkroom.app/Info.plist" -d /tmp/dr-check
plutil -p /tmp/dr-check/Payload/Dorkroom.app/Info.plist | grep -A20 ShortcutItems
```

### 3. **Standalone (non-Metro) build**, self-contained, no Mac or Metro

Use the **preview** profile when the build must run on the phone **without** a
dev machine or Metro. The JS is bundled in (release mode):

- testing on-device away from your machine, or handing a build to someone else
- demos, field testing, internal distribution
- verifying the **production-like release bundle** (minified JS, no dev menu)
  behaves the same as dev

```bash
source ~/.app-store-connect/eas-asc.env
cd apps/mobile
eas build --local --profile preview --platform ios --non-interactive \
  --output /tmp/dorkroom-preview.ipa
# install/launch with the same devicectl commands as above
```

### Which one for a given request?

| Your change / request | Workflow |
| --- | --- |
| "Tweak this screen / calculator / style / shared hook" | **1. Reload Metro** |
| "I changed metro/babel/tailwind config" or cache is stale | **1. Reload with `--clear`** |
| "Test on my phone off this Wi-Fi (other network / cellular)" | **1. `server --tailscale`** |
| "Add a native module / change app.json plugins / permissions / icon / shortcuts" | **2. Dev build** + reinstall |
| "Test on my phone without Metro / share a build / demo / check the release bundle" | **3. Preview build** |

When in doubt: if Metro Fast Refresh shows the change, you didn't need a build.
If it doesn't and the change was native, you needed **#2**.

> One-time prerequisites for #2/#3 (Expo login, App Store Connect API key because
> Apple 2FA is YubiKey-only, device registration): see `apps/mobile/README.md`.
> Local builds also need **Fastlane** (`brew install fastlane`) and the **iOS
> platform component** installed in Xcode (`xcodebuild -downloadPlatform iOS`, or
> Settings, then Components). The platform is required even when
> `xcodebuild -showsdks` already lists the iOS SDK.
