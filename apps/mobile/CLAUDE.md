# CLAUDE.md - `@dorkroom/mobile` (iOS app)

The native iOS app (Expo / React Native). It reuses `@dorkroom/logic` and
`@dorkroom/api` from the monorepo and renders them with a dark, Liquid-Glass UI.

> Read the root `/CLAUDE.md` first. Monorepo-wide rules (no `any`, no internal
> package paths, CalVer, toolchain) apply here too. This file covers what is
> **specific to the mobile app**. `apps/mobile/README.md` has the full build,
> credentials, and code-sharing reference; this file is the day-to-day
> conventions and the build-vs-reload decision guide.

## Before you start

1. **Check current docs** (Context7 when connected) for Expo, Expo Router,
   NativeWind, React Native, and `react-native-vision-camera` before changing
   how they're used.
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
    _layout.tsx          # NativeTabs (Shoot, Develop, Print, Search); useQuickActionRouting lives HERE
    index.tsx            # Home, the Search tab and the launch route
    shoot/ develop/ print/   # one Stack per phase: _layout (PhaseStack), index (hub), [tool], settings
      shoot/film-log/    # Film Log screens, flat in the Shoot stack
      develop/recipes/   # recipe browser, recipe/[id], timer, flat in the Develop stack
src/
  screens/               # the actual screen components, one per tool
  components/            # PascalCase exports, kebab-case files; feature folders
  hooks/                 # mobile-only hooks (camera, meter, film log, last results)
  lib/                   # MMKV-backed stores, tool registry, export/share helpers
  schemas/               # Zod schemas for locally persisted data (film log)
  providers/             # query-client + query-persister
  polyfills/             # Hermes polyfills, MMKV localStorage shim
  theme/tokens.ts        # palette mirrored from web, for non-className values
  test/                  # vitest mocks for native modules
plugins/                 # local config plugins (with-app-intents, with-ios-scene-lifecycle)
scripts/                 # ios.sh, nativewind tailwind link
```

Path alias: `@/*` maps to `src/*` (see `tsconfig.json`).

## Conventions

### Screens live in `src/screens`, routes are re-exports

A route file does one thing: render a screen. Every single-screen tool is served
by its phase's one `[tool].tsx` (`app/(tabs)/<phase>/[tool].tsx`, which renders
`PhaseToolRoute`), so a tool's canonical path is `/<phase>/<id>`
(`/print/exposure`, `/shoot/lens`). `[tool]` shows the not-found state for an id
that is unknown, a section, or another phase's tool.

`TOOLS` in `src/lib/tools.ts` is the **tool manifest**: id, label, Lucide icon
name, `phase` (`shoot`, `develop` or `print`), a short `blurb` for its hub tile,
and `kind`: `'screen'` (a single screen) or `'section'` (its own route files, with
a `path`: Film Log, Recipes, and Process Timer, which opens the timer Recipes
uses). The list order is the hub order. `route` is derived, never written by
hand, and `PHASES`, `getToolPhase` and `toolsForPhase` derive from it. Home and
Settings are not tools: `HOME_ROUTE` and `settingsRoute(phase)` stand for them. Its native half is
`TOOL_SCREENS` in `src/lib/tool-screens.ts` (the screen component), split out
because screens can't load under vitest, so `tools.ts` stays pure and the tab
layout and hubs don't load every screen up front. Adding a single-screen tool
means: the screen in `src/screens/`, a `TOOLS` entry (`kind: 'screen'`, in the
position it should have on the hub), a `TOOL_SCREENS` entry (a missing one is a
compile error), and a `toolId` on its `Readout` only if it is answer-first and `persistsInputs`.
`src/lib/tool-manifest.test.ts` fails if a route file, phase table, quick action
or App Intent disagrees with the manifest.

**Phase stacks.** `PhaseStack` (`src/components/hub/phase-stack.tsx`) is the one
stack layout all three phases use: the hub at `index`, `[tool]`, and any section
screens the phase passes as children. Section screens sit flat in the phase stack
(no nested Stack), so a push from the hub always has the hub to go back to and
there is only one header. Each layout exports
`unstable_settings = { initialRouteName: 'index' }` so a deep link builds the hub
under the tool. `PhaseHub` (`src/screens/phase-hub.tsx`) is the hub: two-column
`ToolTile`s, each showing the tool's last result (`last-result-store.ts`, written
by `Readout`'s `toolId` prop through `useRecordResult`, 500ms trailing) or its
blurb. Only a tool that is answer-first and restores its inputs
(`persistsInputs`, typed as `RecordingToolId`) records one: a tool that resets
when reopened would show a tile that contradicts the tool. Shoot adds the active roll card (the roll the Meter logs to, or a prompt to
start one). Settings is an ordinary pushed screen registered once in `PhaseStack` (not a
modal: a link arriving while a modal is open would push the tool inside it), with
a route file per phase (`<phase>/settings.tsx`), so it has that hub underneath. The gear
in each hub header opens its own phase's (`settingsRoute(phase)`); the screen
resets the phase context so Settings keeps the neutral glow. Pushed screens keep
the native back button: it shows the previous scene's title, the phase name.

**Legacy paths.** Quick actions (`app.json`), App Intents, `dorkroom://` links
and old shares still carry pre-phase paths (`/more/meter`, `/lenses`,
`/film-log`, `/development`) and can't change without a native build.
`resolveLegacyPath` (`src/lib/deep-link.ts`) maps them to canonical paths and
passes everything else through (legacy `/settings` opens Shoot's Settings).
`app/+native-intent.ts` applies `resolveIncomingLink` to incoming URLs
(`redirectSystemPath`): expo-router hands that hook the FULL URL
(`dorkroom://meter`, host as the first path segment), so only the app's own
scheme (`APP_SCHEME`, checked against `app.json`) is rewritten and everything
else, `https://` and `exp+dorkroom://` included, passes through. Quick actions bypass that hook: the router calls
`router.navigate` itself, so `src/lib/quick-action-route.ts` (wired in
`quick-action.ts`) is the `useQuickActionRouting` callback that resolves the href and navigates with an
anchor. Don't repoint them without a native rebuild; keep the resolver table
true instead.

**Calculator links.** Home answers open a calculator pre-filled by passing the
link's params (`xCalculatorLink.build`) as search params on the tool's route.
The screen reads them with `useLinkOverrides(xCalculatorLink)` and hands them to
the shared hook as `overrides`. Those apply on mount only, so the hook returns a
key and the screen puts it on its body to re-mount it when a new link arrives.
Add that wrapper to any new calculator screen that Home can link to.

### Routing and screens

- **expo-router v57** with file-based, **typed routes** (`experiments.typedRoutes`).
  Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`). The tab set is
  fixed: Shoot, Develop, Print, then Home as the Search tab. Icons are SF
  Symbols (`<Icon sf=...>`, no image assets), and the selected tab takes its
  phase's hue (white on Search). The tabs layout exports
  `unstable_settings.initialRouteName = 'index'`, which only affects the state
  built from a deep link; `NativeTabs` doesn't pass it to its router, and the
  launch tab is Home because `/` matches `(tabs)/index`. Home is a plain last tab, not `role="search"`: that role is only
  the legacy system item (stock title and icon) and adds nothing here.
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
- **Answer-first calculators** (Exposure, Reciprocity, Camera Exposure, Lenses,
  Resize): the result is a `Readout` passed to `<Screen header={...}>`, a
  non-scrolling slot above the scroll view that clears the native header when
  pushed in a phase stack (or the top safe-area inset on Home) and stays visible
  with the keyboard up. Four of them (not Camera Exposure, whose fields are
  pickers) also put typed inputs in an `InsetGroup` (`InsetRow` for plain rows)
  as `ScrubRow`s: drag to scrub, tap the row to type. Scrub bounds come from
  the `@dorkroom/logic` validator constants where one exists (the focal length
  limits, `MIN_FOCAL_LENGTH_MM` and `MAX_FOCAL_LENGTH_MM`, live in
  `lens-calculator-defaults`), never a copy. Dragging right lowers the value on
  every scrub row (`SCRUB_DIRECTION` in `scrub-value.ts`, the ruler moving
  under a fixed indicator); VoiceOver increment still raises it. The ruler is a
  real number line in fixed coordinates (`ruler-machine.ts`, a pure reducer: an
  origin value at index 0, a tick every 10px per step, so adaptive steps stay
  10px each). The pan is a UI-thread worklet that moves one shared translate
  and tells JS only when the whole-step count changes (`use-scrub-machine.ts`),
  counted from recognition (the 8px before it is given back only when the
  finger reverses to where it went down);
  the ruler is one Skia canvas that is never remounted, with a static alpha
  mask for the edge fade. The origin stays put across outside changes and is
  replaced only on a step or bounds change or a far jump. The machine remembers
  the texts it has written (unordered), so during a drag any of them coming
  back is an echo, not an outside change. Keep it cheap: no per-tick views, no per-frame JS, no per-step state
  on the ruler. Mark the tool `answerFirst: true` in `TOOLS`. A pinned header
  means the scroll view is not the first view, so a large title could never
  collapse. `PhaseStack` (from the route params, via `usesLargeTitle`) gives
  such a tool a standard header. Each tool is its own screen in its phase
  stack (`dangerouslySingular` by tool id), so navigating to a tool already in
  the stack brings that screen to the top with its state. A missing result is a `Readout` with `value={null}` and the hint as its `note`, not a
  separate card.

### Styling

- **NativeWind v4 with Tailwind v3 syntax** via `className`. This is Tailwind
  v3, not the web app's v4, so don't use v4-only utilities. A `postinstall`
  script (`scripts/link-nativewind-tailwind.mjs`) symlinks v3 into NativeWind;
  it also runs as `eas-build-post-install` so remote builds get the same link.
- Palette in practice: bg `#0b0b0c`, text `text-white` / `text-white/60..80`,
  phase hues and `text-rose-400` links on Home (see below), pills `rounded-full`, cards
  `rounded-2xl`/`rounded-xl`. For values that can't be a class (sizes passed to
  native props, computed colors) use `theme/tokens.ts`.
- **Three hues, one per phase** (`theme/accents.ts`): yellow for Shoot, teal for
  Develop, rose for Print, used in the treatments that file documents (tinted
  glass for selection, a solid fill only for commit buttons). Controls take the
  hue from the surrounding `PhaseProvider`: `CommitButton` and `useCommitStyle`
  (dark ink on the fill; the hues are light and white fails 4.5:1),
  `useSelectionTint`, `usePhaseHue`. With no phase (Home, Settings) selection is
  a neutral white tint and a commit fill is the brand rose. Never write
  `bg-rose-600` for a commit button; use `CommitButton`, or `NeutralButton` for
  an action that isn't a commit (retry, a permission request). NativeWind
  ignores Pressable `style` callbacks (`style={({ pressed }) => ...}` becomes
  `{}`), so use a plain style object and `active:` classes; a test enforces it. Rose text for
  Delete/Remove/errors is destructive, not a hue. A tool's accent is its phase's hue
  (`PHASE_ACCENT`); the screens pass the literal. `GradientBackground` draws one
  glow in the hue of the `PhaseProvider` it sits under (`PhaseStack` provides it),
  neutral on Home and Settings. Direction-coded data (a pushed vs pulled recipe)
  uses `DIRECTION_COLOR`, outside the accent system.
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
  - Shared `@dorkroom/logic` calculators (mat, lens, camera exposure, border)
    persist through `PersistenceStorageProvider`, which `app/_layout.tsx` gives
    `calculatorStorage` from `src/lib/mmkv-storage.ts`: an MMKV adapter over
    the shared `dorkroom-mobile` instance. The exposure, reciprocity and resize
    screens use string-state hooks that do not persist (#427 tracks unifying them).
  - Other shared hooks (custom recipes, border presets) read and write
    `globalThis.localStorage`, backed by the MMKV shim installed in
    `app/_layout.tsx` via `installLocalStorage()` over that same instance.
    That call **must** stay first, before anything reads persisted state, and
    the instance id must not change, or saved state is lost.
  - Mobile-only state uses `createMMKV({ id: '…' })` (MMKV 4) directly with a named id
    (`meter-settings.ts`, `meter-calibration.ts`, `last-result-store.ts`,
    `film-log-storage.ts`). Pull defaults from `@dorkroom/logic` constants and
    guard reads with `Number.isFinite`.
  - Film log data is validated with Zod on read (`src/schemas/film-log.schema.ts`).
    It is user data with no server copy, so a parse failure must degrade, not throw.
    The film-log types (`FilmRoll`, `Shot`, `Camera`, ...) are `z.infer` of
    those schemas and exported from the same file. Add a field to the schema
    only: zod strips unlisted keys, so a field on a hand-written type would be
    erased on the next MMKV read.
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
                    # (pretest builds @dorkroom/logic and @dorkroom/api first,
                    # skipped when already running under turbo)
bun run typecheck   # bun check (TypeScript 7), strict, no `any`
bun run lint        # oxlint (lint) + bun fmt --check (formatting)
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
