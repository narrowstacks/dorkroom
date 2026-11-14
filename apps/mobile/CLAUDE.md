# CLAUDE.md - `@dorkroom/mobile` (iOS app)

The native iOS app (Expo / React Native). It reuses `@dorkroom/logic` and
`@dorkroom/api` from the monorepo and renders them with a dark, Liquid-Glass UI.

> Read the root `/CLAUDE.md` first. Monorepo-wide rules (no `any`, no internal
> package paths, CalVer, toolchain) apply here too. This file covers what is
> **specific to the mobile app**. `apps/mobile/README.md` has the full build,
> credentials, and code-sharing reference; this file is the day-to-day
> conventions and the build-vs-reload decision guide.

## Before you start

1. **Check current docs** (Context7 when connected) for Expo, Expo Router,
   NativeWind, React Native, and `react-native-vision-camera` before changing
   how they're used.
2. This app is **iOS-only**, **dark-only**, targets **iOS 26**
   (`expo-build-properties` sets `deploymentTarget: "26.0"`), and runs on the
   New Architecture.

## Structure

```
index.js                 # custom entry: Hermes polyfills, then expo-router/entry
app/                     # expo-router file-based routes (typed routes on)
  _layout.tsx            # root Stack: polyfills, API config, dark theme, providers
  +native-intent.ts      # deep-link path rewriting
  (tabs)/
    _layout.tsx          # NativeTabs (Shoot, Develop, Print, Search); useQuickActionRouting lives HERE
    index.tsx            # Home, the Search tab and the launch route
    shoot/ develop/ print/   # one Stack per phase: _layout (PhaseStack), index (hub), [tool], settings
      shoot/film-log/    # Film Log screens, flat in the Shoot stack
      develop/recipes/   # recipe browser, recipe/[id], timer, flat in the Develop stack
src/
  screens/               # the actual screen components, one per tool
  components/            # PascalCase exports, kebab-case files; feature folders
  hooks/                 # mobile-only hooks (camera, meter, film log, last results)
  lib/                   # MMKV-backed stores, tool registry, export/share helpers
  schemas/               # Zod schemas for locally persisted data (film log)
  providers/             # query-client + query-persister
  polyfills/             # Hermes polyfills, MMKV localStorage shim
  theme/tokens.ts        # palette mirrored from web, for non-className values
  test/                  # vitest mocks for native modules
plugins/                 # local config plugins (with-app-intents, with-ios-scene-lifecycle, with-ios-status-bar-forwarding, with-local-notifications-only)
scripts/                 # ios.sh, nativewind tailwind link
```

Path alias: `@/*` maps to `src/*` (see `tsconfig.json`).

## Conventions

### Screens live in `src/screens`, routes are re-exports

A route file does one thing: render a screen. Every single-screen tool is served
by its phase's one `[tool].tsx` (`app/(tabs)/<phase>/[tool].tsx`, which renders
`PhaseToolRoute`), so a tool's canonical path is `/<phase>/<id>`
(`/print/exposure`, `/shoot/lens`). `[tool]` shows the not-found state for an id
that is unknown, a section, or another phase's tool.

`TOOLS` in `src/lib/tools.ts` is the **tool manifest**: id, label, Lucide icon
name, `phase` (`shoot`, `develop` or `print`), a short `blurb` for its hub tile,
and `kind`: `'screen'` (a single screen) or `'section'` (its own route files, with
a `path`: Film Log, Recipes, and Process Timer, which opens the timer Recipes
uses). The list order is the hub order. `route` is derived, never written by
hand, and `PHASES`, `getToolPhase` and `toolsForPhase` derive from it. Home and
Settings are not tools: `HOME_ROUTE` and `settingsRoute(phase)` stand for them. Its native half is
`TOOL_SCREENS` in `src/lib/tool-screens.ts` (the screen component), split out
because screens can't load under vitest, so `tools.ts` stays pure and the tab
layout and hubs don't load every screen up front. Adding a single-screen tool
means: the screen in `src/screens/`, a `TOOLS` entry (`kind: 'screen'`, in the
position it should have on the hub), a `TOOL_SCREENS` entry (a missing one is a
compile error), and a `toolId` on its `Readout` only if it is answer-first and `persistsInputs`.
`src/lib/tool-manifest.test.ts` fails if a route file, phase table, quick action
or App Intent disagrees with the manifest.

**Phase stacks.** `PhaseStack` (`src/components/hub/phase-stack.tsx`) is the one
stack layout all three phases use: the hub at `index`, `[tool]`, and any section
screens the phase passes as children. Section screens sit flat in the phase stack
(no nested Stack), so a push from the hub always has the hub to go back to and
there is only one header. Each layout exports
`unstable_settings = { initialRouteName: 'index' }` so a deep link builds the hub
under the tool. `PhaseHub` (`src/screens/phase-hub.tsx`) is the hub: two-column
`ToolTile`s, each showing the tool's last result (`last-result-store.ts`, written
by `Readout`'s `toolId` prop through `useRecordResult`, 500ms trailing) or its
blurb. Only a tool that is answer-first and restores its inputs
(`persistsInputs`, typed as `RecordingToolId`) records one: a tool that resets
when reopened would show a tile that contradicts the tool. Shoot adds the active roll card (the roll the Meter logs to, or a prompt to
start one). Settings is an ordinary pushed screen registered once in `PhaseStack` (not a
modal: a link arriving while a modal is open would push the tool inside it), with
a route file per phase (`<phase>/settings.tsx`), so it has that hub underneath. The gear
in each hub header opens its own phase's (`settingsRoute(phase)`); the screen
resets the phase context so Settings keeps the neutral glow. Pushed screens keep
the native back button: it shows the previous scene's title, the phase name.

**Legacy paths.** Quick actions (`app.json`), App Intents, `dorkroom://` links
and old shares still carry pre-phase paths (`/more/meter`, `/lenses`,
`/film-log`, `/development`) and can't change without a native build.
`resolveLegacyPath` (`src/lib/deep-link.ts`) maps them to canonical paths and
passes everything else through (legacy `/settings` opens Shoot's Settings).
`app/+native-intent.ts` applies `resolveIncomingLink` to incoming URLs
(`redirectSystemPath`): expo-router hands that hook the FULL URL
(`dorkroom://meter`, host as the first path segment), so only the app's own
scheme (`APP_SCHEME`, checked against `app.json`) is rewritten and everything
else, `https://` and `exp+dorkroom://` included, passes through. Quick actions bypass that hook: the router calls
`router.navigate` itself, so `src/lib/quick-action-route.ts` (wired in
`quick-action.ts`) is the `useQuickActionRouting` callback that resolves the href and navigates with an
anchor, through the warm-link handoff below when the tool's phase is not on screen. Don't repoint them without a native rebuild; keep the resolver table
true instead.

**Warm links into a hidden tab go in two steps.** A link that arrives while the
app is running and goes straight to a tool in a tab that is not on screen can
pop screens off that tab while it is being selected, and the native stack then
draws the wrong header (or the hub) over the right screen (the JS state is
correct; the native view is stale). So a warm link into a tab that is not on
screen resets that tab's stack to its hub before opening the target, while a
link into the tab on screen navigates directly and keeps the user's place.
`handOffWarmLink` (`src/lib/link-handoff.ts`) decides: for a phase link whose
phase is not the current route's (another phase, Home or an unknown route) it
keeps the real target in an in-memory handoff and `redirectSystemPath` returns
the phase hub (`/develop`). `useLinkHandoff` (mounted in the tabs layout, which
also reports the current route to the handoff) then opens the target with
`router.navigate` once the hub is the current route. It hands the target over
exactly once, drops it after 2s or when the user lands elsewhere first, and a
newer link replaces an older pending one. Quick actions use the same decision.
Cold links skip all of this: they build the stack fresh and were always right.
Because the hub is the page underneath, a handed-off link's Back button names the
phase hub, never the tool that happened to be open.

**Calculator links.** Home answers open a calculator pre-filled by passing the
link's params (`xCalculatorLink.build`) as search params on the tool's route.
The screen reads them with `useLinkOverrides(xCalculatorLink)` and hands them to
the shared hook as `overrides`. Those apply on mount only, so the hook returns a
key and the screen puts it on its body to re-mount it when a new link arrives.
Add that wrapper to any new calculator screen that Home can link to.

### Routing and screens

- **expo-router v57** with file-based, **typed routes** (`experiments.typedRoutes`).
  Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`). The tab set is
  fixed: Shoot, Develop, Print, then Home as the Search tab. Icons are SF
  Symbols (`<Icon sf=...>`, no image assets), and the selected tab takes its
  phase's hue (white on Search). The tabs layout exports
  `unstable_settings.initialRouteName = 'index'`, which only affects the state
  built from a deep link; `NativeTabs` doesn't pass it to its router, and the
  launch tab is Home because `/` matches `(tabs)/index`. Home is a plain last tab, not `role="search"`: that role is only
  the legacy system item (stock title and icon) and adds nothing here.
- **Dark only.** Don't add light-mode branches. `app/_layout.tsx` forces
  `Appearance.setColorScheme('dark')`, uses `DarkTheme`, and `headerShown: false`. The light status bar comes from the
  stack's `statusBarStyle` option (`statusBarOptions` in `theme/stack-chrome.ts`);
  never reintroduce a `StatusBar` component. `app.json` sets `userInterfaceStyle: "dark"`.
- **Screens are thin view layers.** A screen is an exported `PascalCaseScreen`,
  pulls all state and logic from a shared `@dorkroom/logic` hook (e.g.
  `useExposureCalculator`), and composes `<Screen>` plus `GlassCard` plus row
  components. Calculator math belongs in `@dorkroom/logic`, never in a screen.
- **No in-page title header.** The tab bar or the pushed stack header already
  names the screen, so don't render a redundant `<Text>Reciprocity</Text>`
  heading.
- Wrap normal content in `<Screen>` (scrolls, padding 16, gap 16, bg `#0b0b0c`).
  Full-bleed screens (the camera meter) skip it. The Meter is `fixedLayout`
  (standard title, never large), and offsets its top controls by the real header
  height (`HeaderHeightContext`) so they sit below the Back button and title.
- **Answer-first calculators** (Exposure, Reciprocity, Camera Exposure, Lenses,
  Resize): the result is a `Readout` passed to `<Screen header={...}>`, a
  non-scrolling slot above the scroll view that clears the native header when
  pushed in a phase stack (or the top safe-area inset on Home) and stays visible
  with the keyboard up. Four of them (not Camera Exposure, whose fields are
  pickers) also put typed inputs in an `InsetGroup` (`InsetRow` for plain rows)
  as `ScrubRow`s: drag to scrub, tap the row to type. Scrub bounds come from
  the `@dorkroom/logic` validator constants where one exists (the focal length
  limits, `MIN_FOCAL_LENGTH_MM` and `MAX_FOCAL_LENGTH_MM`, live in
  `lens-calculator-defaults`), never a copy. Dragging right lowers the value on
  every scrub row (`SCRUB_DIRECTION` in `scrub-value.ts`, the ruler moving
  under a fixed indicator); VoiceOver increment still raises it. The ruler is a
  real number line in fixed coordinates (`ruler-machine.ts`, a pure reducer: an
  origin value at index 0, a tick every 10px per step, so adaptive steps stay
  10px each). The pan is a UI-thread worklet that moves one shared translate
  and tells JS only when the whole-step count changes (`use-scrub-machine.ts`),
  counted from recognition (the 8px before it is given back only when the
  finger reverses to where it went down);
  the ruler is one Skia canvas that is never remounted, with a static alpha
  mask for the edge fade. The origin stays put across outside changes and is
  replaced only on a step or bounds change or a far jump. The machine remembers
  the texts it has written (unordered), so during a drag any of them coming
  back is an echo, not an outside change. Keep it cheap: no per-tick views, no per-frame JS, no per-step state
  on the ruler. Mark the tool `answerFirst: true` in `TOOLS`. A pinned header
  means the scroll view is not the first view, so a large title could never
  collapse. `PhaseStack` (from the route params, via `usesLargeTitle`) gives
  such a tool a standard header. Each tool is its own screen in its phase
  stack (`dangerouslySingular` by tool id), so navigating to a tool already in
  the stack brings that screen to the top with its state. A missing result is a `Readout` with `value={null}` and the hint as its `note`, not a
  separate card.

### Stage screens

Border, Mat Cut and Resize are **stage screens**: `fixedLayout: true` in `TOOLS`
(standard header; iOS 26 lets Back start anywhere on a screen, so `PhaseStack`
gives every `fixedLayout` tool `gestureResponseDistance: { end: 24 }` and Back
starts only in the left 24pt: `fullScreenGestureEnabled: false` was tried and
also stopped the left-edge swipe on the simulator, so it is not used), no scroll
view, the drawing fills the screen and holds
still while the controls sit in a panel over the bottom. `StageScreen`
(`src/components/stage/`) lays it out: `<StageScreen header? collapsed expanded>`
with the drawing as a render-prop child that gets the `{ width, height }` it may
fill. The stage runs from under the native header (`useHeaderClearance`, plus a
pinned `header` such as a `Readout`) to just above the COLLAPSED panel, so
`stageRect` reads only the collapsed height and the expanded panel and the
keyboard can never move or resize it (the header keeps its tallest height at a
given width, so a note that comes and goes cannot move it either; reserve a
note's line in the header so it is there from the first render). The drawing is
fitted (contain, centred) inside it, leaves `DRAWING_CAPTION_HEIGHT` under it for
a caption and a two-line warning, and must not remount on a detent change.

`DetentPanel` is in-screen (not a `Modal`, not a route), anchored above the tab
bar from this screen's own insets (`SafeAreaListener`, like the Inverter's frame;
the root provider does not know the tab bar), at most 560pt wide and centred on
an iPad. Two detents, one shared height moved by a UI-thread pan on the 40pt grab
strip (a fling picks the direction, a spring settles, a tap toggles;
`snapsToExpanded` in `stage-layout.ts`). The collapsed height is the collapsed
block, capped at 45% of the room under the header (a taller block, like Resize's
scrub rows, scrolls inside the panel). The expanded height is the whole content,
capped so the drawing keeps `max(240pt, 45%)` of that room in view (a screen whose
drawing is a schematic and whose inputs are the work passes `minDrawingExpanded`
for a fixed, smaller floor: Resize uses 120pt, and `collapsedMaxShare` raises the
45% collapsed cap to 60%); content taller than that scrolls. A collapsed block
must end on a row boundary: build it from whole rows (Resize: the mode segment and
the first two scrub rows) and put the rest in `expanded`. While collapsed the scroll view's content is clipped to the
collapsed block, so nothing of the expanded block can be scrolled to or touched
(it also has `pointerEvents="none"` and is hidden from VoiceOver); closing the
panel scrolls it back to the top, and the clip applies once the spring has
finished. The strip is a button labelled "Controls" with
`accessibilityState.expanded`. With a field focused the panel rides above the
keyboard (never tall enough to cover more of the drawing than the expanded
panel would) and scrolls the field into view (`use-keep-field-visible.ts`). The
surface is `GlassCard flush` over a dark underlay, hairline under safelight. Pure
maths (stage rect, detent heights, snap, keyboard lift, field scroll) is
`stage-layout.ts`; keep new maths there with a test.

To build a new stage screen: put the most-used controls in `collapsed`, the rest
in `expanded`, mark the tool `fixedLayout: true`, and draw into the stage size.
Edge dragging (Border, Mat) uses `EdgeHandles` and `useEdgePan`: a 44pt target per
edge (`edgeHitRects` keeps the four from ever overlapping, even on a zero-size
image) with a short bar in the phase hue on the edge itself, and a pan along the
edge's axis that tells JS only when the whole-step count changes (`nearestStep`,
`valueFromSteps` in `edge-drag.ts`; `stepsFromDelta` is only the image-drag pan's), one haptic tick per step and none at a bound.
Rules: keep drawings and handles out of the stage gutter (32pt); keep each gesture
on one axis (`activeOffset` and `failOffset`) so it never fights the panel's drag
or a scrub row; take one drag at a time (`useActiveDrag`, a second finger is a
no-op); make handler callbacks stable and give each edge its position table as shared
values (a redraw per step must not rebuild a gesture mid-drag, and a table is
rewritten only between drags, on a drag's end); count travel from the touch-down
point (`absoluteX/Y` recorded in `.onBegin`, because iOS resets a pan's
translation when it activates and the travel before that would be lost);
compare against what the drag last wrote, not the last rendered value; the
drawing is ONE accessible element whose label carries everything a sighted user
reads from it, warning included (handles are not exposed), and every value stays
editable in the panel. Border maps any edge to the minimum border (the slider's
step and bounds) by direct inversion: `edgePositionsByStep` builds each edge's
on-screen position for every step from the real `computeBorderLayout`, and
`nearestStep` picks the step nearest `start + finger travel`, searching only the
monotonic run of the table that holds the start (an edge pinned by an offset limit
turns back, so the peak is a soft bound and nothing flickers), so the edge under
the finger follows it through an axis switch, any ratio, flip or even borders
(the tables are rebuilt when offsets, ratio, paper or orientation change); with
offsets on, dragging the image interior moves it (a positive horizontal offset
moves the print LEFT in the model, so a right drag lowers it:
`offsetsAfterDrag`). Mat maps each window edge to its own border, on a grid that
coarsens on a small drawing (`matDragStep`), through the same tables
(`matEdgeTrack`).

### Styling

- **NativeWind v4 with Tailwind v3 syntax** via `className`. This is Tailwind
  v3, not the web app's v4, so don't use v4-only utilities. A `postinstall`
  script (`scripts/link-nativewind-tailwind.mjs`) symlinks v3 into NativeWind;
  it also runs as `eas-build-post-install` so remote builds get the same link.
- Palette in practice: bg `#0b0b0c`, text `text-white` / `text-white/60..80`,
  phase hues and `text-rose-400` links on Home (see below), pills `rounded-full`, cards
  `rounded-2xl`/`rounded-xl`. For values that can't be a class (sizes passed to
  native props, computed colors) use `theme/tokens.ts`.
- **Three hues, one per phase** (`theme/accents.ts`): yellow for Shoot, teal for
  Develop, rose for Print, used in the treatments that file documents (tinted
  glass for selection, a solid fill only for commit buttons). Controls take the
  hue from the surrounding `PhaseProvider`: `CommitButton` and `useCommitStyle`
  (dark ink on the fill; the hues are light and white fails 4.5:1),
  `useSelectionTint`, `usePhaseHue`. With no phase (Home, Settings) selection is
  a neutral white tint and a commit fill is the brand rose. Never write
  `bg-rose-600` for a commit button; use `CommitButton`, or `NeutralButton` for
  an action that isn't a commit (retry, a permission request). NativeWind
  ignores Pressable `style` callbacks (`style={({ pressed }) => ...}` becomes
  `{}`), so use a plain style object and `active:` classes; a test enforces it. Rose text for
  Delete/Remove/errors is destructive, not a hue. A tool's accent is its phase's hue
  (`PHASE_ACCENT`); the screens pass the literal. `GradientBackground` draws one
  glow in the hue of the `PhaseProvider` it sits under (`PhaseStack` provides it),
  neutral on Home and Settings. Direction-coded data (a pushed vs pulled recipe)
  uses `DIRECTION_COLOR`, outside the accent system.
- Prefer `GlassCard` for surfaces: Liquid Glass on iOS 26, translucent
  `bg-white/10` fallback elsewhere. Capability checks are computed **once at
  import**, never per render (see `glass-card.tsx`).

### Safelight mode

One switch (`useSafelight()`, an MMKV boolean in `src/lib/safelight-store.ts`,
read synchronously so the first frame is already red) turns the app deep red on
true black. The label is **"Safelight mode"**. Never write or imply "paper
safe": it has not been tested as safe for photographic paper, and red light is
not safe for film or colour paper (the Settings footnote says so).

**Two layers.**

1. **The guarantee: a multiply overlay.** `SafelightRoot`
   (`src/components/safelight/safelight-overlay.tsx`) renders a full-window,
   `pointerEvents="none"`, pure-red (`#ff0000`) view with `mixBlendMode:
   'multiply'` as the LAST child of the app root. Multiplying by red zeroes
   green and blue on everything beneath it, including native-stack headers, the
   iOS 26 glass tab bar, `GlassView`, Skia canvases, Reanimated views, images
   and scrolling content. Verified by screenshot sampling: max G and B are 0
   outside the status bar. Brightness is the palette's job, not the overlay's.
2. **The look: the palette.** Only the red channel survives, so a colour's
   brightness is its R value (teal `#2dd4bf` is R 45 and vanishes; blue push/pull
   text likewise). `src/theme/safelight.ts` holds the red levels (text 255,
   secondary 236, tertiary 190, faint 150, outline 120, selected outline 200,
   commit fill 80, paper 70) and the contrast helpers (primary 5.25:1, secondary
   4.57:1, tertiary 3.19:1 by red luminance; tests enforce 4.5:1 for primary and
   secondary). Body text and labels are at least secondary, anything readable at
   least tertiary, and faint is for decoration (chevrons, dividers) only.
   Hierarchy comes from size and weight, not from many reds.

**The vars() rule (do not break this).** `SafelightRoot` passes a NativeWind
`vars()` style on EVERY render, `NORMAL_VARS` or `SAFELIGHT_VARS`, never `null`
for one of them. react-native-css-interop remounts a component the first time a
`vars()` style appears on it, so applying it only under the mode would remount
the whole app tree the first time the mode was switched on and reset forms,
scroll positions and the Process Timer's editor. (A running timer is not at risk:
its run lives in the module-level store `src/lib/timer/timer-store.ts`, outside
the tree.) Both sets come from one table
(`src/theme/safelight-tokens.ts`), `global.css` repeats the normal values, and a
test checks all of it, including each normal value against the Tailwind colour
it replaced. `GlassCard` likewise keeps one wrapper type in both modes (the glass
is switched off with `glassEffectStyle="none"`), so card contents keep their
state.

**What a new component must do to look right:**

- Surfaces and borders use the semantic classes, never raw `bg-white/..`:
  `border-hw border-line bg-surface` (also `bg-surface-dim`, `bg-surface-inset`,
  `bg-surface-strong`), `border-edge` / `border-edge-faint` / `border-edge-15` /
  `border-edge-30` / `border-edge-strong` for an existing border (a divider is
  `h-px bg-edge`, without `border-hw`), `text-ink-80/70/60/55/50/45/40/30` for
  alpha text, `bg-selected` + `text-selected-ink` for a filled selected state,
  `bg-paper`, `bg-paper-print`, `bg-window` for the Border and Mat drawings and
  `bg-easel-paper`, `bg-easel-print` for Home's easel diagram,
  `text-ok`. They resolve through CSS variables. Normal mode is unchanged:
  `--sl-bw` is 0 and the colours equal the old alpha whites.
- Colours from code go through the theme hooks, never `ACCENT[...]` or
  `DIRECTION_COLOR` directly in a component: `usePhaseHue`, `useSelectionTint`,
  `useCommitStyle`, `useAccentColor`, `useAccentFill`, `useAccentLine`,
  `useDirectionColors`, `useSelectedInk`, `useDimInk`, `useNeutralFill`, and
  `useChartInk` for chart lines and ticks. They consult safelight in one place
  (`resolve-accent.ts`).
- A hue from a hook is a colour string, `#rrggbb` normally and `rgb(255, 0, 0)`
  under the mode: never append hex alpha digits (`${hue}33`). Use
  `withAlpha(hue, 0.2)` (`src/theme/with-alpha.ts`), or `useAccentFill` and
  `useAccentLine` for a named accent.
- Direction (push or pull, hot or cold) must never rest on colour alone: under
  the mode both are the same red, so keep the sign, arrow or word. Error text
  carries an "Error:" prefix for the same reason.
- A RN `Modal` is a separate window the root overlay cannot reach: wrap its
  content in `SafelightRoot`. In a TRANSPARENT modal pass `overlay={false}` and
  put `<SafelightOverlay />` inside the painted panel (with `overflow: 'hidden'`
  and `isolation: 'isolate'` on it, only while the mode is on); a full-window
  overlay over transparent pixels is plain red. `BottomSheet`, the Custom ISO
  dialog, the photo viewer and the reciprocity chart modal already do this.
- Text inputs set `keyboardAppearance="dark"`.
- Anything that opens the system photo picker goes through `gatePhotoPicker`
  (`src/lib/photo-picker-gate.ts`), which asks in an in-app sheet first while the
  mode is on (`PhotoPickerGateHost`, mounted once in the root layout). The picker
  opens only from the gate sheet's `onDismiss`, never from the press handler:
  expo-image-picker presents from the top-most controller, so one opened while
  the sheet is still up is presented on it and torn down with it. The
  Inverter's action sheet is given 400 ms to leave before the gate presents.
  A request always settles (cancel, backdrop, swipe, mode off, unmount, or a
  watchdog if `onDismiss` never fires).

**The status bar is hidden, not dimmed** (it is a system surface the overlay
cannot reach). `app.json` sets `expo.ios.infoPlist.UIViewControllerBasedStatusBarAppearance`
to `true` (the only place it is set; no local plugin writes it), and
`statusBarOptions(on)` in `theme/stack-chrome.ts` supplies `statusBarStyle:
'light'` and `statusBarHidden: on` as native-stack screen options, spread into the
root stack in `app/_layout.tsx` and into `chromeOptions`. Only the root stack's
`(tabs)` screen is consulted: react-native-screens walks child view controllers
and stops at `NativeTabs`' tab bar controller, so the phase stacks' copy is inert
today. **The options alone do nothing in a dev-client build.** iOS asks the
window's root view controller, a plain `UIViewController`, and react-native-screens
only forwards from a container to a child that is one of its own view
controllers. expo-dev-launcher's `DevLauncherViewController` sits between the
root and the `RNSNavigationController`, so the question stopped at the root (seen
live: the root's `childViewControllerForStatusBarHidden` was nil and the bar
stayed visible). The local plugin `plugins/with-ios-status-bar-forwarding` makes
the root a `StatusBarForwardingViewController` that forwards status bar style,
visibility and the home indicator to its last child. **It and the Info.plist key
need a native build to take effect**, and it has not been checked on a device. With the key `true`, React Native's
imperative `StatusBar` (and `expo-status-bar`'s component) logs an error, so never
add one: use these screen options. A React Native `Modal` is its own window and
may still show the bar.

**Not covered (system surfaces and separate windows):**

- The **launch screen** is not covered.
- **Timer notifications and sounds** (`expo-notifications` banners, lock-screen
  alerts, the cue beeps): notification banners are not dimmed, and the sound
  is audio, not light.
- The **system keyboard** and its Done accessory (the scrub row's accessory gets
  its own black bar and overlay).
- **System sheets**: `Alert.alert` (shot and roll forms, export, film list),
  `ActionSheetIOS` (the Inverter's photo chooser), `Share.share` (share buttons,
  film log export, Inverter share) and the **photo picker** (gated, above). They
  stay full colour and the Settings footnote says so.
- The **photo viewer and camera previews** become full-brightness red images
  under the mode: the overlay keeps their red channel as it is, so a bright photo
  is a lot of red light. The Meter, the Inverter stage and the film log photo
  viewer are not dimmed beyond that.
- The home indicator auto-hides through the native-stack `autoHideHomeIndicator`
  option, which has not been confirmed on a device.

**Controls.** `SafelightButton` (a `switch` with a visible on-state) is the
`headerRight` of every Print screen, and of every Shoot and Develop screen while
the mode is on (`offersSafelightButton`); the hubs show it beside the gear.
Settings has a "Safelight mode" `ToggleRow`. Home has no header and no button.
Toggling takes effect everywhere at once with no reload or navigation reset.
Native chrome follows through `chromeOptions` (`theme/stack-chrome.ts`) and the
`NativeTabs` colour props in `app/(tabs)/_layout.tsx`.

### Live Activity (Process Timer)

While a run is active it shows on the Lock Screen and in the Dynamic Island,
and stays right with the app suspended or killed. Built with **expo-widgets**
(`~57.0.27`, pinned below the recommended 57.0.28 only because that was inside
the 7-day release gate) and `@expo/ui/swift-ui`; the `expo-widgets` plugin entry
in `app.json` (no `widgets[]`: a Live Activity is not a home-screen widget; push
off) generates the `ExpoWidgetsTarget` extension. Keep the entry AFTER
`with-local-notifications-only`: the widgets plugin writes `aps-environment`
whatever `enablePushNotifications` says, and mods run in reverse list order, so
the strip must run last. Files, all in `src/lib/timer/`:

- `live-activity-props.ts`: PURE builder of the props from `TimerState` and the
  store's `anchorMs`. Every time is an absolute wall-clock timestamp (a row's
  `[startMs, endMs]`, the run's `endMs`), never a duration. Rows are the current
  stage and the next two; the rest fold into `hiddenAfter` and a "+N more"
  row with its own countdown. The payload is
  about 0.85 KB for a 12-stage run (ActivityKit allows about 4 KB; a test pins it).
- `live-activity-controller.ts`: PURE lifecycle with a fake-able native
  interface: start with the run, update only when the schedule changed
  (`activityPropsChanged`, 750 ms tolerance, so a tick is never an update;
  200 ms debounce), end at once on reset, end with the "Done" props and a 2 minute
  linger on completion, one activity at a time, silent when starting fails
  (Live Activities off in iOS Settings) or the user swiped it away.
- `live-activity.ts`: the expo-widgets calls and the one controller. Anything
  left over from an earlier process is ended the first time the app is active (a
  run does not survive the app being killed). If the bundle is stale or the dev
  client lacks expo-widgets, `selectNative` falls back to a no-op and warns once
  in development instead of crashing at startup. `TimerRunEffects` calls `syncLiveActivity()` on every
  render (the controller dedupes) and on foreground.
- `live-activity-widget.tsx`: the layout.

**The widget runs in an isolated runtime.** The function marked `'widget'` is
turned into a STRING by `babel-preset-expo` and evaluated by JavaScriptCore in the
extension: no imports, no module-scope constants or helpers, no hooks, no timers,
no clock. Every helper (including the `m:ss` formatter) is declared INSIDE the
function; the colours come in as props (`activityPalette`, literal hex, red
levels from `theme/safelight.ts` under safelight). `live-activity-widget.test.ts`
compiles the real file with the app's Babel config and renders the string with
only the runtime's globals reachable, so a module-scope reference fails the test
instead of a device. Add any new `@expo/ui` component or modifier you use to the
allow-lists there. The layout string is written to the App Group when the
factory is created, so a layout edit reaches a running dev build with a JS
reload (no native rebuild) and applies to the next start or update.

**Why every stage is a row.** iOS cannot change a Live Activity at a scheduled
time while the app is suspended (only APNs pushes can; there is no push server,
and background audio is not used to keep JS alive). Only the system's own timer
text ticks. So each stage has its own `Text(timerInterval:)` and
`ProgressView(timerInterval:)`: a finished stage reads 0:00, the current one
counts down and later ones show their full length, with no updates, and the total
is a countdown to the run's end (the island's compact trailing). What cannot
update while suspended: which row is highlighted and which stage the header
and the agitation note name (as of the last update; refreshed on foreground, on a
button press and on any state change), and the window of rows. A run that ends
while the app is suspended goes stale at its end (`staleDate`), and the layout
reads `environment.isStale` to say "Done"; the app ends and dismisses it when it
next runs. Agitation is shown as the static pattern, never a live "next agitation"
time. Safelight: the activity is drawn red on black when the mode was on at the
last update; the system's own Lock Screen chrome is not dimmed.

**Buttons (device-unverified under suspension).** Pause/Resume and Skip are
`Button`s with a `target`. In a Live Activity `onPress` is never evaluated (only
home-screen widgets do that): the tap runs `LiveActivityUserInteraction` (a
`LiveActivityIntent`) in the APP process, whose `perform()` posts a notification
and returns at once, without waiting for JS. Two things make that safe:

- `plugins/with-widget-interaction-hold` adds `WidgetInteractionHold.m` to the
  app target only. Its `+load` observes that notification and holds a background
  task for a fixed 5 seconds (JS cannot signal completion without a native
  module), so iOS cannot re-suspend the app mid-work.
- `live-activity-interaction.ts` handles the event in one function straight
  from the listener, with no render or debounce in the path: it changes the
  `timerStore`, settles the alerts with iOS (`background-alerts.ts` cancels or
  reschedules; the React effect asks the same owner, which is idempotent by a
  key derived from the state, so nothing is scheduled twice), then updates the
  activity at once (`controller.flushNow()`).

All of that is unit-tested, but none of it has been verified on a SUSPENDED
device (the Simulator does not suspend the app the way an iPhone does). Device
checklist, in a development build with Live Activities allowed (use a short test
run; "pending notifications" means `getAllScheduledNotificationsAsync`, or a
debug screen showing it):

1. Start a run, lock, press Pause, lock again at once: no pending notifications,
   and the activity shows Paused with frozen values.
2. Press Resume, lock again: pending alerts match the new end of the run.
3. Press Skip, lock again: pending alerts match the new schedule.
4. Pause then Resume within about 300 ms: alerts are present afterwards.
5. Skip on the last stage: the activity reads Done, goes away after about
   2 minutes, and no alerts are pending.
6. Force-quit, then press a button: nothing changes; opening the app ends the
   leftover activity.
7. Expanded island while paused with an agitation note: it fits, no clipping.
8. The device log shows no "background task beyond permitted time" warnings.

If it does not hold, set `SHOW_CONTROLS` in `live-activity.ts` to `false` to
ship a display-only activity. With the app terminated or force-quit a press is a no-op:
there is no run in memory, so nothing is touched, the activity and the alerts
already scheduled keep going, and the leftover activity is ended the next time
the app becomes active. The same holds for a background launch that iOS makes
for a press: orphan clean-up and the idle "cancel every alert" wait for the
first `active` state (`first-active.ts`).

**Testing.** A Live Activity needs a development build with the extension
(`CI=1 bunx expo prebuild --platform ios`, then build; Expo Go cannot). After
adding `expo-widgets`, restart Metro with `--clear`: `babel-preset-expo` only
enables the `'widget'` transform when it can resolve `expo-widgets`, it decides
once per process, and the transform cache is keyed on file content, so a Metro
that started before the install serves the widget as a plain function and the
app throws "cannot be cast to type String". On the Simulator, `idb ui button
LOCK` locks and wakes it and `HOME` leaves the app; the Lock Screen shows the
banner, and a stage boundary can be watched with the app backgrounded. The
Simulator does not draw the Dynamic Island regions: check those on a device.

**Height.** The Lock Screen banner is capped at about 160pt and clips from the
top. Worst case now (padding 8 top and bottom, header 20, three rows of about 21,
one instruction line of 12, the "+N more" row of 15, gaps) is about 143pt; the
expanded island's bottom region shows two rows, the instruction line and the
"+N more" row (about 80pt), about 132pt in total before system insets, and the
buttons sit under the total in the trailing region. All estimates, unverified on
a device. Every text is
one line with a tail ellipsis. No stage is named "now": the leading island
region shows the title, the agitation instruction sits under its own stage's
row, and the emphasis on the row that was current at the last update is only
weight, so it is not wrong-looking after a boundary.

**Signing.** The extension has its own bundle id (`art.dorkroom.mobile.widgets`)
and both targets carry the App Group `group.art.dorkroom.mobile`, so EAS needs
that App ID, that group registered on the account and both IDs added to the
group, and a provisioning profile for each. No Push Notifications capability.

### Components

- PascalCase names, kebab-case files; props interface named `ComponentNameProps`;
  accept an optional `className`. Generic when it removes duplication
  (`OptionRow<T>`).
- Co-locate a feature's pieces in a subfolder with their **pure** helpers and
  `*.test.ts` beside them (`components/border/geometry.ts` plus `geometry.test.ts`).
  Keep geometry, format, and layout math pure and tested; keep the `.tsx` a thin
  renderer.

### Persistence and data

- Storage is **synchronous MMKV**. Two patterns:
  - Shared `@dorkroom/logic` calculators (mat, lens, camera exposure, border)
    persist through `PersistenceStorageProvider`, which `app/_layout.tsx` gives
    `calculatorStorage` from `src/lib/mmkv-storage.ts`: an MMKV adapter over
    the shared `dorkroom-mobile` instance. The exposure, reciprocity and resize
    screens use string-state hooks that do not persist (#427 tracks unifying them).
  - Other shared hooks (custom recipes, border presets) read and write
    `globalThis.localStorage`, backed by the MMKV shim installed in
    `app/_layout.tsx` via `installLocalStorage()` over that same instance.
    That call **must** stay first, before anything reads persisted state, and
    the instance id must not change, or saved state is lost.
  - Mobile-only state uses `createMMKV({ id: '…' })` (MMKV 4) directly with a named id
    (`meter-settings.ts`, `meter-calibration.ts`, `last-result-store.ts`,
    `film-log-storage.ts`). Pull defaults from `@dorkroom/logic` constants and
    guard reads with `Number.isFinite`.
  - Film log data is validated with Zod on read (`src/schemas/film-log.schema.ts`).
    It is user data with no server copy, so a parse failure must degrade, not throw.
    The film-log types (`FilmRoll`, `Shot`, `Camera`, ...) are `z.infer` of
    those schemas and exported from the same file. Add a field to the schema
    only: zod strips unlisted keys, so a field on a hand-written type would be
    erased on the next MMKV read.
- Server data goes through TanStack Query (`providers/query-client.ts`: no
  window-focus refetch, retry 2, 5-min `staleTime`) and is **persisted to MMKV**
  by `PersistQueryClientProvider`. `gcTime` is kept equal to the persister's
  `QUERY_CACHE_MAX_AGE`, so changing one means changing the other or cached
  queries get collected out from under the cache.

### Shared code (the sharp edges)

- Import only from `@dorkroom/logic` / `@dorkroom/api`, **never** internal paths.
  Metro resolves these from each package's **`src`** (no `turbo build` needed) and
  picks up `.native.ts` overrides.
- `react`/`react-dom` are hard-pinned to the app's copy in `metro.config.js`;
  MMKV needs `react-native-nitro-modules` or the app **segfaults** on first use;
  Hermes is missing `Array.prototype.toSorted`, polyfilled by `index.js` importing
  `src/polyfills/hermes-polyfills` before `expo-router/entry`. Don't "fix" these
  by editing the resolver without reading the README notes first.

### Quality gate (run from `apps/mobile`)

```bash
bun run test        # vitest, pure modules only (see Testing)
                    # (pretest builds @dorkroom/logic and @dorkroom/api first,
                    # skipped when already running under turbo)
bun run typecheck   # bun check (TypeScript 7), strict, no `any`
bun run lint        # oxlint (lint) + bun fmt --check (formatting)
```

`bun run build` here is a deliberate no-op: native builds go through Expo/EAS,
not turbo.

- **Testing reality:** only **pure** modules are unit-tested (geometry, format,
  layout, storage serialization, and the EV/solver math in `@dorkroom/logic`).
  `src/test/` holds mocks for the native modules that pure code touches
  incidentally. Camera, native modules, navigation, config plugins, and quick
  actions are **not** unit-testable here. Verify those **on device** (see below).
  Don't write fake tests that mock native behavior to manufacture coverage.
- **Typecheck depends on generated types.** `.expo/types` comes from expo-router's
  typed routes. A fresh worktree has none (so typecheck under-checks routes) and a
  stale checkout has old ones (so it fails on routes that are fine). Run the dev
  server once to regenerate before trusting a route-related error.

### Versioning

- The mobile app versions **independently** from the web app: its own
  `apps/mobile/CHANGELOG.md` and its own CalVer in `apps/mobile/package.json`.
  Web-app changes go in the root `CHANGELOG.md`. Don't mix them.
- `package.json` is the only place the version is written. `app.config.ts`
  injects it into the Expo config on top of the static `app.json`; never add
  `version` to `app.json`. EAS owns the build number (`appVersionSource:
  remote`). See `README.md`, "Versioning".
- Never apply the `eas-build` label to a PR unless you intend to trigger a build.

---

## Build vs. reload: decide by what changed

Three workflows, cheapest first. Pick the **cheapest one that covers your
change**. Full commands and credential setup are in `apps/mobile/README.md`.

### Quick path: `scripts/ios.sh`

`scripts/ios.sh` wraps all three workflows so you don't have to remember the
`source`/`PATH`/`eas` incantation. Run from `apps/mobile`:

```bash
./scripts/ios.sh server              # 1. Metro dev server (JS/TS-only changes; hot reload)
./scripts/ios.sh server --tailscale  # 1b. same, but reachable over Tailscale (off-LAN device)
./scripts/ios.sh dev-build   # 2. local dev-client build, install + launch (native changes)
./scripts/ios.sh build       # 3. standalone preview build, install + launch (no Metro)
./scripts/ios.sh install     # (re)install the last built .ipa + launch
./scripts/ios.sh help        # usage
```

Flags: `--clear` (server, stale bundler cache), `--tailscale` (server, serve
over Tailscale, see below), `--port=N` (server), `--no-launch`, `--no-install`
(build only). The script auto-detects the connected iPhone, sources the App
Store Connect key env, and resolves `eas`/`fastlane`/`pod`/`bun` onto `PATH`
itself. It handles the gotchas that bite the raw commands:

- `eas` isn't on `PATH` in a fresh shell (node/npm are nvm lazy-load shims,
  `eas` has none), so it locates the nvm node bin that actually has `eas`.
- Builds stream the **full** log to `/tmp/dorkroom-build.log` via `tee`, never
  `tail`, which buffers the real Xcode error and masks the exit code.
- One-time prereqs still apply (see the note at the end of this section):
  `brew install fastlane`, the iOS platform component in Xcode, and first-build
  credential generation. The sections below document what each command does.

### 1. Just reload Metro, for JS/TS-only changes

Use when you changed **only** JavaScript/TypeScript: components, screens, hooks,
styling (`className`), types, or shared logic in `@dorkroom/logic` /
`@dorkroom/api`. The installed dev client picks it up over Fast Refresh, no
rebuild.

```bash
cd apps/mobile
bunx expo start --dev-client --host lan        # phone on same Wi-Fi; save, hot reload
```

Restart Metro with `--clear` (not a native rebuild) when the **bundler** config
changes or its cache goes stale: edits to `metro.config.js`, `babel.config.js`,
`global.css`/Tailwind config, adding or removing a **JS-only** dependency, or
weird stale-module errors.

```bash
bunx expo start --dev-client --host lan --clear
```

**Over Tailscale (off-LAN device):** `./scripts/ios.sh server --tailscale`. Use
when the phone isn't on the same Wi-Fi (other network, cellular). Plain-HTTP
Metro can't work here: iOS ATS treats Tailscale's `100.64.0.0/10` CGNAT range
as non-local (unlike your `192.168.x` LAN), and this dev build has no
`NSAllowsArbitraryLoads`. The flag serves Metro over **trusted HTTPS** instead.
It mints a Let's Encrypt cert for this Mac's MagicDNS name (`tailscale cert`,
which requires HTTPS enabled on the tailnet), binds Metro to loopback
advertising that hostname, and fronts it with `tailscale serve`. It prints a
`dorkroom://` deep link; the phone needs Tailscale connected with MagicDNS
("Use Tailscale DNS") on. Ctrl-C tears the proxy down. No native rebuild, still
Fast Refresh.

### 2. New **development build**, for native changes (dev client over Metro)

Rebuild the native dev client when the change touches **native code or native
config**, because Metro can't hot-reload native:

- adding, removing, or upgrading a dependency with **native iOS code** (e.g.
  `expo-quick-actions`, `react-native-vision-camera`, anything with a config plugin)
- editing the **`plugins`** array in `app.json` or a plugin's options, including
  the local plugins in `plugins/` (`with-app-intents`, `with-ios-scene-lifecycle`, `with-ios-status-bar-forwarding`, `with-local-notifications-only`) and the `expo-widgets` entry
- changing native iOS config: `Info.plist` keys, **permission/usage strings**,
  the **URL scheme**, bundle id, **deployment target**, app icon / splash
- **home-screen quick actions / SF Symbol shortcut items**, entitlements

```bash
source ~/.app-store-connect/eas-asc.env
cd apps/mobile
eas build --local --profile development --platform ios --non-interactive \
  --output /tmp/dorkroom-dev.ipa
```

Then install and launch on the connected device, with Metro running so it loads
JS at runtime:

```bash
DEV=$(xcrun devicectl list devices | awk '/connected/ && /iPhone/ {print $3; exit}')
xcrun devicectl device install app --device "$DEV" /tmp/dorkroom-dev.ipa
xcrun devicectl device process launch --device "$DEV" art.dorkroom.mobile
```

Sanity-check that a config-plugin change actually landed by reading the built
plist before installing, e.g.:

```bash
unzip -o -q /tmp/dorkroom-dev.ipa "Payload/Dorkroom.app/Info.plist" -d /tmp/dr-check
plutil -p /tmp/dr-check/Payload/Dorkroom.app/Info.plist | grep -A20 ShortcutItems
```

> **First build after adding the widget extension is interactive.** eas-cli
> cannot create the new App ID `art.dorkroom.mobile.widgets`, the App Group
> `group.art.dorkroom.mobile` or the extension's provisioning profile in a
> `--non-interactive` local build. Run ONE interactive
> `eas build --platform ios --profile development --local` in your own terminal
> (App Store Connect API key auth, no Apple ID login), accept creating those and
> regenerating the app's own profile, then non-interactive builds work again.

### 3. **Standalone (non-Metro) build**, self-contained, no Mac or Metro

Use the **preview** profile when the build must run on the phone **without** a
dev machine or Metro. The JS is bundled in (release mode):

- testing on-device away from your machine, or handing a build to someone else
- demos, field testing, internal distribution
- verifying the **production-like release bundle** (minified JS, no dev menu)
  behaves the same as dev

```bash
source ~/.app-store-connect/eas-asc.env
cd apps/mobile
eas build --local --profile preview --platform ios --non-interactive \
  --output /tmp/dorkroom-preview.ipa
# install/launch with the same devicectl commands as above
```

### Which one for a given request?

| Your change / request | Workflow |
| --- | --- |
| "Tweak this screen / calculator / style / shared hook" | **1. Reload Metro** |
| "I changed metro/babel/tailwind config" or cache is stale | **1. Reload with `--clear`** |
| "Test on my phone off this Wi-Fi (other network / cellular)" | **1. `server --tailscale`** |
| "Add a native module / change app.json plugins / permissions / icon / shortcuts" | **2. Dev build** + reinstall |
| "Test on my phone without Metro / share a build / demo / check the release bundle" | **3. Preview build** |

When in doubt: if Metro Fast Refresh shows the change, you didn't need a build.
If it doesn't and the change was native, you needed **#2**.

> One-time prerequisites for #2/#3 (Expo login, App Store Connect API key because
> Apple 2FA is YubiKey-only, device registration): see `apps/mobile/README.md`.
> Local builds also need **Fastlane** (`brew install fastlane`) and the **iOS
> platform component** installed in Xcode (`xcodebuild -downloadPlatform iOS`, or
> Settings, then Components). The platform is required even when
> `xcodebuild -showsdks` already lists the iOS SDK.
