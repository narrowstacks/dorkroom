# iOS Border Calculator — Preview + Full Controls

**Date:** 2026-06-21
**Branch:** `feat/mobile-border-preview`
**Status:** Design approved

## Goal

Port the web "mobile" border calculator into a proper native iOS screen
(`apps/mobile`). The current `app/(tabs)/index.tsx` is a stripped-down
placeholder (aspect/paper/min-border pills + numeric rows, no visual). Replace
it with a native screen that mirrors the web `MobileBorderLayout` composition
and feature set, rebuilt on React Native / Expo primitives.

## Scope (decided)

- **Full controls:** aspect ratio, paper size, min border, landscape +
  ratio-flip toggles, **H/V image offsets**, **blade overlay toggle**, **blade
  reading numbers**, and **warning banners**.
- **Visual print/border preview** — the core new piece.
- **Static** preview (re-lays-out instantly on change; no Reanimated).
- **Excluded:** presets (save/load), sharing, custom aspect/paper numeric
  entry. (The hook supports custom values; we just don't expose entry UI in
  this iteration.)

## Conventions

- **No in-page header.** Per project convention, iOS screens omit the
  page-title block — the native tab bar already labels the screen. Content
  starts at the first card.
- Follow the web-mobile UX pattern (`MobileBorderLayout`) for structure, but
  use RN/Expo idioms (`View`/`Text`/`Pressable`/`Modal`, NativeWind classes,
  `GlassCard`).
- Reuse existing mobile primitives where they fit: `Screen`, `GlassCard`,
  `OptionRow`, `ResultRow`, `LabeledTextField`.

## Data layer

Keep the already-wired **`useBorderCalculator`** imported from
`@dorkroom/logic`. Note: this public export resolves to the **modular**
composed hook (`hooks/border-calculator`), not the deprecated monolith (the
monolith is exported separately as `useLegacyBorderCalculator`). The mobile
screen already imports the modular one; its public API exposes everything
Full-controls needs:

- State + setters: `aspectRatio`, `paperSize`, `minBorder`/`setMinBorderSlider`,
  `enableOffset`, `horizontalOffset`/`setHorizontalOffsetSlider`,
  `verticalOffset`/`setVerticalOffsetSlider`, `showBlades`, `showBladeReadings`,
  `isLandscape`, `isRatioFlipped`, `resetToDefaults`.
- `calculation` — includes the percentage fields the preview needs
  (`leftBorderPercent`, `topBorderPercent`, `printWidthPercent`,
  `printHeightPercent`, `rightBorderPercent`, `bottomBorderPercent`), the blade
  readings (`leftBladeReading` … `bottomBladeReading`, `bladeThickness`), and
  the raw dimensions (`printWidth`, `printHeight`, `paperWidth`, `paperHeight`).
- Warnings: `bladeWarning`, `minBorderWarning`, `paperSizeWarning`,
  `offsetWarning`.

Switching to the modular hooks is explicitly out of scope (avoid churn);
note it as possible future work.

Values are in inches; format as `X.XX"` (matches the existing screen). No
unit-conversion (cm) in this iteration.

## New dependency

`@react-native-community/slider` — standard RN slider for the continuous
controls (min border, H/V offsets). It is a native module, so it requires one
dev-client rebuild (the project already builds locally via EAS).

## Component architecture

```
app/(tabs)/index.tsx                     # rewritten — composes the screen (no header)
src/components/bottom-sheet.tsx          # generic bottom-anchored RN Modal sheet
src/components/border/
  border-preview.tsx                     # paper + print rect + blades (the visual)
  blade-readings.tsx                     # blade-reading labels overlay (ported positioning)
  warnings-card.tsx                      # renders the warning banners
  nav-row.tsx                            # summary row: label + value + chevron (opens a sheet)
  slider-row.tsx                         # labeled slider (label + value + Slider)
  sections/
    paper-image-section.tsx             # aspect pills + paper pills + landscape/flip toggles
    border-size-section.tsx             # min-border slider
    position-section.tsx                # enable-offset toggle + H/V sliders
```

Each unit has one purpose, takes plain props, and is independently
understandable. Section components receive the slice of hook state/setters they
need (passed down from the screen), keeping them free of hook coupling.

### Screen composition (top → bottom)

1. **Preview card** (`GlassCard`, hero) — `<BorderPreview>` + caption
   `${printWidth}" × ${printHeight}" image on ${paperLabel}`.
2. **Warnings card** — `<WarningsCard>`, rendered only when any warning is set.
3. **Settings card** (`GlassCard`):
   - `<NavRow label="Paper & Image Size" value="2:3 on 8×10" />` → paper-image sheet
   - `<NavRow label="Border Size" value="0.5\"" />` → border-size sheet
   - `<NavRow label="Position & Offsets" value="Centered" | "H:0.2 V:0.0" />` → position sheet
   - Two-column toggle buttons: **Blades** / **Readings**.
4. **Reset to Defaults** button → `resetToDefaults()`.
5. The three `<BottomSheet>` instances (one open at a time via `activeSection`
   state on the screen).

## Preview geometry (`border-preview.tsx`)

Replaces the web DOM/CSS `AnimatedPreview`. Pure layout from the hook's
percentage fields.

1. Measure container width `W` via `onLayout`.
2. Size the **paper box** to the paper's real aspect: `aspect =
   paperWidth / paperHeight`; `boxW = W`, `boxH = W / aspect`, clamped so
   `boxH ≤ MAX_H` (e.g. 320) — if clamped, recompute `boxW = boxH * aspect`.
   Center the box horizontally.
3. **Paper** = a `View` with a subtle border/background filling the box.
4. **Print area** = an absolutely-positioned `View`:
   - `left = leftBorderPercent/100 * boxW`
   - `top = topBorderPercent/100 * boxH`
   - `width = printWidthPercent/100 * boxW`
   - `height = printHeightPercent/100 * boxH`
   - distinct fill/border so it reads as the exposed image.
5. **Blades** (when `showBlades`) — four thin `View` lines at the print
   rectangle's edges, each spanning the full paper-box width (horizontal
   blades) or height (vertical blades), using `bladeThickness` (min ~2px for
   visibility). `overflow: hidden` on the paper box.
6. **Blade readings** (when `showBladeReadings`) — `<BladeReadings>`.

### `blade-readings.tsx`

Port the web `BladeReadingsOverlay` positioning logic to RN:

- Compute print edge pixel positions from the percent fields × box size.
- Decide `hInside` / `vInside` by whether both opposing labels fit
  (`printWidth > labelWidth*2 + pad*2`, same for vertical).
- Clamp outside-label positions to stay on-canvas.
- Render each reading as an absolutely-positioned `View` with arrow `Text`
  (`←/→/↑/↓`) + value `Text`, applying the inside/straddle transform via
  `translateX/translateY` offsets (RN has no `translate(-50%)`; precompute pixel
  offsets from measured/estimated label size, or use
  `transform: [{ translateX }, { translateY }]` with half-label constants).
- `pointerEvents="none"`.

## Bottom sheet (`bottom-sheet.tsx`)

RN `Modal` with `transparent`, `animationType="slide"`, a dimmed backdrop
`Pressable` that closes on tap, and a bottom-anchored `GlassCard`/`View`
container holding the section content + a title and a "Done" affordance. No new
native module (no sheet library). Honors safe-area bottom inset.

## Controls behavior

- **Paper & Image Size sheet:** `OptionRow` for aspect ratios
  (`ASPECT_RATIOS`) and paper sizes (`PAPER_SIZES`); toggle rows for
  **Landscape** (`isLandscape`) and **Flip ratio** (`isRatioFlipped`).
- **Border Size sheet:** `<SliderRow>` 0.25"–1.5", step 0.05",
  `onValueChange → setMinBorderSlider`. (The current preset-pill set
  `[0.25,0.5,0.75,1,1.5]` is replaced by the continuous slider.)
- **Position & Offsets sheet:** toggle **Enable offset** (`enableOffset`); when
  on, two `<SliderRow>`s for H (−2…+2 → `setHorizontalOffsetSlider`) and V
  (−2…+2 → `setVerticalOffsetSlider`).
- **Blades / Readings** toggles flip `showBlades` / `showBladeReadings`.

## Accessibility

- All `Pressable`s get `accessibilityRole="button"` and
  `accessibilityState={{ selected }}` for toggles/pills (mirrors `OptionRow`).
- Sliders get `accessibilityLabel` describing what they adjust.
- Preview is decorative for AT but caption text conveys the key dimensions.

## Verification

- `bun run test` (lint + test + build + typecheck) green.
- `npx react-doctor@0.2.1 --verbose` → all three projects still 100/100.
- Manual: run on device/simulator (dev-client rebuild for the slider module),
  confirm the preview updates correctly across aspect/paper/border/offset/
  landscape/flip changes, blades + readings toggle, and warnings appear
  (e.g. min border < 0.25" → warning; large offset pushing image off paper →
  offset warning).

## Out of scope / future work

- Presets (save/load via MMKV) and sharing.
- Custom aspect-ratio / custom paper W×H numeric entry.
- Unit conversion (cm).
- Migrating off the deprecated `useBorderCalculator` to the modular hooks.
- Stripping the leftover scaffold page-title headers from the other mobile
  screens (exposure/reciprocity/resize) per the no-header convention.
