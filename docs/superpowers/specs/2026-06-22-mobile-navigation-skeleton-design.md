# Mobile Navigation Skeleton + Easy Ports — Design

**Date:** 2026-06-22
**App:** `apps/mobile/` (Expo / React Native, iOS deployment target 26.0)
**Status:** Approved design — ready for implementation planning

## Problem

The web app exposes 12 internal pages across four categories (Printing, Film,
Camera, Reference) plus Home and Settings. The mobile app currently ships only 5
native tab destinations (Border, Exposure, Reciprocity, Resize, Meter). The
product goal is **full feature parity** with web, which means ~13 destinations —
but the iOS native tab bar realistically holds 5 slots.

This spec defines the **navigation architecture** that scales to full parity, plus
the **easy page ports** that can ship alongside it. The data-heavy browsers
(Development Recipes, Films) and Docs are explicitly deferred to their own specs.

### Current state (mobile)

| Tab | Route | Logic hook |
|-----|-------|------------|
| Border | `/` (`(tabs)/index.tsx`) | `useBorderCalculator` |
| Exposure | `/exposure` | `useExposureCalculator` |
| Reciprocity | `/reciprocity` | `useReciprocityCalculator` |
| Resize | `/resize` | `useResizeCalculator` |
| Meter | `/meter` | `useLightMeterSolver` (+ camera, mobile-only) |

Navigation: `expo-router/unstable-native-tabs` `NativeTabs` in
`app/(tabs)/_layout.tsx`. Root layout forces dark mode. No stack/modal screens
exist outside the tabs.

### Gap vs web (what parity requires)

| Missing on mobile | Type | Disposition |
|---|---|---|
| Mat Cut | Simple calculator | **This spec** |
| Lens Equivalency | Simple calculator | **This spec** |
| Camera Exposure | Simple calculator | **This spec** |
| Settings | Config | **This spec** |
| Development Recipes | Data-heavy browser | Follow-up spec |
| Films database | Data-heavy browser | Follow-up spec |
| Docs | External content (microfrontend on web) | Follow-up spec |
| Home dashboard | Hub | Superseded by the More hub (see below) |

## Chosen approach

**4 user-pinned tool tabs + a fixed "More" hub tab**, with the pinned set
**user-customizable** via an Edit screen. This is the proven iOS pattern for
many destinations, mirrors the web's category-based IA, and scales to any number
of tools without changing the navigation shell.

Alternatives considered and rejected:

- **Home-launcher grid + tabs** — discovery-first, but adds taps to reach the
  most-used field tools and duplicates the web Home page rather than improving on it.
- **Native iOS 26 auto-overflow / customizable tabs only** — least custom code,
  but the auto-"More" list is flat (not categorized) and we lose control over
  grouping and branding. Gated on what Expo's wrapper exposes.

## Architecture

### 1. Tool registry (single source of truth)

`apps/mobile/src/lib/tools.ts` exports the canonical list of tools. Both the tab
bar and the More hub derive from it — add a tool once and it appears everywhere.

```ts
type ToolCategory = 'printing' | 'film' | 'camera' | 'reference' | 'system';

type Tool = {
  id: string;          // stable key, e.g. 'border', 'meter'
  label: string;       // 'Border'
  sfSymbol: string;    // SF Symbol name, e.g. 'square.dashed'
  route: Href;         // expo-router route
  category: ToolCategory;
};
```

Categories mirror the web's `packages/ui/src/lib/navigation.ts` model
(Printing / Film / Camera / Reference) plus a `system` group for Settings, so the
two apps stay conceptually aligned.

### 2. Customizable tab bar

- Up to **4 pinned tool slots + a fixed 5th "More" tab**.
- Pinned set persisted in MMKV under store id `dorkroom-tab-bar`, key
  `pinnedToolIds: string[]` (ordered). Follows the existing
  `src/lib/meter-settings.ts` persistence pattern.
- **Default pins:** `['meter', 'border', 'reciprocity', 'exposure']`. Resize
  defaults into More — it is already the lowest-priority tool and the one
  excluded from the home-screen quick actions.
- A `usePinnedTabs()` hook reads/writes the persisted set.
- `app/(tabs)/_layout.tsx` renders one `NativeTabs.Trigger` per pinned tool (in
  persisted order) followed by the fixed More trigger.

### 3. The "More" hub

- A tab containing a **Stack** navigator.
- **Index screen:** a search field + a categorized list (Printing / Film /
  Camera / Reference / Settings) built from the tool registry.
- Tapping a tool **pushes** its screen onto the More stack.
- An **"Edit"** button at the top opens the **Edit Tabs** screen: drag to reorder
  pinned tools, toggle which tools occupy the 4 slots. Writes back to MMKV; the
  tab bar re-renders live.

### 4. Screen reuse (no duplication)

Each tool's UI is a shared component in `apps/mobile/src/screens/` with a single
implementation, mounted from two places:

- its static tab route under `(tabs)/` (when pinned), and
- the More stack (when not pinned).

The current `(tabs)/*.tsx` screen bodies are extracted into these shared screen
components. Tool state already persists via MMKV/localStorage-backed
`@dorkroom/logic` hooks, so continuity holds regardless of entry point.

**Header convention:** tab-level screens stay header-less (the tab label names the
screen, per existing mobile convention). Screens **pushed from More** get a native
large-title header with a back button — there is no tab labeling them, and this is
standard iOS. This does not conflict with the no-page-headers rule, which targets
duplicate in-page titles on tab screens.

### 5. Easy ports (included in this spec)

UI-only ports of calculators whose logic already exists in `@dorkroom/logic`,
following established mobile screen patterns (`ResultCard`, `ShareButton`,
`PresetChipRow`, etc.):

- **Mat Cut** — mat/border logic.
- **Lens Equivalency** — `useLensCalculator`.
- **Camera Exposure** — `useCameraExposureCalculator` (distinct from Meter, which
  uses the lower-level `useLightMeterSolver` + camera).

**Settings** screen wired to whatever `@dorkroom/logic` exposes for units. Theme
is currently force-dark on mobile, so Settings ships with units controls, the
Edit-Tabs entry point, and external links (GitHub / newsletter) mirroring web.

### 6. Deferred to follow-up specs

- **Development Recipes** — search, filters, favorites, custom recipes, share params.
- **Films database** — search, filter, detail.
- **Docs** — external microfrontend on web; mobile approach TBD in its own spec.

## Key implementation risk (resolve first)

Whether Expo's `unstable-native-tabs` can **navigate to a triggerless route**.
- If yes: every tool can be a single tab route, collapsing the dual-mount in §4 to
  one mount point — simpler.
- If no, or if changing the trigger set at runtime is glitchy: the More-stack mount
  in §4 is the fallback and the plan proceeds as written.

Run this as the first implementation spike before committing the routing file layout.

## Out of scope

- Porting Development Recipes, Films, or Docs (separate specs).
- Changing the Meter screen (mobile-only, already shipped).
- Any change to the web app.
- iPad-specific layout (NativeTabs renders a sidebar on iPad; verify but do not
  custom-build in this spec).

## Success criteria

- Tab bar renders the user's pinned tools (default Meter/Border/Reciprocity/
  Exposure) + More; the set persists across app restarts.
- Every tool — including Mat, Lens, Camera Exposure, Settings — is reachable from
  the categorized More hub and searchable there.
- Edit Tabs lets the user reorder and swap pinned tools; changes apply live and persist.
- Mat, Lens, and Camera Exposure produce correct results (logic already covered by
  `@dorkroom/logic` tests; mobile adds screen-level coverage per project patterns).
- `bun run test` passes and React Doctor stays 100/100 across all three projects.
