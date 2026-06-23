# Mobile More-page polish + drag reorder + Lucide icons + mobile score to 100 — Design

**Date:** 2026-06-23
**App:** `apps/mobile/` (Expo / React Native, iOS, native tab bar via `expo-router/unstable-native-tabs`)
**Status:** Approved design — ready for implementation planning
**Builds on:** the nav skeleton (branch `feat/mobile-nav-skeleton`): customizable tab bar + categorized More hub + Edit Tabs.

## Goal

Polish the new mobile navigation: refine the More page's look, give every destination a real **Lucide** icon shared with the web app (including the native tab bar), replace the Edit Tabs up/down buttons with **hold-to-drag** reordering, and bring `@dorkroom/mobile`'s React Doctor score to **100/100**.

## Context / constraints discovered

- The native tab bar (`unstable-native-tabs`) `Icon` only accepts an **SF Symbol**, an **image source**, or a **`VectorIcon`** (a family exposing `getImageSource`). Passing a raw SVG React element (a `lucide-react-native` icon) is explicitly unsupported — expo-router `console.warn`s "Only VectorIcon is supported as a React element in Icon.src" (`node_modules/expo-router/build/native-tabs/NativeBottomTabs/NativeTabTrigger.js`). So Lucide icons reach the native bar as **PNG image sources**.
- `react-native-svg@15.12.1` and `lucide-react@0.562.0` (web) are present; `lucide-react-native` and `react-native-gesture-handler` are **not** installed.
- `react-native-reanimated@4.1.7` is installed.
- Hold-to-drag needs `react-native-gesture-handler` (native) → a **fresh dev/EAS build** is required; the icons and More-page changes hot-reload, the drag does not appear until rebuilt.
- Dependency pins must respect the `bunfig.toml` `minimumReleaseAge` (7-day) gate; if a required package was published in the last week, install with `--minimum-release-age 0` or add it to `minimumReleaseAgeExcludes` (note in the plan).

## Decisions (from brainstorming)

1. Icons: **lucide-react-native** for in-view rows; **Lucide-generated PNGs** for the native tab bar (keeps the native iOS 26 tab bar + exact Lucide everywhere).
2. More page: **inset glass cards** — one `GlassCard` per non-empty category.
3. Edit Tabs: **hold-to-drag** via `react-native-reorderable-list` + `react-native-gesture-handler`; up/down buttons removed.
4. React Doctor: bring **`@dorkroom/mobile` to 100**; web (`@dorkroom/source`) explicitly deferred to a separate task.
5. Drag affordance: **long-press anywhere on a pinned row** initiates the drag (a grip glyph shows the affordance); tap the remove control to unpin.

## Architecture

### 1. Dependencies + native setup

- Add `lucide-react-native` (rows; depends on the already-present `react-native-svg`).
- Add `react-native-gesture-handler` (native) and `react-native-reorderable-list` (drag).
- Dev tooling for the icon pipeline: `lucide-static` (raw Lucide SVGs) + a rasterizer (`sharp`) as **devDependencies**.
- Wrap the app root (`app/_layout.tsx`) in `<GestureHandlerRootView style={{ flex: 1 }}>` (outermost, around the existing providers).
- A native rebuild of the dev client is required after these land; the user performs it.

### 2. Icon registry change

`apps/mobile/src/lib/tools.ts`: replace `sfSymbol: string` with `icon: string` — the **Lucide icon name** (kebab-case, e.g. `square-dashed`, `aperture`, `sun-medium`). The per-tool choices **mirror the web app's** `getRouteIcon` in `packages/ui/src/lib/navigation.ts` so the two apps share one visual identity. This removes the old `as SFSymbol` cast at the tab-bar call site.

### 3. Row icons — `ToolIcon`

`apps/mobile/src/components/tool-icon.tsx`: resolves a `lucide-react-native` component from a Lucide icon name and renders it at a given size/color. Used by the More cards and the Edit rows. A single name→component map (or the library's dynamic export) keeps it one place. No `any`.

### 4. Native tab-bar icons — Lucide PNG pipeline

- A generator script `apps/mobile/scripts/generate-tab-icons.mjs`: for each tool's Lucide name, read the `lucide-static` SVG, recolor stroke to white, and rasterize with `sharp` to template PNGs at @1x/@2x/@3x into `apps/mobile/assets/tab-icons/<id>.png` (+ `@2x`, `@3x`). Also generate the **More** tab icon (Lucide `menu` or `ellipsis`). The generated PNGs are committed; the script is re-runnable when icons change.
- `app/(tabs)/_layout.tsx`: a static `id → require('../../assets/tab-icons/<id>.png')` map; render `<Icon src={TAB_ICON[id]} />` for each pinned tool and the More trigger. iOS renders these as template images (auto-tinted active/inactive); if template tinting needs an explicit selected variant, provide `{ default, selected }` — confirmed on device.

### 5. More page → inset glass cards

`app/(tabs)/more/index.tsx`: replace the `SectionList` with a `ScrollView` containing one `GlassCard` per non-empty category (built from `CATEGORY_ORDER`/`CATEGORY_LABELS`). Each card holds `ToolIcon` rows (icon tile + label + a Lucide `ChevronRight`). The search field stays on top and filters which cards/rows render; the "Edit Tabs" entry stays as a distinct top row. Tool count (~9) is small, so a `ScrollView` (no virtualization) is appropriate. `tool-list-row.tsx` gains an optional leading-icon slot (or a new `ToolCardRow`); keep one shared row component.

### 6. Edit Tabs → hold-to-drag

`app/(tabs)/more/edit.tsx`: the pinned section becomes a `ReorderableList` (from `react-native-reorderable-list`) whose data is the pinned tools. Long-press a row to drag; on reorder, persist the new order via `setPinned`. Each pinned row: `ToolIcon` + label + a tap-target **remove** (Lucide `minus`/`x` in a circle) + a grip affordance (Lucide `grip-vertical`). The non-draggable "More tools" add-list renders as the list's **footer** (single scroll container): each available tool with a Lucide `plus` add control, enforcing the `MAX_PINNED` (4) cap. The up/down handlers and the `rerender-functional-setstate` inline-disable are removed.

### 7. `@dorkroom/mobile` → 100/100

Run `npx react-doctor@0.2.1 --verbose`, enumerate every `@dorkroom/mobile` finding (the current 91/100 gap — files include `stepper.tsx`, `film-picker.tsx`, `gradient-background.tsx`, `reciprocity-chart-modal.tsx` from the prior beautify PR), and fix each with a real fix (suppress only a genuine false positive, with a justifying comment). `@dorkroom/logic` and `@dorkroom/ui` must stay 100. `@dorkroom/source` (web) is **out of scope** — a separate future task.

## Out of scope

- Web app changes of any kind, including the `@dorkroom/source` React Doctor score.
- Android (the tab-icon pipeline targets iOS template images; Android drawables are not produced here).
- Porting the stubbed Mat/Lens/Camera-Exposure calculators (still their own follow-up).

## Testing & verification

- Unit (Vitest, pure modules): `ToolIcon`'s name→component resolution returns a component for every `tool.icon` in the registry and a safe fallback for an unknown name; registry invariant test updated for the `icon` field.
- `cd apps/mobile && bun run test` and `bunx tsc --noEmit` clean.
- **React Doctor: `@dorkroom/mobile` = 100/100**, `@dorkroom/logic` = 100, `@dorkroom/ui` = 100.
- Hot-reload device check: More page glass cards + Lucide row icons render; Edit list shows icons.
- After the native rebuild (user): hold-to-drag reorders and persists; the native tab bar shows the Lucide PNG icons, correctly tinted for active/inactive.

## Success criteria

- Every More/Edit row and every tab-bar slot shows the tool's Lucide icon, matching the web app's icon choices.
- The More page renders as inset glass cards, searchable.
- Edit Tabs reorders by long-press-drag and persists; no up/down buttons remain.
- `@dorkroom/mobile` is 100/100; logic and ui remain 100.
- `bun run test` + typecheck pass.
