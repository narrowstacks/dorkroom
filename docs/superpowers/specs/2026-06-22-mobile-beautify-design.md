# Mobile App Beautification — Design

**Date:** 2026-06-22
**Branch:** `feat/mobile-beautify`
**Scope:** iOS app (`apps/mobile/`) only. Web app untouched.

## Goal

Beautify the iOS app to feel cohesive with the web app, and bring the
Exposure, Resize, and Reciprocity calculators up to feature parity with the web
versions plus native-first extras.

Two pillars:

1. **Visual** — port the web dark-theme gradient background (layered radial
   glows + film-grain noise over near-black) and a refreshed card/primitive
   system.
2. **Functional** — parity with the web calculators (presets, richer outputs,
   options) plus native touches (haptics, share sheet, drag-friendly steppers,
   an SVG reciprocity chart, an aspect-ratio preview).

The app is dark-only (hard-coded `Appearance.setColorScheme('dark')`), so only
the dark gradient is needed — no theme switching.

## Approach

Foundation-first (approach A): add `react-native-svg`, build the shared visual
system and reusable input primitives once, then refit each calculator on top.
The gradient lands first for an immediate visible win everywhere; the shared
primitives make all three calculators thin and consistent. All calculation
math, film lists, and presets already live in `@dorkroom/logic` — this is
overwhelmingly UI work, not logic.

### Dependencies

- **`react-native-svg`** — NEW. Powers both the radial gradient and the
  reciprocity chart / aspect-ratio preview. (Confirmed not currently present in
  `apps/mobile/package.json` or the lockfile.)
- **`expo-haptics`** — add if not already present; used by the new primitives.
- **`Share`** — React Native built-in, no new dependency.

---

## Section 1 — Foundation: gradient background + shared visual system

### `GradientBackground` (`apps/mobile/src/components/gradient-background.tsx`)

An absolute-fill layer rendered **behind** the scroll content so it stays fixed
and does not scroll (the equivalent of the web's `background-attachment: fixed`).

Implemented with `react-native-svg` `<Svg>` using
`gradientUnits="objectBoundingBox"` so the web's percentage positions map
directly. Three `<RadialGradient>` glows ported verbatim from the web dark theme
(`apps/dorkroom/src/styles/utilities.css`), over base `#070708`:

| Glow | Position | Color → transparent |
| --- | --- | --- |
| Warm peach (top-center) | `cx 0.5, cy -0.1` | `rgba(249,159,150,0.10)` |
| Red (bottom-left) | `cx 0.12, cy 0.90` | `rgba(243,70,70,0.14)` |
| Orange (bottom-right) | `cx 0.88, cy 0.95` | `rgba(229,122,60,0.10)` |

**Grain:** a small (160×160) tiling noise PNG asset overlaid at ~0.07 opacity.
A pre-rendered tile is the robust cross-platform equivalent of the web's SVG
`feTurbulence` noise (react-native-svg's filter support is unreliable across
platforms). The tile can be generated from the same fractal-noise parameters
the web uses (`baseFrequency 0.85`, 2 octaves).

### `Screen` change (`apps/mobile/src/components/screen.tsx`)

Render `<GradientBackground />` as the absolute base and make the `ScrollView`
transparent, replacing today's flat `bg-[#0b0b0c]`. One edit → every screen
gets the gradient for free.

### Refreshed card / section system

- Keep `GlassCard` (Liquid Glass on iOS 26, `bg-white/10` fallback) but add a
  hairline `border-white/10` and tighter internal spacing rhythm.
- New `SectionLabel` for grouping inputs inside a card.
- New `ResultCard` variant with a faint **per-calculator accent glow** mirroring
  the web accent colors: **exposure = blue, resize = teal, reciprocity = amber**.
  Each screen keeps its own identity while sharing the system.

### New reusable input primitives (`apps/mobile/src/components/`)

- **`Stepper`** — value with −/+ buttons, configurable increment, press-and-hold
  repeat, haptic per tap.
- **`PresetChipRow`** — horizontal scroll of tappable chips with a selected
  state (exposure stop presets; reciprocity time presets).
- **`SegmentedControl`** — replaces the plain `Switch` (resize mode toggle,
  in/cm unit toggle).
- **`FormulaRow`** — monospace formula box (e.g. `10 × 2^1.0 = 20s`), matching
  the web's mono formula display.
- **`ResultStat`** — large headline result (big value + label + sub-helper),
  distinct from the existing small `ResultRow`.

### Native extras in the primitives

- `expo-haptics` feedback on stepper / chip / segment interactions.
- A built-in **Share** button on each `ResultCard` (RN `Share` API) that shares
  formatted result text.

---

## Section 2 — Exposure (accent: blue)

`apps/mobile/app/(tabs)/exposure.tsx`, consuming `useExposureCalculator`
(`@dorkroom/logic`).

- **Inputs card:** original-time field; a `PresetChipRow` with the full web set
  (−1, −½, −⅓, +⅓, +½, +1) **plus** a `Stepper` for fine ±⅓ nudges — both bound
  to the same `stops` value (parity with web presets + custom input).
- **Results card (blue):** `ResultStat` "New time" with "+1.0 stops" sub-helper;
  `FormulaRow` `10 × 2^1.0 = 20s`; rows for added/removed exposure (with %
  change), multiplier (×2.000), original time, stop adjustment; Share button.
- **Native extra:** stepper hold-to-repeat + haptics.

All outputs already available from the hook's `calculation`
(`newTimeValue`, `addedTime`, `percentageIncrease`, etc.) and `presets`.

---

## Section 3 — Resize (accent: teal)

`apps/mobile/app/(tabs)/resize.tsx`, consuming `useResizeCalculator`.

- **Inputs card:** `SegmentedControl` for **Print Size | Enlarger Height**
  (replaces the plain switch); `SegmentedControl` for **in | cm** — a cosmetic
  label toggle, since the ratio math is unitless (units cancel in both
  area-ratio and height²-ratio formulas), so it carries no calculation risk.
  - Print mode → `FieldPair` original W×L, `FieldPair` new W×L, original time.
  - Enlarger mode → original height, new height, original time.
- **Native extra:** an **aspect-ratio preview** — nested SVG rectangles showing
  original vs. target proportions, highlighting a mismatch/crop (print mode only).
- **Results card (teal):** `ResultStat` "New time"; "Stops difference" with
  contextual helper ("larger — add exposure" / "smaller — remove exposure" /
  "same size"); mode-dependent `FormulaRow` (area ratio vs. height² ratio); amber
  aspect-mismatch warning when applicable (`isAspectRatioMatched` from the hook);
  Share button.

---

## Section 4 — Reciprocity (accent: amber)

`apps/mobile/app/(tabs)/reciprocity.tsx`, consuming `useReciprocityCalculator`.

- **Inputs card:** a **`FilmPicker` bottom sheet** (reusing the existing
  `BottomSheet`) listing all 14 films + Custom — cleaner than a long pill scroll
  for that many items. Custom-factor field appears only when Custom is selected.
  Metered-time field with format parsing (`30s`, `1m30s`, `2h`) + inline error
  (`timeFormatError` from the hook). `PresetChipRow` of the 9 time presets
  (`exposurePresets`).
- **Native extra:** a **`ReciprocityChart`** — a `react-native-svg` port of the
  web log-log curve (`packages/ui/src/components/reciprocity-chart.tsx`), marking
  the original and adjusted points; shown inline in its own card with an "Expand"
  to a full-width modal. Read-only with labeled markers (no hover). **This is the
  single heaviest item; it lands last and can be phased without blocking the rest.**
- **Results card (amber):** `ResultStat` "Adjusted exposure" with film-name
  helper; `FormulaRow` `30^1.54 = …`; rows for added exposure (with %), film,
  factor, original time; Share button.

---

## Section 5 — Verification & testing

- **Pure helpers get unit tests:** the chart's log-log scale mapping, share-text
  formatting, and the in/cm label toggle. Calculation math already lives in and
  is tested by `@dorkroom/logic` — reused, not reimplemented.
- **Components:** visual/manual verification by running the app in Expo (iOS
  simulator), checking each screen against this design and confirming the
  gradient + grain render on device.
- **Gate:** root `bun run test` + React Doctor target the web app. For mobile,
  run the mobile workspace's own lint + typecheck and an Expo build/prebuild
  check. (Exact mobile commands to be confirmed from `apps/mobile/package.json`
  during planning.)
- **Changelog / versioning:** this touches the iOS app, so the entry goes in
  `apps/mobile/CHANGELOG.md` with the mobile `package.json` CalVer bump — not the
  root web changelog.

---

## Out of scope

- Web app changes of any kind.
- Theme switching / light mode on mobile (app is dark-only).
- The other mobile screens (Border, Light Meter) beyond inheriting the new
  gradient background.
- Persisting calculator state (web uses localStorage; mobile parity here is not
  requested).
