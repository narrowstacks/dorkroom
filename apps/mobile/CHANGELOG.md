# Changelog — Dorkroom Mobile (iOS)

All notable changes to the `@dorkroom/mobile` iOS app are documented here.
Web app changes live in the [root CHANGELOG](../../CHANGELOG.md).

This project uses [CalVer](https://calver.org/) date-based versioning: `YYYY.MM.DD`.

## [Unreleased]

### Changed

- The resize calculator now defaults to **landscape** print sizes — original 6×4 (was 4×6) and target 9×6 (was 6×9).

## [2026.06.26]

### Added

- **Meter settings drawer** — a gear (top-left) opens a sheet for meter-only settings; **calibration** moved here from the always-on top-right stepper.
- **Standalone meter** — a "Link to film log" toggle disables all film-log integration (roll pill, EI lock, log-to-roll shutter) for a clean viewfinder with a freely-scrubbable ISO. Defaults on when you have rolls, off when the film log is empty.
- **Metering-mode label** — the readout names the active exposure priority ("Aperture priority" / "Shutter priority"), and the Matrix/Spot toggle now uses icons.

### Changed

- **Live scrubbing** — dragging a dial updates its value and the dependent solved value/EV in real time as the finger moves, instead of only on release.
- **Readout typeface** — switched from Menlo to the system font (San Francisco) with tabular figures; apertures render with the florin glyph (ƒ).
- **Readout affordances** — moved the drag hint out of the digits so extreme values (ƒ/64, 1/4000) no longer crowd; dropped the redundant aperture/shutter lock icons (the priority label covers them) and kept only the ISO lock, now larger with a light-red cell highlight.
- **Bottom layout** — moved the Matrix/Spot toggle to the bottom-right and brought the capture button down, closer to the readout.

### Fixed

- **ISO "Custom" no longer opens mid-scrub** — the custom-entry sheet appears only when you release on "Custom", not the instant you scroll over it.

## [2026.06.24]

### Added

- **Film Log photos** — the light meter's shutter button captures a reference photo and attaches it to the logged shot via a quick-confirm sheet; manual shots can import a photo from the library. Photos are stored in-app (deleted with the shot/roll), shown as thumbnails with a full-screen viewer, and **saved in black & white when the roll is B&W**. Optional setting to also save meter photos to the iOS Photos library (default off).

### Changed

- **Light meter UI pass** — reworked the meter screen toward the iOS Camera look. The top controls (ISO/EI lock, roll picker, calibration) are now unified, larger "glass" pills with SF Symbol icons, the roll picker aligned under the lock, and the engaged ISO lock reading yellow. The capture button is bigger with a wider, thinner ring and a clear gap to the core, and it hides while a dial is being scrubbed. Tightened the gap between the readout and the tab bar. Replaced the floating value wheel with a flat horizontal tick ruler (drag right **or** up = brighter — a vertical swipe scrubs it too) that loops infinitely with a small gap at the seam, has a yellow center window, and keeps the "Custom" ISO entry. Custom ISO entry is now a centered pop-up that raises the keyboard immediately.
- **Light meter control polish** — tightened the glass readout layout so instrument positions stay fixed as values change, reduced the calibration control, stacked EI/roll controls beneath it, and added a tap hint so brief taps explain that aperture, shutter, and ISO values are selected by holding and dragging.

### Fixed

- **Meter ISO lock now follows the selected roll.** With more than one active roll, the ISO lock pinned to the first active roll's EI instead of the roll shown in the meter's roll pill — so metering for, say, Portra 160 could stick the ISO at another active roll's speed. It now locks to the EI of the roll the meter is logging to.

## [2026.06.23]

### Added

- **Film Log** — a film roll tracker (new "Film Log" tool/tab). Catalog shots on rolls (camera, film stock, B&W/color/slide, ISO/aperture/shutter, lens, and holder/back for 4×5 & multi-back bodies), keep a saved list of cameras and lenses, and export the whole log as JSON via the share sheet. Works standalone (manual entry) and from the light meter: a new "＋ Log" button on the Meter screen prefills a shot with the current metered settings. Rolls/cameras/lenses persist locally (MMKV) and validate through Zod on read. Details:
  - Lenses accept a free-form **max aperture** (e.g. f/2.5, f/1.7), not just full/half stops.
  - A roll is rated at a single **ISO / EI** (box speed by default, raise/lower to push/pull) that all its shots inherit. The light meter's ISO can **lock to the active roll's EI** (default on, tap to unlock); logging a reading metered at a different ISO shows a mismatch warning on the new-shot screen.
  - Film picker uses a stubbed stock list pending the mobile film-database integration, and you can **add your own film stock** when it isn't listed; custom stocks persist in their own list and will merge on top of the real database once it's wired in.
  - Photo capture, databack-style imprinting, and Lightroom export are planned follow-ups.
- Lucide icons across the navigation — shared with the web app — on the More/Edit rows and the native tab bar (generated PNG assets via `scripts/generate-tab-icons.mjs`).

### Changed

- More page redesigned as inset glass cards, searchable.
- Tab-bar customization now uses hold-to-drag reordering (replacing up/down buttons).
- `@dorkroom/mobile` React Doctor score raised to 100/100.
- Upgraded to **Expo SDK 56** (React Native 0.85, React 19.2). Aligned every `expo-*` package and native module to the SDK, and migrated the breaking APIs: `react-native-mmkv` v4 (`new MMKV()` → `createMMKV()`, `delete` → `remove`), the `expo-router/unstable-native-tabs` namespaced `NativeTabs.Trigger.Icon`/`.Label` API, and the expo-router/React Navigation split (focus + theme hooks now import from `expo-router`; dropped the direct `@react-navigation/native` dependency).

## [2026.06.22]

### Added

- Native light meter screen ("Meter" tab): a full-screen camera preview that reads
  the scene's exposure value from the device's auto-exposure, with a center reticle
  and tap-to-spot-meter (locks the reading). The overlay solves camera settings
  against a chosen film ISO in aperture- or shutter-priority, flags out-of-range
  shutter speeds, and supports a persisted calibration offset. EV/solver/smoothing
  math is a pure, unit-tested module in `@dorkroom/logic`; the camera wiring uses
  `react-native-vision-camera`.
- Full native iOS border calculator screen — a visual print/border preview
  (light-grey paper, dark-grey image area, easel blades with the web-matched
  `#1b1b1d` color and drop shadow, and blade-reading labels) plus controls for
  aspect ratio, paper size, minimum border, landscape/ratio-flip, H/V offsets
  (with an "ignore min border" toggle), and blade/reading visibility, via a
  summary-row → bottom-sheet layout. Preview geometry, blade-reading
  positioning, and formatting are pure, unit-tested modules; sliders use
  `@react-native-community/slider`.
- iOS home screen quick actions: long-pressing the app icon now shows shortcuts
  that jump straight to the Light Meter, Border, Exposure, and Reciprocity pages.
- iOS Siri / Spotlight / Shortcuts-app support (App Intents): "Open Light Meter
  in Dorkroom" and the equivalent for Border, Exposure, and Reciprocity now work
  by voice, in Spotlight, and as Shortcuts-app actions. A "Calculate Reciprocity"
  action is present as a placeholder ("coming soon") ahead of functional
  calculator intents.
- A dedicated "Open Light Meter" Shortcuts/Siri action (separate from the generic
  open-page shortcuts) so the light meter can be assigned to the iPhone Action
  Button for one-press access.
- Gradient backdrop with film-grain overlay on every screen, ported from the web
  dark theme.
- Native share sheet, haptic steppers, and preset chips across the Exposure,
  Resize, and Reciprocity calculators. Share text includes the full inputs,
  multiplier/factor, and added exposure with percentage.
- Reciprocity: full film picker (14 stocks + custom factor), time presets, and an
  interactive SVG reciprocity curve — a compact inline preview that expands to a
  full-screen, drag-to-read chart with axes and grid, closed with an X.
- Resize: print-size and enlarger-height segmented controls for inch/cm unit
  switching, plus an aspect-ratio preview.
- Customizable bottom tab bar: pin up to 4 tools; reorder or swap them via a
  new "Edit Tabs" screen; the selection persists across restarts.
- New categorized, searchable "More" hub that lists every tool under five
  headings (Printing, Film, Camera, Reference, System) and is always reachable
  from the tab bar.
- New Settings screen with links to Edit Tabs, GitHub, and the newsletter, plus
  the running app version.
- Mat Cut, Lens Equivalency, and Camera Exposure added to the More hub as
  "coming soon" placeholders ahead of their full implementations.

### Changed

- Light meter: aperture / shutter / ISO are now adjusted by touch-and-hold and
  dragging up (brighter) or down (darker) directly on the readout, instead of
  tapping to open a separate picker. A floating wheel glides smoothly between the
  stops as you drag (with a haptic tick as each one crosses center) and wraps
  around at the ends (functionally infinite). The centered value is committed on
  release; releasing on a calculated setting locks it (flips aperture/shutter
  priority). The locked setting (priority + value) and ISO now persist across
  tab changes and app restarts.
- Force dark appearance app-wide (`Appearance.setColorScheme('dark')` +
  `userInterfaceStyle: "dark"`) so native glass surfaces render dark glass
  under a light system appearance instead of leaving light text on light cards.
- Rebuilt the Exposure, Resize, and Reciprocity screens to web feature parity:
  richer results rows (formula lines, multiplier, % change, contextual helpers)
  and removed the redundant in-page title headings.
- Reworked the bottom-sheet drawer backdrop: a full-screen scrim that fades in on
  the same timeline as the panel slide (no more backdrop scroll-up or scrim
  appearing ahead of the panel). The border calculator opts out of the scrim so
  the print preview stays visible while editing.

## [2026.06.21]

### Added

- iOS app scaffold (Expo Router, NativeWind v4, iOS 26 Liquid Glass) with
  native border, exposure, reciprocity, and resize calculators reusing
  `@dorkroom/logic` and `@dorkroom/api`.
- Local EAS build pipeline (`eas build --local`) that builds and installs a
  standalone iOS app on-device. Uses an App Store Connect API key for Apple
  auth (no 2FA), `react-native-nitro-modules` (MMKV 3.x peer), a Metro resolver
  that bundles `@dorkroom/*` from source with a single pinned React, a Hermes
  `Array.prototype.toSorted` polyfill, and an install hook that keeps NativeWind
  v4 on Tailwind v3 alongside the web app's Tailwind v4. See
  `apps/mobile/README.md`.
