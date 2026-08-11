# Changelog — Dorkroom Mobile (iOS)

All notable changes to the `@dorkroom/mobile` iOS app are documented here.
Web app changes live in the [root CHANGELOG](../../CHANGELOG.md).

This project uses [CalVer](https://calver.org/) date-based versioning: `YYYY.MM.DD`.

## [2026.08.17]

### Changed

- **Upgraded to Expo SDK 57** in one deliberate pass (`expo install expo@^57 --fix`), replacing a mixed state in which individual `expo-*` packages had been bumped across an SDK boundary while `expo` itself stayed on `^56` — which left duplicate native modules installed and `expo-doctor` failing 3 checks. It now reports 20/20. React Native moves to 0.86.2.
- **Several native modules moved *back down* to the versions the SDK supports.** Dependabot had pushed them past the compatible set: `react-native-gesture-handler` 3.1.0 → 2.32.0, `react-native-worklets` 0.11.3 → 0.10.1, `@shopify/react-native-skia` 2.6.9 → 2.6.2, `react-native-svg` 15.15.5 → 15.15.4. Dependabot no longer proposes updates for Expo SDK-managed packages, so this should not recur.
- **`react`/`react-dom` return to 19.2.7, matching the repo root.** This reverses the 19.2.3 pin added in [2026.07.04] — that pin was necessary under React Native 0.85.3, which vendored a renderer hard-tied to 19.2.3 and crashed with "Incompatible React versions" on any mismatch. React Native 0.86.x declares `peerDependencies.react: "^19.2.3"` and no longer carries that assertion, so the two versions are compatible again. Realigning removes a nested duplicate React, which had quietly promoted `metro.config.js`'s single-instance guard from inert safety net to load-bearing. `react` is listed in `expo.install.exclude` because the SDK pins 19.2.3, and a patch-level deviation is far safer than two React copies.

## [2026.08.11]

### Fixed

- **App no longer trap-crashes at launch when built with Xcode 27 / the iOS 27 SDK.** UIKit kills apps linked against the iOS 27 SDK that have not adopted the UIScene lifecycle (`EXC_BREAKPOINT` in `__UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, [Apple TN3187](https://developer.apple.com/documentation/technotes/tn3187-migrating-to-the-uikit-scene-based-life-cycle)) — before any JS loads, so it presents as an instant launch crash with no red box. iOS 26 only warned; iOS 27 made it fatal, which is why this appears now without any app change. Expo's prebuild template has not adopted scenes yet ([expo/expo#46664](https://github.com/expo/expo/issues/46664), blocked upstream on [facebook/react-native#54739](https://github.com/facebook/react-native/issues/54739)), so a local config plugin (`plugins/with-ios-scene-lifecycle`) injects a `UIApplicationSceneManifest` into `Info.plist` and patches the generated `AppDelegate.swift` with a `SceneDelegate` that starts React Native from the connected scene and forwards deep links, universal links, home-screen quick actions, and app life-cycle events back to the Expo app-delegate subscribers — so `expo-dev-launcher` and `expo-quick-actions` keep working. Remove the plugin once the Expo SDK ships a scene-based template; its patch anchors throw loudly if the template changes, so a future SDK bump fails prebuild rather than silently regressing.

## [2026.07.04]

### Fixed

- **App no longer crashes on launch with "Incompatible React versions".** A repo-wide bump of `react`/`react-dom` to `19.2.7` also moved the mobile app off the version React Native 0.85.3 vendors its renderer at (`19.2.3`), so `react` and `react-native-renderer` no longer matched. The mobile app is pinned back to `react`/`react-dom` `19.2.3` (the web app stays on `19.2.7`); the divergence reactivates the app-local React pin already present in `metro.config.js`, so every importer — including React Native and the source-bundled `@dorkroom/*` packages — resolves the single `19.2.3` copy the renderer expects.

## [2026.07.03]

### Added

- **Film/developer-first recipe browsing** — the Recipes list now shows always-visible Film and Developer selectors directly under the search bar (one tap to the picker, one tap to clear via an inline "X"), instead of burying the two most important selections as unstyled rows inside the filters sheet. The sheet is now a focused "Sort & filter" surface for sort order, dilution, ISO/push-pull, developer type, and tag, with a live "N recipes match" count and a "Reset sort & filters" action scoped to those secondary filters (film/developer selection and search are untouched by it). A no-results empty state now offers a "Clear all filters" recovery action instead of a dead end.

- The app now sends a per-install identity (`X-Client-Id`) with every request to the shared public API. Previously every install shared one global rate-limit budget on the embedded free-tier key; the server now applies rate limits per device instead, so heavy use on one phone no longer affects others. The id is generated once and persisted locally (MMKV); it is not a secret and not a tracking identifier — a reinstall mints a new one.
- **Development Recipes** — a new permanent "Recipes" tab lets you browse film-development recipes from the Dorkroom API (searchable, with a filters sheet); a recipe's detail screen shows dev time/temp/agitation and links to "Start Process Timer".
- **Multi-stage film-processing timer** — a countdown timer (develop → stop → fix → wash → custom stages) that a recipe's "Start Process Timer" prefills from its time/temp/agitation, with pause/resume/skip controls and per-stage progress; also reachable as a standalone timer.
- **Agitation patterns** — the timer now knows each stage's agitation pattern (Ilford, Kodak, stand, semi-stand, continuous, or a fully custom schedule) and shows a live "Agitate" indicator with haptic cues at window start/end; presets prefilled from a recipe infer their pattern from the recipe's agitation method or source tag, and every stage's pattern is editable in the preset editor. The recipe detail screen's Agitation row now shows the derived schedule instead of the raw API field.
- **Live film database** — the app now fetches films, developers, and development combinations from the Dorkroom API (`api.dorkroom.art`) instead of a hardcoded stub. The Film Log's film picker shows the full film catalog (still merging your custom stocks on top), with loading and retry states and graceful offline fallback. Successful API responses are cached to disk (MMKV) and rehydrated on launch, so the catalog (and Recipes) still render from the persisted cache when offline.
- The Process Timer screen now stays awake while a run is active — the screen no longer auto-locks while the timer is running or paused, so a countdown mid-develop won't be interrupted by the system idle timeout.
- The AGITATE indicator now pulses while an agitation window is active (honors Reduce Motion); total time remaining with a finishes-at estimate and next-stage preview on the Process Timer; stage list shows each stage's agitation schedule.

### Changed

- **Bounded accent system** — each calculator now carries its signature color (exposure blue, resize teal, reciprocity amber, recipes green) through its selection controls, not just its results card; benign view toggles (Border's "Hide blades"/"Hide readings") and sheet dismiss actions are now neutral instead of brand rose, and the roll status label reads as metadata instead of an action. Rose stays reserved for buttons that commit or create, plus destructive text and links.
- The resize calculator now defaults to **landscape** print sizes — original 6×4 (was 4×6) and target 9×6 (was 6×9).
- Removed the stubbed film-stock list; the catalog is now sourced from the live API and mapped into the Film Log's lighter `FilmStock` shape.
- **Pinned tool slots reduced from 3 to 2** — the native tab bar holds at most 5 items; with Film Log, Recipes, and More now permanent, only 2 slots remain for user-pinned tools. Existing users with 3 pinned tools will have the 3rd truncated.
- **Recipe detail layout** — removed the film title duplicated below the native nav header, folded the recipe's source tag into a labeled "Source" row instead of a stray tag pill, moved "Start Process Timer" up so it renders right after the key facts, and made the Volume Mixer collapsible (collapsed by default) so the primary action fits within roughly one screen.
- **Recipe list cards now match the web table's indicators.** Official-source tags render as colored "Official <Brand> Recipe" check pills (previously a neutral gray pill); the ISO value now carries the push/pull arrow and delta inline, and the floating push/pull badge — which read as randomly positioned next to the film title — is gone; non-standard temperatures get a flame (hotter) or snowflake (colder) tint.
- **App version now follows CalVer**, matching the rest of the app (Settings previously showed a permanent, hardcoded "v1.0.0").
- Camera and lens forms' sheet header action is now labelled "Cancel" instead of "Done" — it discards, so it no longer reads as a second, competing save button next to the sheet's own "Add/Save camera" (or lens) button.
- The Film Log's "Export JSON" button is now labelled "Export data".
- Border calculator's minimum-border slider now shows its min/max range as endpoint labels.
- Unnamed film roll rows no longer repeat the film stock name in both the title and subtitle; the roll's started date is now shown alongside the shot count.
- Raised the contrast of the picker-field dropdown caret (film/lens/format selects, reciprocity's film picker) from `white/40`–`white/50` to `white/70` so the field no longer reads as disabled/read-only.
- The Lens field on the Add/Edit shot screen now shows a static "No saved lenses — add one under Cameras & lenses" hint instead of an empty, dead-end picker sheet when no lenses are saved.
- **The Film Log's film picker is now searchable and grouped by brand.** With the live catalog's hundreds of stocks, the old flat, unsearched 360pt list was unusable; the Film field now opens a search box plus a brand-grouped, virtualized list (your custom stocks pinned in a leading "Your films" section), with the last row no longer clipped.

### Fixed

- **Recipe list search and pickers are now punctuation-insensitive.** Searching "tri x" or "d 76" previously found nothing because the query had to match the film/developer name's exact punctuation; matching now normalizes punctuation and whitespace on both sides, so "Tri-X" and "D-76" are found regardless of how the hyphen/space is typed.
- **The Recipes filters sheet's Film/Developer pickers no longer opened as a modal stacked on top of another modal.** The film and developer picker sheets are now nested inside the filters `BottomSheet` (rather than presented as siblings), and closing the sheet resets any open picker instead of leaving it stranded.
- **Recipe detail always showed "Standard" agitation.** The Agitation row read a field the API client hardcodes to `null`; it now reads the API's actual `agitation_method` value (e.g. "Intermittent", "Stand") and falls back to "Standard" only when it's genuinely absent.
- **Deep links to filtered-out recipes showed "Recipe not found."** The recipe detail screen looked up its recipe in the currently-filtered list, so a `dorkroom://development/recipe/<uuid>` link to a valid recipe excluded by the active filters failed; it now searches the full, unfiltered combination list.
- **Deep links and quick actions now open unpinned tools.** Opening a `dorkroom://` link or a home-screen quick action for a tool that isn't currently pinned to the tab bar (e.g. Exposure or Reciprocity, unpinned by default since the pin cap dropped to 2) previously did nothing — the app just stayed on the current screen, because a native tab route is only reachable while its trigger is rendered. Incoming tool paths are now resolved against the current pin state and redirected to the tool's always-available More-stack screen when needed; all four quick actions now point there directly.
- **Film Log tool icon** — the More list previously fell back to a generic circle for Film Log (the icon map had no `film` entry, while the tab bar showed the correct film-strip icon); now both surfaces agree.
- **Camera permission is no longer requested at app launch.** The Meter screen now requests camera permission only while its tab is focused, instead of firing on first mount — previously the permission dialog could appear over the Border screen before the user ever opened Meter.
- **Edit Tabs now explains its at-capacity state** — when the tab bar is full, the dimmed "More tools" rows now show a "Tab bar is full — remove a tool to add another" hint instead of silently doing nothing when tapped.
- **Form screens no longer draw content through the navigation title while typing.** The More, Film Log, and Recipes stacks' large-title headers stayed fully transparent once content scrolled beneath them (e.g. focusing a keyboard field), so field labels and list rows drew straight through the title text. The header now stays on a blurred background at all times, so scrolled content is always occluded instead of double-drawn.
- **Editing an old roll no longer loses its film name.** Saving a roll whose `filmStockId` no longer resolves in the current catalog (e.g. a stub-era id, or an empty offline cache) used to silently blank out its stored film-name snapshot; the save path now keeps the roll's existing name when its film id is unresolved and unchanged.
- **Sort & filter options now respond instantly.** Changing sort/filters previously stalled the app for seconds per tap (per-comparison catalog scans while re-sorting ~1000 recipes), which read as taps doing nothing. The Recipes list's card re-render is now deferred (React's `useDeferredValue`) so filter/sort taps — including inside the Sort & filter sheet — commit immediately while the up-to-~1020-card list re-render happens in the background; the list is also tuned (smaller `windowSize`/batch sizes, `removeClippedSubviews`) to shrink the total render work per change.

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
