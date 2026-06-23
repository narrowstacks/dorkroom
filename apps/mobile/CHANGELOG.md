# Changelog — Dorkroom Mobile (iOS)

All notable changes to the `@dorkroom/mobile` iOS app are documented here.
Web app changes live in the [root CHANGELOG](../../CHANGELOG.md).

This project uses [CalVer](https://calver.org/) date-based versioning: `YYYY.MM.DD`.

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
  Resize, and Reciprocity calculators.
- Reciprocity: full film picker (14 stocks + custom factor), time presets, and a
  native SVG reciprocity curve chart.
- Resize: print-size and enlarger-height segmented controls for inch/cm unit
  switching, plus an aspect-ratio preview.

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
