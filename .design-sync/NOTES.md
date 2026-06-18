# design-sync notes — @dorkroom/ui

Repo-specific gotchas for syncing `@dorkroom/ui` to claude.ai/design. Read before any re-sync.

## Shape & entry

- **Package shape, no Storybook.** Component list comes from the `.d.ts` tree.
- `@dorkroom/ui` ships **no JS dist** — `package.json` `main` points at `src/index.ts`, and the build (`tsgo`) emits only `.d.ts`. So the bundle `--entry` is the **TS source**: `packages/ui/src/index.ts` (esbuild compiles it). The `.d.ts` tree for prop extraction comes from `packages/ui/dist/*.d.ts` (built by `tsgo`).
- Workspace deps `@dorkroom/api` and `@dorkroom/logic` build to real JS dist (`packages/{api,logic}/dist/index.js`) — they must be built before the converter runs so esbuild can resolve them. `bun run build` (turbo) builds the whole graph.
- `--node-modules` = **repo-root** `node_modules` (bun hoists; `react`/`react-dom` live there, not under `packages/ui`).

## CSS (Tailwind 4, the tricky part)

- The UI package has **no compiled CSS** — components use Tailwind v4 utility classes + theme tokens defined in the app's `@theme`/`[data-theme]` blocks under `apps/dorkroom/src/styles/`.
- The converter appends `cfg.cssEntry` **verbatim** (no Tailwind run), so we pre-compile it: `.design-sync/build-ds-css.mjs` runs `@tailwindcss/postcss` over `apps/dorkroom/src/styles.css` (which `@source`s the whole monorepo → includes every utility every UI component uses) → `packages/ui/dist/ds.css`.
- `cfg.cssEntry` must resolve **inside** `packages/ui` (security bound), hence the `dist/ds.css` target (`dist/` is gitignored, regenerated).
- Default (no `[data-theme]` on the iframe root) renders the **dark** theme (the `@theme` defaults are dark). That's the app's default theme, so previews look right out of the box.
- Re-sync must regenerate this CSS — it's the second half of `cfg.buildCmd`.

## Providers & dark theme (`.design-sync/preview-provider.mjs`)

- `cfg.provider.component` = `DesignSyncPreviewRoot`, a small module (`.design-sync/preview-provider.mjs`) wired via `cfg.extraEntries`. It wraps the full context chain (all children-only): `ThemeProvider › MeasurementProvider › TemperatureProvider › VolumeProvider › ToastProvider`. Measurement/Temperature/Volume come from `createUnitContext` with sane defaults — no required props.
- **It forces the brand DARK theme** (the app's `@theme` default; user-chosen): seeds `localStorage['dorkroom-theme']='dark'` before `ThemeProvider` mounts, and **paints the dark canvas** by setting `document.body.style.background` to `var(--color-background)`. Needed because the converter's preview template hardcodes `body{background:#fff}` (unlayered) which beats base.css's layered dark background — without the override, dark-theme components render light-on-white.
- `extraEntries` are merged into the **same** esbuild graph as the package, so the provider's React context is shared with the components (no duplicate-context breakage).
- To change the default card theme later, edit the seeded value in `preview-provider.mjs` (`'dark'` → `'light'`/`'darkroom'`/`'high-contrast'`).

## Scope

- Synced the main entry (`exports['.']`) components. The `./forms` subpath components are **not** included in this run — add them later via a separate entry if desired.

## Re-sync risks (watch-list)

- **`packages/ui/dist/ds.css` is generated, gitignored, and required.** A re-sync that skips `cfg.buildCmd` (or runs only `tsgo`) leaves it stale/missing → unstyled previews. Always run `build-ds-css.mjs`.
- **Hashed app CSS is NOT the source** — we compile our own `ds.css`; don't repoint `cssEntry` at `apps/dorkroom/dist/assets/index-*.css` (hash churns every build).
- The bundle entry is TS source, not a JS dist — if the package ever gains a real JS build, prefer that entry and revisit.
- Tailwind/PostCSS toolchain version drift can change the compiled CSS; output is deterministic per toolchain version.

## Known render warns (triaged — re-syncs: a warn NOT listed here is new)

- **`[TOKENS_MISSING]`** for: `--border-color`, `--border-color-focused`, `--color-text-primary-rgb`, `--row-bg-hover`, `--card-bg-hover`, `--card-border-hover`, `--del-bg-hover`, `--del-color-hover`. These are set at **runtime** (inline style / JS) by the components that use them — expected absent from the shipped stylesheet. `--color-text-primary-rgb` is defined nowhere in source either (likely a latent app-side gap); non-blocking, renders pass.
- **`[FONT_MISSING]`** for `"Montserrat Sans"` and `"Fraunces"` (NOT the `Variable` families). These are **fallback aliases** in the font-family stacks, never separate font files. The real brand families `Montserrat Variable` + `Fraunces Variable` ship via `cfg.extraFonts`. Safe to ignore.
- Small/low-content default previews (NumberInput, Skeleton*, ThemeToggle, Tooltip, the DetailPanel icon buttons, CollapsibleSection/ResultRow/StatCard/ToolCard) may flag `[RENDER_BLANK]`/`[RENDER_THIN]` until their previews are authored — now all authored.
- **`[RENDER_THIN]` (maxHeight 0px) on `Drawer`, `DrawerBody`, `DrawerContent`** — BENIGN. These render via `createPortal` (fixed bottom sheet); the portal content renders visibly (confirmed by screenshot — a real "Recipe details" drawer) but doesn't contribute height to `#root`, so the measurement reads 0. Do not chase.
- **`[GRID_OVERFLOW]` "escape" on `ShareModal`, `SaveBeforeShareModal`** — BENIGN. These are non-portal `fixed inset-0` + `min-h-screen` overlays; their previews wrap each cell in a `transform: translateZ(0)` containing block (height 640, `overflow:hidden`) so the overlay is trapped and renders in-card (all variants visible). The detector still heuristically flags fixed/min-h-screen, but the frame contains it — confirmed by screenshot.

## cardMode overrides (`cfg.overrides`) — why each exists

Modals/drawers that escape the grid cell (fixed/portal), and compositions wider than a grid cell, get a `cardMode` override:
- **`single`** (fixed/portal escape, capture full viewport): `ConfirmModal`, `Modal`, `ResponsiveModal`, `Drawer`, `DrawerBody`, `DrawerContent`, `Toast`.
- **`column`** (one story per full-width row): `DetailPanel`, `DetailPanelCloseButton`, `DetailPanelExpandButton`, `ShareButton`, `ToolCard`, `StatCard`, `SkeletonCard`, `SkeletonTableRow`, plus `ShareModal`/`SaveBeforeShareModal` (each cell is the transform-framed modal).
- `ErrorBoundary` has a preview override (its `Fallback` cell intentionally throws).

## Authoring playbook (reusable preview idioms for re-syncs / new components)

- **No generic `Button` is exported** from `@dorkroom/ui` — compose footer actions as native `<button>` styled with `var(--color-primary)` / `var(--color-surface-muted)` / `var(--color-border-secondary)`.
- **`fixed`-position, auto-dismissing components (`Toast`)**: wrap in `position: relative` and pass a very large `duration` (e.g. `600000`) so they stay on-screen and fully slid-in for the static capture.
- **Non-portal `fixed inset-0` modals (`ShareModal`, `SaveBeforeShareModal`)**: wrap each cell in a `transform: translateZ(0)` + `overflow:hidden` frame (≈640px tall) so the overlay is contained and captured. Portal modals (`Modal`/`ConfirmModal`) don't need this — use `cardMode: single`.
- **Hover-only components with no controlled `open` (`Tooltip`)**: only the trigger can render statically; compose a faithful trigger and note the limitation.
- **`h-full` drawer/panel components (`MobileSidebar`)**: wrap in a fixed-height box (e.g. `300×560, overflow:hidden`) or they collapse to zero height.
- **`SkeletonTableRow` returns a bare `<tr>`** — wrap in `<table><tbody>…</tbody></table>`.
- **Context-only toggles take NO props** (`VolumeUnitToggle`, `MeasurementUnitToggle`) — single canonical cell each; the global provider supplies the context.
- **Threshold components** only render when a value differs from default: `PushPullAlert` (`pushPull !== 0`), `TemperatureAlert` (temp ≠ 68°F/20°C). Pass off-default values.
- **`FilterPanel*` family**: compose Header/Section/ClearButton **inside `FilterPanelContainer`** (it IS the `FilterPanelContext.Provider`) — no `cfg.provider` change needed. `FilterPanelContainer` requires `activeFilterCount` + `hasActiveFilters`.
- **`DetailPanel`**: the desktop sidebar (`isMobile={false}`, `isOpen`, not expanded) renders inline and captures cleanly; it portals only in expanded/mobile mode. The close/expand buttons render in its header slot.
- **Real nav data is exported from `@dorkroom/ui`**: `navItems`, `printingItems`, `filmItems`, `cameraItems`, `referenceItems`, `navigationCategories` — use these for faithful nav previews.
- **`SensorFormat` is NOT re-exported** from `@dorkroom/logic`'s index, and previews may only import `@dorkroom/ui`/`lucide-react`/`react` — inline the format object literals (shape in `packages/logic/src/constants/lens-calculator-defaults.ts`) for `SensorSizeVisualization`.
- **`.d.ts` with `[key: string]: unknown`** (e.g. `ErrorBoundary`) is uninformative — read the component source for the real prop shape.
- Menu/popover open-state in nav components (`Select`, `SearchableSelect`, `NavigationDropdown`, `ThemeToggle`) is internal `useState` triggered on click/focus → static capture shows the **closed** trigger. Build the variant axis around resting-render props (variant, active path, selected value).
