# iOS Mat Cut Calculator — Design

**Date:** 2026-08-23  
**App:** `apps/mobile/` (Expo / React Native, iOS 26)  
**Status:** Approved

## Problem

The iOS tool registry, tab route, More-stack mapping, and icon already include
Mat Cut, but `MatScreen` still renders a Coming Soon placeholder. The web app
has a complete single-window mat calculator backed by the shared
`useMatCalculator` hook. The iOS port should expose that functionality while
feeling like the existing native Border calculator rather than reproducing the
web page's stacked form.

## Scope

Port the complete web Mat Cut workflow:

- Fraction-friendly outer-mat, border, artwork, and reveal inputs.
- Common board presets and orientation flips.
- Independent top, bottom, left, and right borders.
- Optional bottom weighting and best-fit border calculation.
- A live, proportional mat/window/artwork preview.
- Invalid-window and reveal-mismatch warnings.
- Window-opening dimensions, four cutter guide-bar instructions, and the full
  dimension summary.
- Existing synchronous persistence through `useMatCalculator` and the mobile
  MMKV-backed `localStorage` shim.
- Reset to the shared defaults.

No web code, shared calculator behavior, routing, native dependencies, or
analytics will change. Share-sheet output, multi-window mats, metric units, and
arbitrary mat presets are outside this port.

## Interaction Design

The screen follows the Border calculator's overview-and-sheets structure:

1. A top `GlassCard` contains the live mat preview and a compact caption for the
   current window opening.
2. A warning card appears only when the inputs produce an invalid window or the
   requested reveal does not match the calculated window.
3. A second `GlassCard` contains three `NavRow` summaries:
   - **Outer mat** — current width × height.
   - **Borders** — top, bottom, left, and right values.
   - **Artwork & best fit** — artwork dimensions and reveal, or a clear
     not-configured state.
4. Each summary row opens a `BottomSheet` with `showScrim={false}`, matching the
   Border calculator and keeping the preview visible while values change.
5. Results remain visible below the navigation card: a prominent window-opening
   summary followed by the four cutter guide-bar settings and a compact full
   dimension table.
6. A reset action at the bottom restores `MAT_CALCULATOR_DEFAULTS`.

All actionable controls receive explicit accessibility roles, labels, selected
or disabled state where relevant, and touch targets suitable for iOS.

## Components and Boundaries

`apps/mobile/src/screens/mat-screen.tsx` stays a thin composition layer. It calls
`useMatCalculator`, owns only which sheet is open, derives warning strings, and
connects shared state to native components.

New feature components live under `apps/mobile/src/components/mat/`:

- `mat-preview.tsx` renders the board, artwork footprint, window, and concise
  dimension labels with React Native views.
- `geometry.ts` computes proportional preview rectangles without React Native
  dependencies.
- `format.ts` builds stable summaries from the shared fraction formatter.
- `outer-mat-section.tsx`, `borders-section.tsx`, and
  `artwork-best-fit-section.tsx` render the three sheet bodies.
- `mat-results.tsx` renders the window opening, cutter settings, and dimension
  summary.

Existing mobile primitives are reused where they fit: `Screen`, `GlassCard`,
`BottomSheet`, `LabeledTextField`, `PresetChipRow`, `ToggleRow`, `ResultCard`,
and `ResultRow`. The generic Border `NavRow` and `WarningsCard` move from the
Border feature folder to the shared components folder; Border's imports change
without changing its rendered output, and Mat consumes the shared versions.
Mat-specific components remain in their feature folder instead of introducing
cross-feature dependencies.

Calculator math and persistence remain in `@dorkroom/logic`; mobile code does
not duplicate `bestFitBorders`, parsing, fraction formatting, or cutter
calculations.

## Preview Geometry

The pure geometry helper accepts the numeric outer dimensions, borders,
artwork dimensions, validity flags, available width, and a maximum preview
height. It returns rectangles for the outer board, window, and optional centered
artwork footprint.

The outer board preserves its real aspect ratio and fits both the available
width and height cap. Window and artwork rectangles use the same pixels-per-inch
scale. Invalid, non-finite, or non-positive inputs return an empty geometry
rather than negative React Native dimensions. The renderer shows a restrained
placeholder state until geometry is valid.

The visual treatment mirrors Border: neutral mat board, darker opening, cyan
Mat accent for the window and readings, rounded clipping, and compact overlays
that do not obscure the geometry.

## Input and Error Behavior

Text fields use the shared string state so decimals, simple fractions, and mixed
fractions round-trip unchanged. The keyboard remains permissive enough to enter
spaces and `/`; validation happens through the shared hook rather than native
numeric parsing.

Preset and flip actions update the same shared fields. Best fit is disabled when
`bestFitPreview` is null and shows the proposed border values before applying
them. Invalid inputs never throw and never produce negative layout dimensions.
Warnings use the shared hook's `valid` and `hasRevealMismatch` outputs.

Reset writes every field from `MAT_CALCULATOR_DEFAULTS` through the hook's
public setter. No new persistence store is introduced.

## Testing and Verification

Pure unit tests cover:

- Preview sizing for portrait, landscape, and constrained-height boards.
- Window and artwork rectangle placement.
- Invalid and non-finite input handling.
- Compact summary formatting and missing-artwork states.

Existing shared Mat hook and calculation tests remain the source of truth for
math, parsing, best fit, warnings, and persistence behavior.

Verification from `apps/mobile/`:

1. `bun run test`
2. `bun run typecheck`
3. `bun run lint`
4. Run the iOS app through Metro because the implementation is JS/TS-only.
5. Use the simulator accessibility tree to exercise all three sheets, fraction
   entry, presets, flips, bottom weighting, best fit, warnings, reset, and the
   cutter results.
6. Run the simulator accessibility audit and visually inspect the final screen.

## Success Criteria

- Mat Cut no longer renders a Coming Soon placeholder from either a pinned tab
  or the More stack.
- The native screen supports every calculation and result currently exposed by
  the web Mat Cut calculator.
- Its visual hierarchy and sheet-based editing closely resemble the native
  Border calculator.
- State persists across app restarts through the existing shared hook.
- Pure geometry and formatting tests pass, all mobile quality gates pass, and
  simulator verification finds no blocking accessibility issue.
