# iOS Mobile App Scaffold — Design

- **Date:** 2026-06-21
- **Status:** Approved (pending spec review)
- **Owner:** @aaron

## Goal

Scaffold an iOS version of Dorkroom using React Native via Expo, sharing as
much logic as possible with the existing web app. v1 ships a working scaffold
plus the four core calculators as native screens. Target **iOS 26** with
Apple's **Liquid Glass** styling via Expo where available.

## Scope

### In scope (v1)

- New `apps/mobile` workspace (`@dorkroom/mobile`): Expo app, Expo Router,
  NativeWind v4.
- Reuse `@dorkroom/api` and `@dorkroom/logic` from source.
- Four calculator screens, each driven by its existing shared hook:
  - **Border calculator** → `useBorderCalculator` (state, geometry, presets)
  - **Exposure calculator** → `useExposureCalculator`
  - **Reciprocity calculator** → `useReciprocityCalculator`
  - **Resize calculator** → `useResizeCalculator`
- Liquid Glass UI: native tab bar, Stack headers, and `GlassView` result panels.
- Synchronous MMKV-backed storage so persistence-using hooks work unchanged.

### Out of scope (v1)

- Development-recipes database, custom recipes, favorites.
- In-app sharing / deep links (defers `device-detection`, URL, and base64 share
  coupling).
- Border calculator image-overlay feature.
- Android (the `apps/mobile` name keeps it open for later).

## Architecture & code sharing

| Package | Reuse strategy |
| --- | --- |
| `@dorkroom/api` | Reused as-is. `fetch`-only, fully portable. |
| `@dorkroom/logic` | Reused from **source** (TS) via Metro. Calculators, schemas, constants, hooks. |
| `@dorkroom/ui` | **Not** reused — React-DOM/Tailwind. Native screens are rebuilt from RN primitives + NativeWind. |

**Metro consumes `@dorkroom/*` from `src`, not `dist`.** Standard Expo-monorepo
config (`watchFolders` + `transformIgnorePatterns`/transpile of workspace
packages). This enables `.native.ts` platform overrides and removes any
rebuild-on-change friction. A single React instance must be enforced via the
Metro resolver (no duplicate React).

## The three portability seams

These are the only places the shared code touches the browser.

### 1. Storage (the main one)

Several hooks call `window.localStorage` **directly** (not all go through
`createStorageManager`), including core-calculator hooks:

- `services/local-storage.ts` (`createStorageManager`)
- `hooks/border-calculator/use-border-calculator-state.ts` (raw)
- `hooks/use-border-presets.ts` (raw)
- `hooks/use-local-storage-form-persistence.ts` (raw)

**Solution:** a `polyfills/localStorage.ts` module, imported **first** in the
app entry, installs a synchronous `react-native-mmkv`-backed object as
`globalThis.localStorage` implementing the `Storage` interface
(`getItem`/`setItem`/`removeItem`/`clear`/`key`/`length`). Both the manager and
the raw call sites then work unchanged. **No edits to `@dorkroom/logic`.**

MMKV is synchronous, satisfying the existing sync API contract. It is a native
module → requires a custom dev build (not Expo Go). This aligns with the
Liquid Glass dev-build requirement, so it adds no extra workflow cost.

### 2. Window dimensions

`hooks/use-window-dimensions.ts` uses `window.innerWidth` + a `resize`
listener, and is consumed by the border calculator's
`use-geometry-calculations.ts`.

**Solution:** add `packages/logic/src/hooks/use-window-dimensions.native.ts`
wrapping RN's `useWindowDimensions`. Metro resolves `.native` automatically;
the web build is untouched.

### 3. base64 / sharing

`utils/base64.ts` (`window.btoa`/`atob`) and the share hooks
(`device-detection`, `window.location`, `navigator.share`) are **only** used by
sharing, which is out of v1 scope. No work needed in v1. If a share surface is
added later, add a Hermes `atob/btoa` check to the polyfill and a
`device-detection.native.ts` override.

## Styling — NativeWind v4 + Liquid Glass

- **NativeWind v4** for layout/typography (Tailwind vocabulary, agent-friendly).
- A small **shared design-token file** (plain TS: colors, spacing) consumed by
  the NativeWind config so native theme matches web. Web keeps its CSS `@theme`.
- **Liquid Glass via Expo** (`expo-glass-effect`):
  - Navigation: `expo-router/unstable-native-tabs` `NativeTabs` gives a native
    Liquid Glass tab bar; wrap in `ThemeProvider` (from `expo-router`) to avoid
    the documented tab-switch flicker. Stack headers get Liquid Glass
    automatically on iOS 26 (leave `UIDesignRequiresCompatibility` unset).
  - Screens: calculator result/output panels rendered as floating `GlassView`
    cards over the input content where it reads well.
  - **Guard every `GlassView`** with `isGlassEffectAPIAvailable()` (SDK 55) or
    `isLiquidGlassAvailable()` (SDK 54), falling back to a NativeWind-styled
    card so non-iOS-26 / beta devices never crash.

## Data layer

- `@tanstack/react-query` provider at the app root (already a `logic` peer).
- `QueryClient` tuned for RN: no `refetchOnWindowFocus`; reasonable
  `staleTime`/retry for mobile networks.
- API base URL points at the existing production/staging API; no new backend.

## App structure (Expo Router)

```
apps/mobile/
  app/
    _layout.tsx              # Root: QueryClientProvider + ThemeProvider
    (tabs)/
      _layout.tsx            # NativeTabs (Liquid Glass tab bar)
      border.tsx             # Border calculator screen
      exposure.tsx           # Exposure calculator screen
      reciprocity.tsx        # Reciprocity calculator screen
      resize.tsx             # Resize calculator screen
  src/
    polyfills/localStorage.ts  # MMKV-backed globalThis.localStorage
    components/                # Native UI primitives (GlassCard, fields, etc.)
    theme/tokens.ts            # Shared design tokens
  app.json / app.config.ts   # iOS 26 deployment target, plugins, infoPlist
  metro.config.js            # Monorepo + NativeWind config
  babel.config.js
  nativewind-env.d.ts
  tailwind.config.js
  package.json               # @dorkroom/mobile
  tsconfig.json
```

Each screen is a thin native view over the shared hook: render inputs to the
hook's setters, read computed values from the hook, present results in a
`GlassCard`.

## Build & gate safety

`@dorkroom/mobile` joins the workspace, so `bun run test`
(`turbo run lint test build typecheck --filter='@dorkroom/*'`) includes it.
Scripts keep the gate green:

- `lint`: `oxlint && biome check --linter-enabled=false .`
- `typecheck`: `tsgo --noEmit` (or `tsc --noEmit`) against the app tsconfig
- `test`: vitest `--passWithNoTests` (a smoke test for the polyfill is enough)
- `build`: **no-op** — Expo apps have no `dist/`; native builds run via
  `expo`/EAS outside the turbo gate.

The `@dorkroom/logic` test suite must stay green: the new `.native.ts` file is
ignored by the web build, and no existing logic file is modified.

## Risks / open questions

- **Single React instance** across the monorepo — verify via Metro resolver;
  pin the app to Expo's React (~19.1), covered by `logic` peerDep `^19`.
- **MMKV dev build from day one** — no Expo Go. Documented in app README.
- **Liquid Glass on non-26 / beta devices** — always guarded with availability
  checks + NativeWind fallback.
- **Expo SDK version** — target latest stable (≥54; prefer 55 for
  `isGlassEffectAPIAvailable`). Confirm at implementation time.

## Verification

- `bun run test` passes (gate stays green, mobile included).
- `@dorkroom/logic` tests unchanged and passing.
- Dev build boots on an iOS 26 simulator; all four calculators compute correctly
  driven by the shared hooks; persistence (border presets/state) survives a
  reload via MMKV; Liquid Glass tab bar + result cards render on iOS 26.
