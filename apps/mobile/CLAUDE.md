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
    (home)/              # the Search tab, a Stack: _layout, index (Home, no header), settings
    shoot/ develop/ print/   # one Stack per phase: _layout (PhaseStack), index (hub), [tool]
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
plugins/                 # local config plugins (with-app-intents, with-ios-scene-lifecycle, with-ios-status-bar-forwarding, with-local-notifications-only, with-widget-interaction-hold, with-widget-controls)
modules/dorkroom-shared/ # local Expo modules: App Group UserDefaults + Control Center reloads; Spotlight indexing
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
Settings are not tools: `HOME_ROUTE` and `SETTINGS_ROUTE` stand for them. Its native half is
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
when reopened would show a tile that contradicts the tool. Above the grid each
hub shows one roll card (see "Roll lifecycle" below): Shoot the roll in the
camera (the roll the Meter logs to, or a prompt to start one), Develop the shot
rolls waiting to be developed, Print the rolls developed last. There is one Settings screen, `/settings` (`SETTINGS_ROUTE`), pushed in the
Search tab's own stack (`app/(tabs)/(home)/`: `index` is Home with no native
header, `settings` is the screen). It is an ordinary pushed screen, not a modal (a
link arriving while a modal is open would push the tool inside it), so Home is
underneath. The hubs have no gear: Home's search row ends in a 44pt gear
(`HomeSettingsButton`) that pushes it. The screen resets the phase context so
Settings keeps the neutral glow. Pushed screens keep the native back button: it
shows the previous scene's title (the phase name on a hub, "Search" on Home).

**Legacy paths.** Quick actions (`app.json`), App Intents, `dorkroom://` links
and old shares still carry pre-phase paths (`/more/meter`, `/lenses`,
`/film-log`, `/development`) and can't change without a native build.
`resolveLegacyPath` (`src/lib/deep-link.ts`) maps them to canonical paths and
passes everything else through (`/search` is Home; legacy `/settings` and `/more/settings`, and the retired per-phase
`/shoot/settings`, `/develop/settings` and `/print/settings`, open `/settings`).
Two links come from the Control Center controls (below). `dorkroom://log-frame`
is rewritten in `redirectSystemPath` by `resolveLogFrameLink` (`deep-link.ts`,
pure, the roll passed in) to the add-shot form for the roll the Meter logs to
(`/shoot/film-log/shot?rollId=<id>`, from `currentMeterRollId` in
`src/lib/meter-roll.ts`, the same pick as `useMeterRoll`), or to the film log
list when no roll is active (`logFrameTarget`). A link to one roll
(`/shoot/film-log/roll/<id>`, from a Spotlight result or the roll widget) whose
roll no longer exists is rewritten to the film log list
(`resolveMissingRollLink`, the film log read in `+native-intent.ts`), cold and
warm, instead of opening an empty roll screen. `?start=last` on the timer
(`dorkroom://develop/recipes/timer?start=last`) is stamped with `at` like an
exposure link and starts the last run (see "The timer takes" below).
**Search link.** `dorkroom://search?q=...` is an EVENT, not route params. The
"Ask Dorkroom" App Intent (`AskDorkroomIntent.swift`) sends it (see "Spotlight and
Ask Dorkroom"); Spotlight's "search in app" is deliberately off.
`redirectSystemPath` splits it with `splitSearchLink` (`deep-link.ts`), records
`pushSearchLink(q)` in `src/lib/home/search-link-store.ts` (an increasing `seq`, so
the same query twice is two events) and carries on with plain Home (`/`, other
params such as `ref` kept). `HomeScreen` reads the store with `useSyncExternalStore`
and applies a new `seq` during render; EVERY mounted Home does, so whichever one is
visible shows the query. It also reads the `q` route param (the in-app route,
`nextQueryLink` in `home/query-link.ts`, applied when its identity changes), both
through `normalizeLinkQuery` (first value, trimmed, 200 characters). An empty or
missing query never wipes the box, and typing afterwards is left alone. An event is consumed
once (`consumedSeq` in the store): the first Home of a cold start applies the pending
one, a Home that mounts later starts from `consumedSeq` and does not replay it. Only the
FIRST `redirectSystemPath({ initial: true })` call of a session can record a search
(`noteInitialUrl`, whatever its URL): expo-router re-runs the hook on any
`ContextNavigator` re-render and expo-linking overwrites the initial URL on each
warm open, so a later initial call can carry the latest opened URL and must not
replay it. Home marks an event consumed in a commit effect, not in render (a tab
can render at transition priority and discard a render). A warm link
to Home needs no special case for Settings: the linking action carries `pop` down to
the Search tab's stack (the `(home)` config has nested `screens`), so with Settings
open, from the Search tab or from ANY other tab, the stack pops to the existing Home
instead of pushing a second one. Verified in the Simulator: after the link there is
one Home showing the query, the gear opens exactly one Settings (Back reads
"Search"), and an edge swipe from Home does nothing. Do not add a `dismissTo` for
it: `router.dismissTo('/')` would drop kept params such as `ref`.

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
The Search tab is a stack too (Home and Settings), but `/` and `/settings` are
non-phase routes: a link to Settings skips the handoff and navigates directly,
and a phase link that arrives while Home or Settings is current takes the
hub-first handoff. Cold links skip all of this: they build the stack fresh and were always right.
Because the hub is the page underneath, a handed-off link's Back button names the
phase hub, never the tool that happened to be open.

**Film log collection and export.** `film-log-collection.ts` (pure) holds the
list's smart filters (`filterRolls`, `rollCounts`: In camera is `active`, To
develop is `finished`, This year is by `startedAt` in local time), `sortRolls`
(active, finished, developed; newest first; unparseable dates last) and the
stats (`filmLogStats`: this year by `startedAt`, top film and camera over all
time, ties to the most recent and flagged `tied`). The chip row is
`PresetChipRow`, selection is screen state.

**The Film Log list** (`film-list-screen.tsx`). The header's right side is
native bar items (`Stack.Toolbar placement="right"`, expo-router 57): `+` (New
roll, hidden while there are no rolls, when the empty state's own button is the
action) and a More menu (`ellipsis`) with "Cameras & lenses" and "Export all
data" (disabled with "Add a roll first." while there are no rolls). Bar items
replace the stack's `headerRight` on iOS, so the screen adds the safelight
switch back as a `Stack.Toolbar.View` while `offersSafelightButton` says so.
The body is the chips, then one caption line (`filmLogCaption` in
`film-log-list.ts`, pure: "2026: 9 rolls, 23 frames. All time, most shot: HP5
Plus; most used camera: FM2."). It is hidden below three rolls (it would only
repeat the rows). Film and camera are counted apart, so they are two facts,
never a pairing, and each is named only when it leads with two rolls or more
and no tie. Then the rolls as one grouped list (`RollRow`: label, then camera,
film when the label is a name, EI and frames; a status pill, In camera in the
phase tint, Shot and Developed neutral, and the start date trailing, under the
text from the accessibility text sizes, `stacksRollRow`). Each row is one
VoiceOver button (`rollRowText`). The group is drawn row by row
(`groupRowClassName`, the `InsetGroup` look) so the `FlatList` keeps
virtualizing. Empty states come
from `filmLogEmptyState`: no rolls at all shows the guided "Load a roll"
(`FirstRollEmptyState`, the screen's only full-width commit, with
`firstRollHint`: "Add your cameras and lenses first, in the More menu." while
there is no camera, since the roll form then only offers Cameras & lenses,
else "Your cameras and lenses are in the More menu."); a filter that
hides every roll shows one line naming it and "Show all rolls".

**A roll's page** (`roll-detail-screen.tsx`, #732). The header's right side is
native bar items, as on the list: `+` (Add frame, always shown; the empty
state keeps its own button too) and a More menu
(`ellipsis`): "Edit roll" (also the only way back a step: the roll form's
status control), "Show map" (only when a frame has a location), a "Share"
submenu with "Export CSV" (disabled with "Log a frame to export." while there
are no frames) and "Export GPX" (disabled with "Add a location to a frame to
export GPX."), then "Delete roll", destructive, in an inline section so a
separator sets it apart, behind the same "Delete roll?" alert. The exports go
through `shareRollAsCsv` and `shareRollAsGpx`, so the tap guard applies. The
safelight switch is re-added as a `Stack.Toolbar.View`. The body starts with
`RollSummary` (`components/film-log/roll-summary.tsx`), one flat `Surface`:
the setup line (`rollSetupLine`: camera, the film when the title is the
roll's name or "No film set" when it has none, EI with "(Push +1)", process), the dates the roll stores
(`rollDatesLine`: "Started Nov 1 · 12 days in camera", then "Shot Nov 10" and
"Developed Nov 12"; days only from the second day), a developed roll's record
in one line (`developmentSummaryLine`: recipe, dilution, °C (°F), "Time set",
the recipe's EI when it differs) and its notes, the roll's back and notes;
then the lifecycle track (`lifecycleTrack`: In camera, Shot, Developed, each
with a glyph for done, current or to come, so it never rests on colour; one
VoiceOver element, `lifecycleTrackLabel`) and under it ONE tinted button for
`nextLifecycleAction` ("Mark as shot", "Mark as developed", none for a
developed roll) through `confirm-roll-status.ts`; then the frame count, "N
with a location", a map thumbnail and the Meter shortcut. The thumbnail is
DRAWN, not a map (`FrameMapThumbnail`, dots from `thumbnailDots` in
`frame-map-thumbnail.ts`, pure: one scale for both axes, north up,
antimeridian-aware through `longitudeArc`, one dot per 6-decimal point, at
most 24): a live map would be a native view in a scrolling list header,
would fetch tiles from Apple on every visit and cannot be dimmed under
safelight. It shows when a frame has a location and the build has the map
(`loadAppleMaps`), and a tap opens the roll map. **The Meter shortcut** (a
secondary "Open Meter" button, spoken "Open the Meter for this roll", only for a roll in
the camera, `offersMeterShortcut`) sets the Meter's roll with `useMeterRoll`'s
`setRoll` (the persisted pick its roll pill writes, so later visits to the
Meter keep logging to this roll until another is picked) and opens the Meter
with `openToolPath`, pushed on the Shoot stack, so Back returns to the roll.
The track becomes a column from iOS XXL (`stacksLifecycleTrack`, 1.2: in a
row it needs about 320pt, more than a 375pt phone has there) and its labels
can wrap; at the accessibility text sizes (`stacksSummary`) the counts,
thumbnail and Meter stack too. Under it, "Frames" and the frames
as one grouped list of `FrameRow`s (`groupRowClassName`, virtualized): the
edge number (`frameNumberLabel`, "07") in a fixed column in the phase hue
(`frameNumberColumnWidth`: three digits, scaled with the text size, so rows
stay aligned past frame 99),
a thumbnail with an outline only when the frame has a photo, the exposure
(no ISO: a frame stores none, it is the roll's EI), lens, back and place,
the first line of the notes (one line, wrapping at the accessibility sizes),
and grey `mappin` and
`camera.metering.center.weighted` glyphs for a location and a frame logged
from the Meter. `frameRowText` (pure) builds the text and the one VoiceOver
label ("Frame 7, f/8, 1/125, Color Skopar, Embarcadero, has location, logged
from the Meter", notes included; never coordinates). A tap opens the shot
form; the row is an expo-router `Link` with `Link.Menu`, so a long press shows
a native context menu with Edit frame, View photo (with a photo) and Show
roll map (located; it opens the whole roll's map, not that frame). The
VoiceOver element is a plain `View` around the `Link` (`accessible`, role
button, the label, `onAccessibilityTap` opening the frame), not the
`Pressable`: `Link.Menu` mounts its trigger inside a native view styled
`display: contents`, and the accessibility tree skips that view's subtree,
so a label on the `Pressable` reached nobody (the frame rows were missing
from the tree on the Simulator). View photo and Show roll map are
also offered to VoiceOver as custom actions. There is no Delete frame:
`removeShot` exists in storage but nothing in the app calls it yet. A roll
with no frames shows one sentence (`noFramesMessage`, pointing a roll in the
camera at the Meter) and the page's one commit, "Add frame".

`film-log-csv.ts` (pure) writes one roll as CSV: no metadata
preamble (EXIF tools want a clean header row, so roll facts go in the file name,
`csvFileName`, which uses the local start date), RFC 4180 quoting, CRLF, rows by
frame number, and no photo file column (an internal name). "Taken at" is local
wall-clock time with its offset for that instant (`2026-11-13T15:04:05-08:00`,
what EXIF `DateTimeOriginal` wants); the capture time zone is not stored, so a
file exported in another zone shows that zone's local time. The file is UTF-8
without a BOM on purpose (a BOM can corrupt the first header for naive parsers),
so Excel opened by double-click may misread accented characters: use its import
dialog. One `COLUMNS` table builds the header and every row (`Latitude`,
`Longitude` and `Accuracy (m)` follow `Place`: 6 decimal numbers and whole
meters, empty without a location, never quoted or guarded). A text cell gets a
leading apostrophe only when a spreadsheet could read it as a formula: it starts
with `=`, `@`, a tab or CR, or `+`/`-` directly followed by a letter, `(` or `=`
(`-1 stop` and `+1 Main St` are left alone). Sharing it (`shareRollAsCsv` in
`film-log-share.ts`) writes to the cache folder `film-log-exports/`, removes the
other files there first (a share extension may still be reading the last one),
and passes the file URL to RN's `Share.share`, so `expo-sharing` is not needed.
A module flag blocks a double tap; it is cleared once `Share.share` has been
called, never when it settles, because on iOS picking a target and cancelling
inside it settles neither callback. A one second window after the call also
ignores taps (`shouldIgnoreExportTap` in `export-tap-guard.ts`, pure), covering
the gap before iOS presents the sheet; a negative elapsed time (the clock set
back) never counts as inside it. GPX export and the roll map are under
"Frame map and GPX"; "Expiring" waits for film inventory.

**Film log in Search.** Home also searches the on-device film log (mobile-only
MMKV data, so `@dorkroom/logic`'s `searchHome` cannot see it). `matchFilmLog`
(`src/lib/home/film-log-matches.ts`, pure) ANDs the query words, ignoring
punctuation on both sides, over a roll's name, film, camera, lenses used, notes
and EI, and over camera names; `ResultGroups` shows the rows above the catalog
groups, and they show even while the catalog is loading or failed. Filler words
(`at`, `in`...) and one-character words are dropped from the query first.

**Roll lifecycle.** A roll follows the phases: Loaded, Shot, Developed,
Printing. They map onto the stored `status` without a new enum value: Loaded is
`active`, Shot is `finished`, Developed is `developed`, and Printing is not a
status at all (it is a developed roll in the Print hub's list). A new enum value
would make an older build fail that roll's parse. The words are "In camera",
"Shot" and "Developed", written once in `ROLL_STATUS_OPTIONS`
(`film-log-options.ts`, `rollStatusLabel`), which the list, the roll form and
Home's film-log rows all read. Transitions go through `film-log-storage.ts`:
`markRollShot` (active to finished, `finishedAt` set if unset),
`markRollDevelopedByHand` ("Mark as developed": keeps a record the roll already
has, else records only the date) and `markRollDeveloped` ("Save to roll" from
the timer, the ONLY path that replaces a record; the card says so when the roll
has one). Each returns whether it changed anything, so a stale tap is a no-op.
Going back (to the camera, or to Shot) is the roll form's status control, with
the same rule (`rollStatusPatch` in `src/lib/roll-lifecycle.ts`): back in the
camera clears `finishedAt`, and no status change ever deletes a development
record (it is shown only while the roll is developed). The form writes status
fields only when its status control differs from the status it opened with
(`rollFormStatusPatch`), and never writes `finishedAt` or `development` from its
own copy, so a form left open cannot undo Mark as shot or Save to roll made
meanwhile from another tab. Mark as shot and Mark as developed confirm with
`Alert.alert` (`confirm-roll-status.ts`), because Mark as shot changes which
roll the Meter logs to.

- **The development record** (`FilmRoll.development`, `rollDevelopmentSchema`):
  `developedAt` plus optional snapshots of the recipe (`recipeId`, `recipeName`
  such as "Ilford HP5 Plus in Ilford DD-X", `developer`, `dilution`,
  `temperatureF`, `timeSeconds` as run, `shootingIso`, `notes`), taken like
  `filmStockName` so a catalog change cannot orphan it. `timeSeconds` is the
  develop time SET for the run, not a measured one (a stage skipped early still
  records its set time); the roll page labels it "Time set". Its parse is
  tolerant per field: each optional field has its own `.catch(undefined)`, so
  one bad value costs only that value, and it is a `z.looseObject`, so keys a
  newer build adds survive a read and write by this one (the storage layer
  writes back the parsed value; the roll itself is a plain `z.object`, so
  unknown ROLL-level keys are still stripped). A record without a valid
  `developedAt` is no record (`.optional().catch(undefined)` on the roll's
  field). Because the type of a stored record has an index signature, records
  are BUILT as `RollDevelopmentFields` (the known keys only, so a misspelled or
  renamed key does not compile; `RecipeSnapshot` derives from it). An
  undated record is gone after the next write with no quarantine copy: the one
  accepted loss. Without that catch a bad record would fail the whole roll,
  which `parseCollection` then skips (records are parsed one by one, and the
  next write quarantines the roll). The roll's other fields keep that strict,
  per-roll behaviour.
- **Hub cards.** Shoot: `ActiveRollCard`, whose body (opens the roll) and "Mark
  as shot" are sibling buttons, never nested. Develop: `UndevelopedRollsCard`,
  finished rolls oldest `finishedAt` first (`rollsToDevelop`), three rows and
  "N more", which opens the film log on To develop (`/shoot/film-log?filter=to-develop&at=`,
  applied once per opening during render, `rollFilterFromParam`). A row opens
  Recipes through `recipesPathForRoll`: `film=<slug>` (a catalog film's
  `filmStockId` is its slug, the identifier Home uses; a `custom-` film or none
  opens Recipes unfiltered), `iso=<EI>` and `roll=<id>`. The recipe list (`use-recipe-browser.ts`) applies
  `iso` with `setIsoFilter` in the same one-shot opening as Home's film and
  developer (`recipeListOpening` in `recipe-views.ts`), but only when the film
  has a recipe at exactly that ISO (`isoToApply`, alias and rebrand aware);
  otherwise it filters by film alone rather than show "No recipes match". It
  passes `roll` on to a recipe only while the film filter is still the one the
  opening set (`rollForRecipeOpen`); a manual film pick or clear, or "Clear
  all filters" / "Browse all recipes", forgets it (the Filters sheet's
  "Reset sort & filters" keeps the film, so the roll is still carried), since the list stays mounted in its tab. A manual film change
  also clears the ISO filter if it is still the one the opening set
  (`clearsOpeningIso`), never one the user chose. Print: `RecentNegativesCard`, the three most recently
  developed rolls (`development.developedAt`, else `updatedAt`), opening the roll
  in Shoot with `openToolPath`. Each card renders only when it has a roll.
  Back after "N more" or a Recent negatives row: both use `openToolPath`, so
  they push onto the Shoot stack as the user left it. Back can name the roll
  that was open there, and a Film Log already lower in that stack is not
  reused (expo-router 57's `navigate` pushes unless the route is on top). It
  is the same trade-off as the timer links above; `dismissTo` is unsafe
  across tabs, so it is not used.
  Per-frame print notes are not built yet.
- **The development session** (`src/lib/timer/development-session.ts`): in
  memory beside the timer store, in `prefill.ts`'s style. The recipe screen's
  "Start Process Timer" queues it (the recipe snapshot from
  `recipeSnapshotFrom`, and the `roll` param). It binds on the next timer
  change if that change loaded the recipe's own stages, and is dropped
  otherwise (the timer refused the recipe because a run was going). Once
  bound, a preset, an exposure link, an edit that leaves no develop stage,
  Reset, or Start last timer restoring the stored run (`end()`; a stored run
  holds no recipe, so it must not inherit the loaded recipe's session) ends it;
  an edit that keeps a develop stage does not. It subscribes to
  the timer store at module load; in development the store is kept on
  `globalThis.__dorkroomDevelopmentSession` so Fast Refresh does not add a
  second subscription (reused only while it follows the same timer store). It also counts
  runs (idle to running) and remembers the saved run, so one run saves at most
  once (`canSave`, `markSaved`), and "Not now" (`dismiss`) for that run.
  `ranToEnd` is set only when the run goes from running or paused to
  completed and cleared on any return to idle: Next tapped through every stage
  from idle also completes the timer, and that is never offered or shown as
  saved. Reset ends the session even with a recipe start still queued.
- **Save to roll.** `SaveToRollCard` (`components/development/timer/`) is one
  line in `timer-screen.tsx`, under the controls: shown for a completed run
  that has a develop stage (a print exposure run never offers it) while a shot
  roll waits. It starts on the session's roll, else the only shot roll, else
  asks (`defaultRollToDevelop`: a session roll that is no longer waiting means
  the user picks, never another roll; the list shows whenever nothing is
  preselected, `showsRollPicker`, so it never dead-ends), and saves `developmentRecordFrom(recipe,
  stages)`: the recipe snapshot with the develop stage's time and temperature
  as run, or only those and the date for a run without a recipe. It is not a
  system alert, so it cannot appear over another screen or the Lock Screen;
  its state lives in the session store, so leaving the timer and coming back
  keeps it until Reset or a new run.

**Calculator links.** Home answers open a calculator pre-filled by passing the
link's params (`xCalculatorLink.build`) as search params on the tool's route.
The screen reads them with `useLinkOverrides(xCalculatorLink)` and hands them to
the shared hook as `overrides`. Those apply on mount only, so the hook returns a
key and the screen puts it on its body to re-mount it when a new link arrives.
Add that wrapper to any new calculator screen that a link can open. Home and the
next-step links below both open calculators this way.

**Next-step links.** A row under a tool's answer that carries it into the next
tool, so nobody retypes it: Meter to Reciprocity (the shutter, from 1 s),
Reciprocity to the Process Timer ("Start a 3m 8s exposure"), Resize to Exposure
("New print time"). `NextStepRow` (`src/components/next-step-row.tsx`) is the
row, a link with a trailing chevron; it and "Save to roll" are the same
`ActionRow`, stacked in a `Readout`'s `actions` slot. On a stage screen's pinned
header, reserve the row's height from the first render with
`ActionRowPlaceholder`, which draws the row's own content invisibly so the
height follows Dynamic Type. The Meter, a full-bleed camera, uses a glass pill
instead (`MeterNextStep`) in the top-left stack under the settings gear. It
cannot go in the bottom toggle row: that row shares a band with the centred 76pt
shutter button, which would sit over the pill. Its width is capped from the
measured width of the right-hand stack (ISO and roll pills), so it ends at least
8pt before it (`meterPillMaxWidth`; half the screen minus 28 while that stack
is empty or not measured), and no pill is drawn when under 88pt is left. Its
text is one line led by the trusted part ("Ilford HP5+ reciprocity", else
"Reciprocity") so truncation cuts the generic word, and its spoken label is the
full sentence ("Correct 30 seconds for Ilford HP5+ reciprocity"). It is not
rendered while scrubbing, which also hides it from VoiceOver. When
the solved shutter is past the dial's 30" (night scenes), the link carries the
unsnapped solved time (`meterShutterForLink`).

Every target is a plain path built by a pure function in `src/lib/next-step.ts`
(a deep link App Intents can reuse), from the calculator's own
`xCalculatorLink.build` plus the `at` marker. Open one with `openToolPath`
(`src/lib/open-tool-path.ts`), a plain `router.navigate` with an anchor, the
pattern Home uses. A timer already on top is reused with the new params;
otherwise one is pushed, so a second timer screen can sit in the Develop stack
when an older one is under another screen (both show the same run; the cost is
one extra Back). Two things were tried and rejected. The warm-link handoff above
(for links arriving from outside) pushed a second Develop hub on top of Recipes
when Recipes was already open. A singular timer screen (`dangerouslySingular`)
made one Back collapse the visible stack to its hub, with an unhandled
`REPLACE_PARAMS` on react-native-screens 4.26.2 and expo-router 57.0.29; popping
to the old timer instead loses the screen the user came from. With Recipes open
in Develop, Back from the timer returns to Recipes, not the hub. The Meter link sets the
Reciprocity film only when the roll's film stock name matches exactly one
reciprocity film (`reciprocityFilmFor`): every word of the film's label (brand
included, "plus" aside) must be in the name, and the name's other words must be
"plus", "pro", "professional", "pan", "film", "super" (XP2 only) or a number the label lacks, so
"Ilford HP5 Plus 400" matches and "Rollei Ortho 25 Plus" does not. A miss is
safe: the link carries the time alone. Resize carries the original time plus
the stops difference, so Exposure's result can differ from Resize's in the last
digit; a difference that rounds to 0.00 stops offers no row.

The timer takes `?exposure=<seconds>&label=<text>&at=<opened>` (up to 24 h):
`TimerScreen` loads one custom stage (`exposureStages`), does not start it, and
never replaces a run in progress (Reciprocity's row then reads "Timer running"
and just opens the timer); a queued recipe wins over it. An opening is its `at`, a timestamp. An incoming link
with an `exposure` and no `at` (what an App Intent builds, such as
`dorkroom://develop/recipes/timer?exposure=60`) is stamped with `at=<now ms>` in
`redirectSystemPath` (`stampTimerLink`, pure), so every opening is
ordered and the same URL opened twice applies twice. The newest `at` handled is
remembered at module level (`src/lib/timer/exposure-link.ts`): an opening older
than it never applies and never moves the memory back, so an older timer screen
that re-runs its effect with stale params (a remount; seen on the Simulator,
where it put the old time back right after a newer link) changes nothing. An
`at` more than 60 s ahead of the clock is not trusted for ordering (an external
link could otherwise block every later one until restart). `exposureLinkKey`
keeps an at-less identity branch for safety; no deep link reaches it. The
exposure effect follows only the route params.

`?start=last&at=<opened>` shares that ordered, once-only memory (`timerOpeningKey`,
`isNewTimerOpening`; one effect in `TimerScreen` handles both kinds). A new opening
with no run going loads the last STARTED run's stages and starts it through
`startTimerRun` (`use-timer.ts`), the Start button's own path, so the
notification prompt, the alerts and the Live Activity behave as on a press. With
a run going it only shows it; with no last run the timer stays idle
(`startLastDecision`). The last run is saved by `startTimerRun` whenever a run
really starts (`src/lib/timer/last-run.ts`, key `lastRun` in the `dorkroom-timer`
MMKV, Zod-validated on read; stages, preset id and the preset's name). The
preset chip is restored only when that preset still has the same stages
(`restoredPresetId`). A recipe run has no title (the timer does not keep the
recipe's name after the prefill).

### Routing and screens

- **expo-router v57** with file-based, **typed routes** (`experiments.typedRoutes`).
  Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`). The tab set is
  fixed: Shoot, Develop, Print, then Home as the Search tab. Icons are SF
  Symbols (`<Icon sf=...>`, no image assets), and the selected tab takes its
  phase's hue (white on Search). The tabs layout exports
  `unstable_settings.initialRouteName = '(home)'`, which only affects the state
  built from a deep link; `NativeTabs` doesn't pass it to its router, and the
  launch tab is Home because `/` matches `(tabs)/(home)/index`. The Search
  trigger is `name="(home)"`: the directory, a group with its own `_layout`, is
  one route of the tab navigator (like `shoot`), and `usePathname()` still says
  `/` for Home and `/settings` for Settings. `tabBarMinimizeBehavior(pathname)`
  (`src/lib/tab-bar-minimize.ts`) feeds `NativeTabs`' `minimizeBehavior`: the bar
  shrinks on scroll only over the recipe browser, the film log list and a roll's
  detail, and stays full everywhere else. Those three lists are wrapped in
  `TabBarScrollView` (`react-native-screens/experimental`'s `ScrollViewMarker`):
  the prop alone does not reach a list inside a stack inside a tab, so a new
  list that should minimize needs both the path in `tabBarMinimizeBehavior` and
  the wrapper (`tab-bar-minimize.test.ts` fails on one without the other).
  `ScrollViewMarker` is native code that exists only because expo-router's
  config plugin (`withGammaScreens`) writes `RNS_GAMMA_ENABLED=1` into the
  Podfile (`RNScreens.podspec` excludes `ios/gamma/**` otherwise), so it is on in
  every build that uses the `expo-router` plugin; it lives under
  `react-native-screens/experimental`, so re-check it on a react-native-screens
  upgrade. Known limits: a marker registers each time it enters a window and the
  tab tracks one scroll view, so a cancelled back-swipe on a roll's detail
  re-registers the film log list underneath and the bar stops minimizing on that
  roll until you leave and return (library behaviour, no app-side fix). The bar
  comes back only after enough upward scroll, and the bounce at the end of a
  short list counts as one (seen on the Simulator, not from the library source). Home is a plain last tab, not `role="search"`: that role is only
  the legacy system item (stock title and icon) and adds nothing here.
- **Dark only.** Don't add light-mode branches. `app/_layout.tsx` forces
  `Appearance.setColorScheme('dark')`, uses `DarkTheme`, and `headerShown: false`. The light status bar comes from the
  stack's `statusBarStyle` option (`statusBarOptions` in `theme/stack-chrome.ts`);
  never reintroduce a `StatusBar` component. `app.json` sets `userInterfaceStyle: "dark"`.
- **Screens are thin view layers.** A screen is an exported `PascalCaseScreen`,
  pulls all state and logic from a shared `@dorkroom/logic` hook (e.g.
  `useExposureCalculator`), and composes `<Screen>` plus `Surface` (or
  `GlassCard` where glass is allowed, see Surfaces) plus row components. Calculator math belongs in `@dorkroom/logic`, never in a screen.
- **No in-page title header.** The tab bar or the pushed stack header already
  names the screen, so don't render a redundant `<Text>Reciprocity</Text>`
  heading.
- Wrap normal content in `<Screen>` (scrolls, padding 16, gap 16, the phase
  backdrop). Full-bleed screens (the camera meter) skip it. The Meter is `fixedLayout`
  (standard title, never large), and offsets its top controls by the real header
  height (`HeaderHeightContext`) so they sit below the Back button and title.
- **Large titles: nothing may come before the scroll view.** The scroll view
  a large title collapses with is found down the first-subview chain from the
  screen (react-native-screens' `findScrollViewInFirstDescendantChainFrom`,
  and UIKit's own search the same way): from the screen's root view, take
  subview 0, then its subview 0, until a scroll view. Any view ahead of it in
  that chain (a `GradientBackground` was one) hides it, and then the title
  never shrinks and nothing keeps the content below the bar. A wrapper whose
  first child is the scroll view is in the chain and is fine in principle
  (the list screens collapse through `ScrollViewMarker`, a native wrapper),
  but a plain wrapper `View` with the `ScrollView` first was still not picked
  up on the Simulator, so `Screen` with no `header` returns its `ScrollView`
  as the root and the list screens return `TabBarScrollView` + `FlatList` (a
  fragment when modals sit beside it). The backdrop goes on the scroll view's
  `style` (`useBackdropStyle()`), never a `GradientBackground` view in front.
  An expo-router `Stack.Toolbar` with `placement="left"` or `"right"` renders
  no native view and is safe anywhere; a bottom toolbar (`placement="bottom"`,
  the default) renders a native `RouterToolbarHost` and must come after the
  list. On iOS 26 the expanded title is drawn inside the scroll view, under
  the bar, so `stackHeaderOptions` makes the bar clear at the top
  (`headerLargeStyle` transparent) and blurred once scrolled; a standard-title
  screen spreads `STANDARD_TITLE` (`theme/stack-header-options.ts`) to keep
  the blur at the top too. Tapping the active tab scrolls to the top with the
  title still small (react-native-screens scrolls to the collapsed inset); a
  pull grows it.
- **`Screen` adjusts for the keyboard only while focused, and not for a
  keyboard it inherited** (`useKeyboardInsetsGate`, `src/hooks/`). React
  Native's handler runs in every mounted scroll view on any keyboard frame
  change, in other tabs and under the stack too, and re-applies the offset
  through `scrollTo`, which clamps at `-contentInset.top`. That is 0 here,
  because the header's inset is UIKit's adjusted inset, so every other
  `Screen` moved to offset 0 with its first rows under the header: the hub bug
  of #732. A screen that becomes focused while a keyboard is still up (a tab
  switch, or Back from a form with a field focused) would handle that
  keyboard's hide, so the gate stays off until it has gone; the forms also
  call `Keyboard.dismiss()` before `router.back()` on save. Known limits, in
  React Native's handler (`RCTScrollViewComponentView.mm`,
  `_keyboardWillChangeFrame`): the visible screen still moves to offset 0 on
  any keyboard frame change while it is scrolled within the header height of
  its top and the focused field is not covered (as before #732), including a
  field in a sheet over the screen; and with Reduce Motion plus Prefer
  Cross-Fade Transitions the keyboard-hide path sets the visible screen's
  offset to 0 outright. The real fix is a small native patch to that handler
  (skip the re-scroll when the adjustment is 0, or clamp with
  `adjustedContentInset.top`), tracked upstream in React Native PR #56189; it
  is not applied here because it needs a native rebuild and a carried patch.
  `scrollToOverflowEnabled` was tried instead and left a blank band where the
  keyboard had been after scrolling to the end of a form.
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
  means the scroll view is not the root view, so a large title could never
  collapse. `PhaseStack` (from the route params, via `usesLargeTitle`) gives
  such a tool a standard header. Each tool is its own screen in its phase
  stack (`dangerouslySingular` by tool id), so navigating to a tool already in
  the stack brings that screen to the top with its state. A missing result is a `Readout` with `value={null}` and the hint as its `note`, not a
  separate card.

### Stage screens

Border, Mat Cut and Resize are **stage screens**: `fixedLayout: true` in `TOOLS`
(standard header; iOS 26 lets Back start anywhere on a screen, so `PhaseStack`
gives every `fixedLayout` tool `gestureResponseDistance: { end: 24 }` and Back
starts only in the left 24pt (the roll map, `film-log/roll-map`, sets the same
in the Shoot layout so a drag right pans the map): `fullScreenGestureEnabled: false` was tried and
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

### Sheets, and logging a frame

Three bottom surfaces, by what they are for:

- `BottomSheet` is a transparent `Modal` for a short list or form with one
  detent (pickers, the Custom ISO dialog). Its scrim is dark, so the page
  behind is out of the picture.
- `DetentSheet` (`src/components/detent-sheet/`) is a `Modal` with two detents,
  for a form that should leave the page behind it visible (the Meter's
  viewfinder). Medium shows `children` and a 0.2 scrim; large also shows
  `expanded` and darkens toward 0.6. Resize, dismiss and the keyboard lift
  follow the `DetentPanel` rules: one shared height moved by a UI-thread pan on
  the grab strip and header, a clipped and VoiceOver-hidden `expanded` block at
  medium. JS is told when a drag starts (to unclip the expanded block) and when
  it is released, never per frame. A drag more than 80pt below medium
  (`DISMISS_DRAG`), or a fling down from medium, dismisses; a drag that began at
  large with the keyboard up never does (it settles at medium or back at large). With no `expanded`,
  or no room to grow, it has one detent: no grabber and no "Details" button, and
  drag down still dismisses. `expandSignal` snaps it to large; `onSettled` is
  told each time a spring arrives at a detent, and also when a signal could not
  move a sheet that is at rest (a running spring reports its own arrival, so
  nothing is reported twice). The commit is the header's trailing action
  (`commitLabel`), the footer's button (`footerCommitLabel`, rendered by the
  sheet itself) or both, sharing one guarded action and disabled state; the
  props type requires at least one. Without a header commit the title stays
  centred.
  Its insets come from its own `SafeAreaProvider` inside the `Modal` (seeded with
  the window's launch metrics): a tab's provider includes the tab bar, which
  would leave blank space under the footer. `BottomSheet` does not do this yet.

  **The latch contract.** An opening ends in at most one of `onClose` (Cancel,
  scrim, hardware close or the dismiss drag) or an accepted `onCommit`; the
  first takes the latch and every later close or commit is ignored
  (`sheet-latch.ts`, pure and tested). `onCommit` returns `false` to refuse
  (nothing committed; the sheet stays open and usable); anything else spends the
  sheet, so the parent must then hide or unmount it, and `onClose` must likewise
  close it. A parent that unmounts the sheet itself (the roll is gone) or leaves
  by another route ("More options…" handing the draft to the shot form) delivers
  neither. The body is mounted only while `visible`, so each opening starts
  fresh. Files: `detent-sheet.tsx` (the sheet), `detent-sheet-chrome.tsx` (grab
  strip, header, scroll area), `detent-sheet-layout.ts` (heights, release,
  keyboard maths), `use-detent-phase.ts`, `use-detent-gestures.ts`,
  `use-detent-styles.ts`, `use-sheet-latch.ts` and `sheet-latch.ts`.
- `DetentPanel` is the in-screen panel of a stage screen (above). It is not a
  `Modal`; use it when the controls belong to the screen's layout.

`LogFrameSheet` (`src/components/film-log/log-frame-sheet.tsx`) is the one way
to log a frame to a roll from a reading: the Meter's shutter (with the photo)
and `SaveToRollAction` on Reciprocity and Camera Exposure. It leads with the
reading (#732). Header: Cancel and the title "Log frame", NO commit. The one
commit is the footer's `Button variant="commit"` "Log frame N", pinned above
the safe area and the keyboard; the lines that explain a disabled commit
(finding a location, a lens needed, the roll gone) sit in the sheet's `footer`
just above it. Medium, top to bottom: the readout (one VoiceOver element,
`frameReadout().spoken`, e.g. "Frame 8, f/8 at 1/125 second, Ilford XP2 Super
on Bessa R, EI 400"): the frame number as a muted two-digit figure, aperture
and shutter large in the phase hue with tabular figures (capped at 1.4x
Dynamic Type, then shrunk to fit), a subtitle with the roll (`rollLabel`),
camera and EI (the reading's own ISO only when the roll has none), the Meter
photo as a small thumbnail beside it, then the ISO mismatch note and "Photo
saved in B&W" when they apply; the lens chips (`PresetChipRow`, the lenses of
`useLensesForCamera`, last-used lens preselected and moved first so it is on
screen, no "No lens" chip because a camera with lenses needs one, `needsLens`),
or "No saved lenses. Add one under Cameras & lenses."; the Place row. Place is
ONE always-editable `TextInput` inside a row `Pressable`: at medium the row is
the button (spoken by `placeRowLabel`, never coordinates; the input is hidden
from touch and VoiceOver) that expands the sheet and focuses the input on
arrival (`onSettled`); at large the input takes touches itself. The row goes
back to a button only on a settle at medium with the input not focused: a real
collapse has already dropped the keyboard, while a sheet with no room to grow
nudged mid-typing keeps the field. Large adds the location row,
Notes and "More options…" (`Button variant="plain"`). Pure half:
`src/lib/log-frame.ts` (`buildLoggedShot`, `frameReadout`, `formatShutter`,
`spokenShutter`, `placeCardValue`, `placeRowLabel`, `lensChipOptions`,
`selectedLens`, `isoMismatchNote`, `needsLens`). The frame number is always
`nextFrameNumber`; the reading's ISO is never stored (ISO is the roll's EI).
For a visual check without a camera, open it from Reciprocity's "Save to roll"
with an active roll (no photo, no "More options…"). `Readout` takes an
`actions` slot under its `note`, outside the spoken summary, for next-step rows
like "Save to roll".

`Shot.place` is free text and independent of `Shot.location`: a frame can have
a place name, coordinates, both or neither.

**Frame location** (`Shot.location`, #719). **Status: Simulator-verified (iOS 27.0 Simulator); device behaviour unverified.** Optional and tolerant, in
`film-log.schema.ts`: `latitude` (-90..90) and `longitude` (-180..180) are
required inside it; `accuracyMeters`, `altitudeMeters` and `capturedAt` are
per-field `.catch(undefined)`; the object is loose. The shot field is
`.optional().catch(undefined)`, so a location with a missing or out-of-range
coordinate reads as none and can never fail its shot, and so its roll (shots
are nested in a roll, which parses as one record). Old data parses unchanged. A
location that fails to parse reads as none and is erased on the next write of
its roll (the same trade-off as `development`). `ShotLocationFields` is the
strict type for building one (a misspelled key is a compile error);
`ShotLocation` is the loose stored type, for reading.
- **Getting it.** `src/lib/frame-location.ts` (native, untested) calls
  `requestForegroundPermissionsAsync`, then `getLastKnownPositionAsync` (30 s,
  100 m) as a fast answer, else one `getCurrentPositionAsync` at `Balanced`
  accuracy raced against an 8 s timer that is always cleared. It resolves
  `ok`, `denied`, `servicesOff`, `unavailable` or `timeout` and never throws. The pure half,
  `frame-location-format.ts`, maps the fix (6 decimals) and formats it.
  `FrameLocationField` is the row (log sheet, first in the large block, under the Place row, and the
  shot form): "Add location", "Finding location…", the coordinates with
  "Remove", an inline line for denied (with "Open Settings", `Linking.openSettings`),
  one for Location Services off for the whole phone ("Location Services are off
  for this iPhone. Turn them on in Settings, under Privacy & Security.", also
  with Open Settings; `hasServicesEnabledAsync`, mapped by the pure `gateStatus`,
  checked before the permission is requested), and one for unavailable or
  timeout. A denied permission that cannot be asked again keeps the denied line;
  "restricted" is not told apart. No system alert.
- **Privacy rules.** Foreground ("when in use") only; the permission is asked
  the first time the user taps "Add location", never at launch; nothing is
  looked up when a sheet opens; there is no "always add location" setting (it is
  manual every time). A location is stored only when the user logs or saves the
  frame with it, never sent anywhere (the mobile app has no server for the film
  log and no analytics), and never reverse geocoded (that would send the
  coordinates to Apple). A new frame does not inherit the previous frame's
  coordinates, unlike the place name. It does leave the device when the user
  exports their own data: the JSON export carries `location`, the CSV has
  `Latitude`, `Longitude` and `Accuracy (m)`, and the GPX has one waypoint per
  located frame. Opening a roll's map makes MapKit fetch tiles from Apple for
  the region in view (see "Frame map and GPX").
- **No coordinates in URLs.** "More options..." hands the sheet's location to
  the shot form in memory (`frame-location-handoff.ts`, keyed by the capture's
  photo file name, read once, cleared on unmount), never as a route param: the
  shot route is reachable by an outside link that could plant coordinates, and
  navigation state would carry them. The form ignores any `location` param.
- **Busy rule.** While a fix is being found (`onBusyChange`), the sheet's
  "Log frame N", its "More options..." and the shot form's Save are disabled (`isCommitDisabled`),
  because a commit would drop the location; the 8 s timeout bounds the wait. The
  sheet's footer says why, above the button. VoiceOver is told "Location added" or the
  failure line (`announceForAccessibility`), never the coordinates.
- **Accuracy.** `capturedAt` is the fix's own timestamp. With "Precise
  Location" off a fix can be kilometers out, so when `accuracyMeters` is over
  100 the row shows the accuracy (`±N m`, `±N.N km`) and rounds the displayed
  coordinates to 2 decimals (stored values are unchanged). CSV has an
  `Accuracy (m)` column (whole meters). The Simulator reports a denied
  permission when Location Services are off, which is why that case is checked
  first.
- **Native build.** `expo-location` is a native module, so this needs a new dev
  client (see Build vs. reload). The `app.json` plugin options write only
  `NSLocationWhenInUseUsageDescription`: `locationAlwaysAndWhenInUsePermission`,
  `locationAlwaysPermission` and `motionUsagePermission` are `false`, which
  deletes those Info.plist keys, and `isIosBackgroundLocationEnabled` is
  `false`, so no `location` background mode. `app-plugin-order.test.ts` pins
  this. An older dev client has no `ExpoLocation` module: the row reports
  "unavailable" (one development warning) instead of crashing.

**Frame map and GPX** (#719). **Status: Simulator-verified (iOS 27.0
Simulator, dev build with the `ExpoMaps` pod); device behaviour unverified.**
Both read `Shot.location`; neither changes the schema. Seen on the Simulator:
no location prompt, no location button or dot; separate pins and a shared pin
each select the right frames; a drag right pans the map and an edge swipe goes
Back; the exported GPX validates against the GPX 1.1 schema.

- **GPX export.** `buildRollGpx(roll, shots, context)` (`film-log-gpx.ts`,
  pure) writes GPX 1.1 with `creator="Dorkroom"`: a `<metadata>` (the roll's
  `rollLabel` and the export time) and one `<wpt>` per frame with a usable
  location, by frame number, and returns how many it wrote. Each waypoint has
  `<time>` (UTC with `Z`, whole seconds, from `takenAt`, else the fix's
  `capturedAt`, else none), `<name>` ("Frame 12") and `<desc>` (aperture,
  shutter as the CSV writes it, ISO, lens, place and notes, one per line;
  notes because the CSV exports them), in the schema's element order. No
  `<trk>` (frames are not a path), no `<ele>`, and no accuracy (GPX 1.1 has no
  waypoint field for it and no extension is invented; the CSV carries it).
  Coordinates are `toFixed(6)`, so the separator is `.` in every locale; a
  longitude that rounds to `180.000000` is written `-180.000000`
  (`gpxLongitude`; GPX's `longitudeType` is `[-180, 180)`; the CSV keeps 180).
  Every
  text value is XML-escaped and stripped of characters XML 1.0 cannot carry.
  The file name is the CSV's with `.gpx` (`gpxFileName`). `shareRollAsGpx`
  shares it through the same path as the CSV (`shareRollFile` in
  `film-log-share.ts`: the cache folder, its cleanup, and the double-tap flag
  and window, shared by both formats). RN's `Share.share` takes no MIME type on
  iOS; the sheet types the file from `.gpx` (`application/gpx+xml`). On a
  roll's page Export GPX sits beside Export CSV in the More menu's Share
  submenu and, like it, is disabled with a subtitle ("Add a location to a
  frame to export GPX.") until a frame has a location.
- **The map.** `/shoot/film-log/roll-map?rollId=<id>`
  (`app/(tabs)/shoot/film-log/roll-map.tsx`, `RollMapScreen`), flat in the
  Shoot stack, standard header titled "Map" (Back reads "Roll"), no in-page
  title, and `gestureResponseDistance: { end: BACK_SWIPE_ZONE }` so a drag
  right pans the map and Back starts only in the left 24pt. It takes the roll id and nothing else: coordinates never go in route
  params, logs, analytics, widgets or Spotlight, and an unknown id shows "Roll
  not found." The roll's page offers it ("Show map" in the More menu, and
  the summary's drawn thumbnail) only when a frame has a location. The map is pinned above a list of the located frames
  (`locatedFrames` and `locatedFrameLabel` in `frame-map-items.ts`: number,
  place, coordinates as the shot form shows them, coarse accuracy), each row a
  button that opens the frame's shot form, so VoiceOver never depends on the
  markers. A notice shown instead of the map (no build support, safelight,
  nothing located) scrolls with the list, so large Dynamic Type cannot push it
  off screen. A pin can stand for several frames: expo-maps resolves a tapped
  marker by `MKMapItem` equality and items at one coordinate are equal, so
  `framePoints` groups the located frames by point (6 decimals) into one
  marker each (id = the point's coordinate key, `"48.858400,2.294500"`, so it
  stays the same while frames at that spot are edited or removed; monogram the
  frame number, a run `3-5`, else `3+`, else the count, at most 4 characters;
  title "Frame 12", "Frames 3-5" or "3 frames"). Tapping a pin pins a card
  under the map (`key` = the point, so switching pins resets its scroll),
  listing every frame at that point with its place,
  coordinates and its own "Edit frame". The map keeps ONE height for the
  whole visit (`mapHeightFor`: 36% of the window within 220..440pt, lowered
  to as little as 160pt in a very short window so the card's minimum still
  fits; it depends on the window only, never on anything the card measures),
  and the screen never moves the camera after the opening fit, so a tapped
  pin stays exactly where it was. While a card is open it takes the room
  between the map and the tab bar (the bottom inset inside a tab includes it)
  in place of the list; its title and "Close" stay fixed (text capped at 2x)
  and its frames scroll inside, at least 96pt of them, so at the largest text
  size the header and part of a frame show. An earlier version shrank the map
  and re-centred and restored the camera to make room; it was removed because
  its pending restore could fire late and move the camera away from the pin.
  Close clears the map's own selection as well (`selectMarker(undefined)`):
  MapKit keeps the tapped marker selected, and tapping the same pin again
  would otherwise send no event (seen on the Simulator). A selected point
  that vanishes while the shot form is open (its last frame deleted or moved)
  is cleared on focus (`useFocusEffect`), state and native selection both.
  That `selectMarker` promise is caught. The map re-frames to `frameMapCamera` (losing the user's
  pan and zoom) only when a located coordinate actually changes, since the
  camera prop is memoized on the located frames. The opening camera is
  `frameMapCamera`
  (`frame-map-region.ts`, pure): center and an expo-maps zoom from the larger
  of the latitude span and the narrowest longitude arc (antimeridian-aware),
  times 1.4 padding, a 0.01 degree minimum span for one point or identical
  points, zoom clamped to 1..18 and center latitude to ±85. expo-maps turns
  `zoom` into a region whose latitude and longitude deltas are both
  `360 / 2^zoom`. Known limit: a very wide spread, wider than about 130
  degrees of longitude (London and Tokyo) or a very tall north-south one,
  cannot be framed through that zoom-only API; MapKit picks a narrower view
  and the outer pins sit at the edges (a
  Mercator-aware cap on the delta was tried on the Simulator and framed less,
  so it was not kept). Pinch to see them; the list always has every frame.
- **expo-maps** (`~57.0.4`, the SDK 57 version in `bundledNativeModules.json`;
  Apple Maps through SwiftUI `Map`, no API key on iOS). It is NOT in the
  `app.json` plugins: its plugin only writes a location string when
  `requestLocationPermission` is set, and autolinking needs no plugin, so the
  build gains the `ExpoMaps` pod (MapKit) and no Info.plist key. The view gets
  `myLocationButtonEnabled: false` (its default is TRUE, and the button would
  use the location permission), `isMyLocationEnabled: false`,
  `selectionEnabled: false` (no POI selection) and `colorScheme` DARK. Never
  call its `requestPermissionsAsync` or `getPermissionsAsync`, and always pass
  a `cameraPosition` (the native side falls back to `.userLocation` without
  one). Importing `expo-maps` throws without its native module, so
  `loadAppleMaps` (`frame-map-native.ts`) requires it only after
  `requireOptionalNativeModule` finds both `ExpoMaps` and `ExpoAppleMaps`
  (`createAppleMapsLoader`, dependencies injected); a missing module or a
  throwing require returns null with one development warning, and
  `frameMapView` turns that into "Map needs the latest app build."
  (`MAP_NEEDS_BUILD`) with the list still there. Both paths are tested. vitest maps
  `expo-maps` to a stand-in that throws (`src/test/expo-maps.ts`).
- **Safelight.** The root overlay is in the same window, so it does reach the
  map (as it does a photo), but Apple Maps cannot be dimmed and a map is
  mostly light pixels. Under the mode the map is replaced by a notice ("The
  map is hidden in Safelight mode.") with "Show map anyway", for that visit
  only. The list stays.
- **Privacy.** The app sends no coordinates anywhere. While the map is open,
  MapKit fetches tiles from Apple for the region in view; README Privacy says
  so. No reverse geocoding.
- **Native build.** `expo-maps` is a native dependency: the map needs a new
  dev client (see Build vs. reload). GPX export is JS only.

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
  hue from the surrounding `PhaseProvider`: `Button variant="commit"` (or
  `CommitButton`) and `useCommitStyle`
  (dark ink on the fill; the hues are light and white fails 4.5:1),
  `useSelectionTint`, `usePhaseHue`. With no phase (Home, Settings) selection is
  a neutral white tint and a commit fill is the brand rose. Never write
  `bg-rose-600` for a commit button; use `CommitButton`, or `NeutralButton` for
  an action that isn't a commit (retry, a permission request). NativeWind
  ignores Pressable `style` callbacks (`style={({ pressed }) => ...}` becomes
  `{}`), so use a plain style object and `active:` classes; a test enforces it. Rose text for
  Delete/Remove/errors is destructive, not a hue. A tool's accent is its phase's hue
  (`PHASE_ACCENT`); the screens pass the literal. The backdrop is one
  glow in the hue of the `PhaseProvider` it sits under (`PhaseStack` provides it),
  neutral on Home and Settings, true black under safelight: `backdropStyle`
  (`theme/backdrop.ts`, a CSS `radial-gradient` in
  `experimental_backgroundImage`), applied with `useBackdropStyle()` to a
  scroll view or root view, or as the absolute-fill `GradientBackground` view
  on a screen with no scroll view (stage screens, the Inverter frame, the
  roll map). Direction-coded data (a pushed vs pulled recipe)
  uses `DIRECTION_COLOR`, outside the accent system.
- **Surfaces.** Glass is for chrome and for controls that float over media:
  header items, the tab bar and its accessory, sheet chrome, and controls over
  a photo, the camera, a map or a drawing (Meter pills, the Inverter's editor,
  the stage `DetentPanel`). Content sits on the flat `Surface`
  (`components/surface.tsx`): one fill (`bg-surface`), radius 16, no blur, no
  rim; under safelight the fill drops and the hairline carries the shape, so it
  needs no branch. It takes `GlassCard`'s props (`compact`, `flush`, `style`),
  so converting a content card is a rename; a `GlassCard` left in the content
  layer is a review flag. Repeated items of one kind are rows in one group,
  not a card per item. There is ONE grouped look (inset fill, `edge` outline,
  radius 16, an `edge` line between rows; tokens in `surface-style.ts`): use
  `InsetGroup` / `InsetRow` for a few rows laid out at once, and
  `groupRowClassName(index, count)` on each row of a `FlatList`, where an
  `InsetGroup` would defeat virtualization. A tinted fill is for state (a selected chip, the In camera
  pill) and for a roll's one next step (`Button variant="tinted"`). Most screens still use `GlassCard` for content; they move to
  `Surface` in follow-up PRs (#732). `GlassCard` itself is Liquid Glass on iOS
  26 with a translucent fallback, its capability check computed **once at
  import**, never per render.
- **Buttons.** One system, `Button` (`components/button.tsx`, classes in the
  pure `button-style.ts`): `commit` (the solid phase hue, one per screen at
  most), `secondary` (the flat fill, white), `plain` (phase-hue text, no fill),
  `tinted` (the selection tint as a fill, hue text: only the one next step on
  a roll's page, Mark as shot or Mark as developed) and `destructive` (the
  flat fill, rose text). All share a 44pt minimum
  height, radius 12, semibold label that wraps rather than truncates,
  `active:opacity-70` and `opacity-40` with `accessibilityState.disabled`.
  `CommitButton` and `NeutralButton` are `Button` with the variant fixed. An
  action that is not the screen's main task belongs in the header (a bar item
  or the More menu), not in the body.

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
- **System sheets**: `Alert.alert` (shot and roll forms, export),
  `ActionSheetIOS` (the Inverter's photo chooser), `Share.share` (share buttons,
  film log export, Inverter share) and the **photo picker** (gated, above). They
  stay full colour and the Settings footnote says so.
- **Header menus** (the More menus of the Film Log and of a roll's page,
  and a frame row's context menu, all native `UIMenu`s) draw above the
  overlay in full colour like the sheets (checked on the Simulator), and a
  frame row lifted by its context menu shows its first line in white.
- A roll's **map** (Apple Maps) is hidden behind "Show map anyway" while the
  mode is on; once shown it is tinted red like a photo, not dimmed.
- The **photo viewer and camera previews** become full-brightness red images
  under the mode: the overlay keeps their red channel as it is, so a bright photo
  is a lot of red light. The Meter, the Inverter stage and the film log photo
  viewer are not dimmed beyond that.
- The home indicator auto-hides through the native-stack `autoHideHomeIndicator`
  option, which has not been confirmed on a device.

**App Group mirror.** The mode is also in the App Group's UserDefaults
(`safelightOn`, `safelightChangedAt` in ms), where the Control Center toggle
reads and writes it from the widget extension. `setSafelight` writes MMKV and the
App Group and reloads the control; the store's `reconcile` (in
`safelight-store.ts`) adopts the shared value when its stamp is newer (and
reloads the control, which may show a stale state), or writes the app's value
and stamp there when the shared copy is missing, stale or differs in stamp only
(`reconcileSafelight`, pure). A stamp never moves backwards: a shared stamp left
without its value is kept (the publish uses the newer stamp and the app raises
its own to match). Originating writes (`setSafelight`, a publish, the control)
write the stamp first, so a crash between the two leaves a newer stamp over the
old value, which the next reconcile settles. An adopt writes the value first, so
a crash leaves the adopted value under the old stamp and the shared copy is
adopted again (stamp first would leave equal stamps over different values, and
the app would publish its old value over the press). `setSafelight` reconciles
first, so a press that landed while the app stayed active is never overwritten
from a stale view. It runs when the store module is first imported and on every
`AppState` change to `active`. One race is accepted: UserDefaults has no
compare-and-swap, so a control press landing in the instant between the app's
read of the shared stamp and its write can be overwritten. See "Control Center controls".

**Controls.** `SafelightButton` (a `switch` with a visible on-state) is the
`headerRight` of every Print screen, and of every Shoot and Develop screen while
the mode is on (`offersSafelightButton`), the hubs included. Settings has a
"Safelight mode" `ToggleRow`. Home has no header and no button.
Toggling takes effect everywhere at once with no reload or navigation reset.
Native chrome follows through `chromeOptions` (`theme/stack-chrome.ts`) and the
`NativeTabs` colour props in `app/(tabs)/_layout.tsx`.

### Live Activity (Process Timer)

While a run is active it shows on the Lock Screen and in the Dynamic Island,
and stays right with the app suspended or killed. Built with **expo-widgets**
(`~57.0.27`, pinned below the recommended 57.0.28 only because that was inside
the 7-day release gate) and `@expo/ui/swift-ui`; the `expo-widgets` plugin entry
in `app.json` (push off; its `widgets[]` declares only the Home Screen widgets
below, a Live Activity needs no entry there) generates the `ExpoWidgetsTarget`
extension. Keep the entry AFTER
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
is a countdown to the run's end (the island's compact trailing, and the minimal
region, which shows the same countdown at 11pt bold in a fixed 34pt frame that
scales to half; while paused, done or stale it keeps the pause or check glyph
instead of a frozen time). The minimal layout is unverified on a device: the
Simulator does not draw the island regions, and only the isolated-runtime test
covers it. What cannot
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

**Tab bar accessory.** While a run is going, a pill above the tab bar on every
tab (`NativeTabs.BottomAccessory`, iOS 26's `UITabBarController.bottomAccessory`)
shows the current stage, its time left and pause/resume; a tap on its body opens
the timer. `TimerAccessory` (`components/development/timer/timer-accessory.tsx`)
renders `timerAccessoryModel` (`lib/timer/accessory-model.ts`, pure, tested),
built from the same `TimerState` and engine helpers as the Live Activity, so the
two cannot disagree about the stage or the time left. It ticks because
`TimerRunEffects` re-samples the store at 4 Hz; it has no timer of its own, and
`createAccessoryModelSelector` hands both copies the same model until a whole
second (or the stage or status) changes, so they redraw at 1 Hz.

- **Two copies, no shared state.** react-native-screens' `TabsHost` mounts the
  children twice, one per placement (`regular` above the bar, `inline` beside a
  minimized bar), and hides the one not in use. Keep every bit of state in the
  store; `usePlacement()` only picks the layout (inline drops the stage name
  and the word "Paused", and the clock never shrinks).
- **Shown only during a run.** `app/(tabs)/_layout.tsx` renders the element only
  while `useRunActive()` (a selected boolean, so the layout does not re-render
  per tick) is true. Removing it unmounts `TabsBottomAccessory`, and
  `RNSTabsHostComponentView` then calls `setBottomAccessory:nil animated:YES`;
  the content views detach their KVO observers on unmount
  (`RNSTabsBottomAccessoryContentComponentView didMoveToWindow`). The other
  option, `unstable_nativeProps.ios.bottomAccessoryHidden`, makes the same
  native call but keeps both copies mounted. **This was exercised only on the
  iOS 27.0 Simulator** (react-native-screens 4.26.2: five quick start/reset
  cycles with tab switches, no crash, blank or stuck pill). Early iOS 26 seeds
  crashed on a conditionally rendered accessory, so it still needs a check on
  an iOS 26 device: quick start/reset, and a run started again while the pill
  is still animating away.
- **Size.** The system sets it and react-native-screens passes the frame to
  the shadow node: the content measured 48pt tall on the Simulator. The row
  fills it, with a 44pt pause target. Its text is capped at
  `ACCESSORY_MAX_FONT_SCALE` (1.3) so large Dynamic Type cannot clip it, and
  the body's text shrinks and ellipsizes before it reaches the button (the
  inline placement is narrow).
- **Pause** goes through `runTimerAction` (`live-activity.ts`), the Live
  Activity buttons' own path (`createTimerActionRunner` in
  `live-activity-interaction.ts`: store, alerts, then an immediate activity
  update), without the ownership check. `runtimeActions` builds `sync` and the
  runner over the runtime's controller, twice (inside `createRuntime` and at
  module scope): two identical stateless instances over one controller, so
  `syncLiveActivity`, the safelight subscription and both kinds of button run
  the same code. Only the controller and the title resolver are kept on
  `globalThis` across Fast Refresh. While paused, the Live Activity rounds the
  frozen time to the nearest second (`live-activity-props.ts`, `Math.round`),
  so it can read one second under the pill and the timer screen, which round
  up; left as is because the Live Activity code is unchanged by this work.
- **Opening the timer** is a plain `router.navigate(href, { withAnchor: true })`
  (Home's pattern), never the warm-link handoff (it currently pushes a
  duplicate hub when the target phase's stack has a screen above its hub). A
  timer on top of the Develop stack is reused; otherwise one is pushed, so a
  second timer screen can sit in the Develop stack when an older one is under
  another screen (a recipe opened from Search, say). Both show the same run,
  because the run lives in the store; the cost is an extra Back. On the timer
  itself the pill body does nothing: it is marked disabled and has no "Opens
  the timer." hint (`accessoryTarget`, `accessoryOpenHint`). Tried and
  rejected: `dangerouslySingular` on the timer screen made one Back collapse
  the visible Develop stack to its hub with an unhandled `REPLACE_PARAMS`
  (react-native-screens 4.26.2, expo-router 57.0.29), and popping to the
  existing timer loses the screen the user came from.
- **Insets.** The tab's safe area grows by the accessory, live: scroll views
  (automatic insets) and `SafeAreaListener` panels (stage screens) clear it and
  move back when it goes. The Meter's `useSafeAreaInsets` reads the same
  per-tab provider but was not seen (no camera on the Simulator). No screen
  needed a change.
- **Safelight.** The root multiply overlay covers it (max G and B 0 in the pill);
  the hue comes from `useAccentColor(PHASE_ACCENT.develop)`, not the phase, since
  it sits outside every `PhaseProvider`.

### Widgets (Home Screen and Lock Screen)

Three WidgetKit widgets from the hub tiles, declared in the `expo-widgets`
entry's `widgets[]` in `app.json` (each becomes a generated
`StaticConfiguration` in the extension; `widget-config.test.ts` pins the names
and families to the code):

| Widget (`name`) | Families | Shows | Link |
| --- | --- | --- | --- |
| Roll in the camera (`RollWidget`) | `systemSmall`, `accessoryRectangular`, `accessoryInline` | the roll the Meter logs to (`pickMeterRoll`, as `useMeterRoll`): `rollLabel`, `EI <iso>` and push/pull, camera, frames shot; else "No roll in the camera" | that roll (`/shoot/film-log/roll/<id>`), else the film log |
| Last answers (`LastResultWidget`) | `systemSmall`, `accessoryRectangular` | the last result of each tool that records one, in hub order | the Shoot hub (`/shoot`) |
| Process timer (`TimerWidget`) | `systemSmall`, `systemMedium`, `accessoryRectangular` | the stage, "Stage n of N", a ticking stage countdown, "ends 7:42 PM" (small, medium), run left, next stage (medium); paused frozen; Done; idle "No timer running" and "Last: <title>" | the timer |

- **Frames SHOT, not left.** A roll has no capacity field (24, 36, bulk loads),
  so the widget counts up ("23 frames shot"). Do not invent a capacity.
- **Last answers, not "last print exposure".** Only a tool that is answer-first
  AND `persistsInputs` records a result, and Print's Exposure does not persist
  its inputs, so no Print tool records one. The recording rule was not changed
  (a tile must never contradict a tool that resets); the widget shows what
  does record (Camera Exposure and Lenses, both Shoot, so the Shoot hue and
  link). If a Print tool starts recording, revisit its link and name
  (`last-result-widget-props.test.ts` fails then).
- **Isolated runtime.** Each layout (`src/lib/widgets/roll-widget.tsx`,
  `last-result-widget.tsx`, `timer-widget.tsx`) follows the Live Activity's
  rules exactly: a `'widget'` function compiled to a string, every helper
  inside it, colours as literal hex props (`widget-palette.ts`), no clock. The
  root view of every family carries `containerBackground(bg, 'widget')` and the
  one `widgetURL`. `src/test/widget-runtime.ts` is the harness the three
  widget tests share (compile with the app's Babel config, render with only the
  runtime's globals, allow-lists checked against the exported declarations of
  the installed `@expo/ui`). `live-activity-widget.test.ts` keeps its own copy
  of the same harness, unchanged, rather than risk weakening it in a move; each layout test renders every
  family in every state (empty, normal, long text, paused, done) and checks
  one-line text with tail ellipsis. The family comes from
  `environment.widgetFamily`, matched with `indexOf` so a differently
  formatted description cannot fall through to the wrong layout.
- **Props builders** are pure and tested: `roll-widget-props.ts`,
  `last-result-widget-props.ts` and the timer's `src/lib/timer/widget-timeline.ts`.
  Strings arrive formatted and cut (`cutText`, an ellipsis within the limit).
- **Sync** (`src/lib/widgets/widgets.ts`): loads expo-widgets only once its
  native module exists, builds the three `Widget` objects ONCE at module load
  (each constructor stores its layout in the App Group, so a placed widget
  never shows "No layout found" once the app has run), and falls back to a
  no-op with one development warning when the bundle or dev client is stale
  (`selectWidgetNative`, `widgets-missing-native.test.ts`). It is first
  imported by `TimerRunEffects`, so it loads at app start. Pushes: all three at
  load and on every `AppState` `active`; the roll on MMKV value changes of the
  film log's `rolls` and `cameras` and the Meter's `meterRollId`, and last
  answers on the last-result store's key, both coalesced for 300 ms so a burst
  of writes parses the store once (`createCoalescer`); the timer from
  `TimerRunEffects` (every render and on foreground, beside
  `syncLiveActivity`). `createWidgetPusher` (`widget-sync.ts`) takes a KEY and
  a builder: it pushes only when the key differs from what was last pushed
  (the props for the roll and last answers, the schedule for the timer), and
  builds the timeline only then, after a debounce that a steady stream cannot
  hold back (200 ms for the timer).
- **Live Activity buttons flush the widget.** A Pause, Resume or Skip pressed
  on the Live Activity runs in the app inside a 5 s background hold, and a
  React render may never happen before iOS suspends the app again, so the
  widget would go on counting through a pause. `createTimerActionRunner`
  (`live-activity-interaction.ts`) therefore calls the widget's `sync` and
  `flushNow` (`syncTimerWidget`, `flushTimerWidget`) right after the
  activity's own update, in a `finally`, so it runs even when that failed. The
  tab bar accessory's pause goes through the same runner.
- **The timer TIMELINE.** A widget, unlike a Live Activity, CAN change on a
  schedule without the app: WidgetKit shows each timeline entry from its
  date. So a running run is pushed once as one entry per stage, dated at that
  stage's absolute start, each naming its own stage, number and next stage and
  carrying that stage's `[start, end]` and the run's; then "Done" at the run's
  end; then idle ("Last: <title>") `DONE_SHOWN_MS` (30 min) later, so Done does
  not sit on the Lock Screen for days; then the keep-alive (below). Paused and
  idle are one entry each. The anchoring is the Live Activity's
  (`buildActivityProps` from the store's `anchorMs`), so the two never
  disagree. Two steps: `timerWidgetSchedule` (status, absolute stage times,
  frozen values) is the change key, and `timerWidgetEntries` builds the
  entries from it at push time, dropping those wholly in the past
  (`dropPastEntries`): the first entry is always the current stage, which is
  what WidgetKit's snapshot (the gallery preview) shows. Because the key is the
  schedule and not the entry list, a stage boundary passing is not a change;
  `timerScheduleChanged` compares times within the Live Activity's
  `TIME_TOLERANCE_MS`, so only start, pause, resume, skip, reset and completion
  push. A completed run's Done is dated at the run end last pushed (the Live
  Activity controller's rule), not when the app noticed. A 12-stage run pushed
  at its start is 15 entries, about 8 KB with every name at its cut length (a
  test caps it at 10 KB), and shrinks as stages pass.
- **Zero-length stages** are left out of the widget: never an entry, never
  "next", not counted in "Stage n of N" (such a stage is current for no time at
  all). So "Stage n of N" counts timed stages only, and can read "of 3" where
  the timer screen lists 4 rows. A run paused on one (a skip landed there) shows
  the stage that resumes, or, past the last timed stage (a trailing 0 s stage,
  such as a blank one just added), the last timed stage with 0:00 left and no
  next. The Live Activity does NOT do this: it lists every stage as a row, a 0 s
  stage reading 0:00, and counts it in "+N more"; it was left unchanged.
- **"ends 7:42 PM".** Small and medium show the current stage's end as a clock
  time (`Text` with `date` and `dateStyle="time"`) beside the ticking
  countdown. It cannot go stale (each entry carries its own stage's absolute
  end, and the next entry takes over at that moment), whereas a countdown is
  right only while it ticks, and on the Simulator's Home Screen the medium
  family's did not (see below). The rectangular accessory has no free line for it and its countdown
  ticked on the Lock Screen, so it is left out there. Paused shows no end.
- **Keep-alive entry and reload budget.** Every push is `updateTimeline`,
  which writes the App Group and calls `WidgetCenter.reloadTimelines(ofKind:)`.
  WidgetKit budgets reloads requested while the app is not in front, so never
  push per tick or re-push identical keys; reloads made while the app is active
  are not budgeted. expo-widgets' timeline policy is `.atEnd`: once every entry
  is in the past WidgetKit asks for a new timeline, gets the same one and asks
  again. So every timeline ends with a copy of its last entry dated a year
  later (`KEEP_ALIVE_MS`, `withKeepAlive`; `snapshotTimeline` for the roll and
  last answers). No layout depends on the time of day, so the copy shows the
  same thing; the timeline ends only in a year, and the app pushes a fresh one
  long before, on any launch or change.
- **What can go stale.** A run that dies with the app (killed) keeps its
  timeline on the widget until the app next runs and pushes idle (at most it
  reads Done, then idle 30 minutes after the planned end); the notifications
  and the Live Activity have the same limit. A paused run reads Paused until
  the app changes it. The roll and last answers change only when the app
  writes them, and the app pushes on every write.
- **What a locked phone shows.** Exactly the pushed fields, nothing else: the
  roll's label (its name or film), EI and push/pull, camera name and frame
  count; the two last answers with their tool names; the timer's preset title,
  stage names, stage number and count, times and the last run's title. No
  place, coordinates, notes, photo names or roll ids beyond the link URL.
- **Safelight: normal palette always.** System surfaces are not dimmed, and a
  widget sits beside the wallpaper and other apps' widgets, so a red widget
  would not make the screen darkroom-safe; and its look is fixed until the
  next push, so a widget drawn red would stay red after the mode is switched
  off from Control Center with the app closed. The Live Activity's red look
  (drawn while a run is going, refreshed on every mode change while the app
  runs) does not carry over to widgets the user leaves on the Home Screen for
  weeks. All three are consistent.
- **Data stays put.** The widgets read only what is pushed through
  expo-widgets; the film log stays in the app's container. Never add the
  Info.plist key `AppGroupIdentifier` (see "The shared module").
- **A layout edit needs an app relaunch**, not just Fast Refresh: the layout
  string is stored when the `Widget` objects are built, and in development the
  runtime is kept on `globalThis.__dorkroomWidgets`.

**Verified on the iOS 27.0 Simulator** (widgets added through the real widget
gallery with `idb`: long-press the Home Screen, Edit, Add Widget, "Dorkroom";
Lock Screen: long-press, Customize, Lock Screen, Add Widget): the gallery and
the Lock Screen picker show all families with real data; a shot logged in the
app reaches the roll widget within a few seconds, and Mark as shot moves it to
the next roll in the camera; a skip, a pause and a reset each reached the timer
widget within a few seconds; at a stage boundary, with the app untouched, the
widget switched to the next entry by itself; a short run reached Done on its
own and the pushed timeline then held Done at the scheduled end, idle 30
minutes later and the keep-alive; Pause, Skip and Resume pressed on the Live
Activity with the app in the background reached the Lock Screen and Home
Screen widgets within about 4 s (the Simulator does not suspend the app, so
this does not prove the flush beats a real suspension); each widget's tap
opens its screen.

**Ticking on the Simulator's Home Screen.** A `ProgressView(timerInterval:)`
anywhere in a layout stopped that widget's timer text from animating, so the
widgets have no timer progress bars. Without one, `systemSmall` ticks and the
Lock Screen accessory ticks in step with the Live Activity, but `systemMedium`
still showed its value from render time (unchanged with its root as a
`VStack`, with `Text(date, style: .timer)` or without `minimumScaleFactor`);
the cause is unknown and it is unchecked on a device. The "ends 7:42 PM" line
keeps it correct either way.

**The gallery preview** shows the timeline's first STORED entry. Past entries
are dropped when a timeline is pushed, so it is right at push time, but after
a later stage boundary with no push it shows the finished stage (reading 0:00
and its past end time). Fixing it would mean a push at every boundary.

**Unverified on a device:** the Home Screen countdown ticking (the medium
family above); stage
switches at boundaries with the app suspended or killed (the Simulator does not
suspend the way iOS does); a Live Activity Pause, Resume or Skip pressed with
the app SUSPENDED reaching the widget within the 5 s hold (the runner flushes
it; see the Simulator note above); the reload budget when pushes come from the
background; `accessoryInline` and the
last-answers `accessoryRectangular` placed on a Lock Screen (only previewed);
the Lock Screen's vibrant rendering of the palette; a run that reaches its
natural end showing Done (unit-tested only).

### Control Center controls

Four controls (iOS 18 `ControlWidget`s, Swift in
`plugins/with-widget-controls/swift/`), all in the expo-widgets extension:

| Control | Kind | Does |
| --- | --- | --- |
| Safelight mode (toggle, `lightbulb.fill`, red when on) | `art.dorkroom.mobile.control.safelight` | flips the App Group copy of the mode, in the extension |
| Start last timer (`timer`) | `...control.start-last-timer` | opens `dorkroom://develop/recipes/timer?start=last` |
| Log a frame (`film`) | `...control.log-frame` | opens `dorkroom://log-frame` |
| Open meter (`camera.aperture`) | `...control.open-meter` | opens `dorkroom://meter` |

`src/lib/control-kinds.ts` repeats the kinds for `reloadControls`
(`control-kinds.test.ts` compares them with the Swift), and
`tool-manifest.test.ts` parses the three URLs out of `ControlLinkIntent.swift`
and checks each resolves cold and warm.

**Why hand-written Swift, patched into the generated extension.** expo-widgets
(57.0.27) has no Control Center support, and it deletes and regenerates
`ios/ExpoWidgetsTarget/` on every prebuild, ending its `@main` `WidgetBundle`
with `WidgetLiveActivity()`. `plugins/with-widget-controls` (listed BEFORE
`expo-widgets` in `app.json`, so its mods run after it; `app-plugin-order.test.ts`
pins it):

- copies the Swift files into `ios/ExpoWidgetsTarget/` and adds
  `DorkroomControlsBundle().body` under the `WidgetLiveActivity()` line of
  `index.swift` (`patch-index-swift.js`, pure, tested against the real generated
  text, with and without the Home Screen widgets). With `widgets[]` the
  generated bundle lists the widgets first and still ends with one
  `WidgetLiveActivity()` (expo-widgets puts four widgets per bundle and the
  Live Activity at the end of the last one), so the anchor needed no change. The anchor is strict: if that line is missing or appears more than
  once the prebuild THROWS, so an expo-widgets upgrade that changes the
  generated file fails loudly instead of shipping without the controls. Update
  the anchor (and the test's fixture) then.
- adds the files to the `ExpoWidgetsTarget` target's Sources phase (found by
  name and checked to be an app extension), `ControlLinkIntent.swift` to the
  app target too, and `DORKROOM_WIDGET_EXTENSION` to the extension's
  `SWIFT_ACTIVE_COMPILATION_CONDITIONS`. The file references go in the
  PBXGroup named AND pathed `ExpoWidgetsTarget`: after `pod install` the
  project has a second group of that name (under `ExpoModulesProviders`, no
  path), and a lookup by name alone can pick it, which puts the files at
  `ios/<file>` and fails the build with "Build input file cannot be found".
  Idempotent over a project that already has them: no second reference, build
  file or flag (`widget-controls-project.test.ts`, against a reused-project
  fixture with both groups).

**Prebuild and `ios/`.** In this Expo CLI (`@expo/cli` for SDK 57) plain
`expo prebuild` CLEANS by default (`clean: !args['--no-clean']`): it deletes
`ios/` and recreates it ("Clearing ios" in the log), which is safe here only
because `ios/` is generated and gitignored. `expo prebuild --no-clean` keeps
`ios/` and applies the mods to the existing project, Pods groups included, which
is the case the group lookup above guards. Use the default (clean) after
changing plugins, `app.json` or native dependencies, or when the project looks
wrong; `--no-clean` to keep local edits in `ios/` or to save the template copy.
Either way `pod install` runs afterwards.

The extension is built for iOS 26 because `app.json` sets `ios.deploymentTarget`
(`"26.0"`), the field expo-widgets reads for the extension (it falls back to 16.4
otherwise; it has no plugin option). A test keeps it equal to the
`expo-build-properties` value. So no availability guards in the Swift.

**The shared module.** `modules/dorkroom-shared` is a local Expo module
(autolinking scans `apps/mobile/modules/` by default: `expo-module.config.json`,
`ios/DorkroomShared.podspec`, `ios/DorkroomSharedModule.swift`, `index.ts`).
Synchronous `getSharedBool`, `setSharedBool`, `getSharedNumber`,
`setSharedNumber` on `UserDefaults(suiteName:)` for the group named by the app's
Info.plist key `ExpoWidgetsAppGroupIdentifier` (written by expo-widgets), and
`reloadControls(kind?)`. The same pod also holds `DorkroomSpotlightModule` and
an app-delegate subscriber (see "Spotlight and Ask Dorkroom"). Every App Group call throws when that key is absent OR
the build lacks the App Group entitlement: without it `UserDefaults(suiteName:)`
still succeeds but returns a store private to the app that the extension never
sees, so the module checks
`FileManager.containerURL(forSecurityApplicationGroupIdentifier:)` first. Use it through
`src/lib/shared-defaults.ts`, which degrades to null reads and no-op writes, with
one development warning, when the native module is missing (a stale dev client,
vitest) or the group is unavailable. **Never add the Info.plist key
`AppGroupIdentifier`**: react-native-mmkv would move every MMKV store into the
App Group and the film log and every other store would be orphaned.

**Safelight.** The toggle's `SetValueIntent` runs in the extension and writes
`safelightOn` and `safelightChangedAt`, so it works with the app killed. The app
reconciles before the first render (see Safelight mode). Stamps are monotonic on
both sides so a press made after the device clock was set back still wins: the
extension writes `max(now, shared + 1)` and the app `max(now, local + 1,
shared + 1)` (`nextSafelightStamp`, tested end to end through
`reconcileSafelight`). The store is `createSafelightStore` (storage, shared
defaults and the app-state source injected; `safelight-store.test.ts`). Verified on the iOS
27.0 Simulator: with the app terminated, the shared value set to on with a newer
stamp, the next launch's first rendered frame after the launch screen was
already red (max G and B 0); the same set to off while the app was in the
background was adopted on foreground. The launch screen itself is not red.

**How the buttons open the app.** An extension cannot call `UIApplication`. The
buttons run `OpenControlLinkIntent` (`ControlLinkIntent.swift`), compiled into
BOTH targets with `supportedModes = .foreground(.immediate)`: because the app
has the intent and it runs in the foreground, the system launches or foregrounds
the app and runs `perform()` there, which opens the link with
`UIApplication.shared.open` (the extension's copy is compiled without it, behind
`DORKROOM_WIDGET_EXTENSION`). Tried first and rejected: an extension-only intent
returning `.result(opensIntent: OpenURLIntent(url))`; on the iOS 27.0 Simulator
the action "succeeded" but AppIntents logged `Prepared url to URL(nil)` and the
app never opened, for a `dorkroom://` URL. With the dual-target intent, on the same Simulator: Open
meter and Start last timer opened the app at the right screen from a killed app
(Start last timer then started the run), and Log a frame and Start last timer did
so with the app in the background.

**Simulator build used** (no signing team; the Simulator's ad-hoc signing carries
the App Group entitlement, so do not pass `CODE_SIGNING_ALLOWED=NO`):

```bash
cd apps/mobile
CI=1 bunx expo prebuild --platform ios   # cleans ios/ (see "Prebuild and ios/")
xcodebuild -workspace ios/Dorkroom.xcworkspace -scheme Dorkroom \
  -configuration Debug -destination 'platform=iOS Simulator,id=<udid>' \
  -derivedDataPath ios/build build 2>&1 | tee /tmp/dorkroom-sim-build.log
xcrun simctl install <udid> ios/build/Build/Products/Debug-iphonesimulator/Dorkroom.app
```

Install over the existing app (never uninstall: that deletes the film log).
The Simulator's Control Center does list third-party controls: swipe down from
the top-right, tap `+`, "Add a Control", and Dorkroom's four are in the gallery.
To fake a control write from the host, use
`xcrun simctl spawn <udid> defaults write <group container>/Library/Preferences/group.art.dorkroom.mobile.plist safelightChangedAt -int <ms>`
(`-int`: `-float` is single precision and rounds a millisecond stamp by
minutes, which can make it older than the app's).

**Unverified on a device:** the controls in a real phone's Control Center and
on the Lock Screen, the Action button bound to a control, the Safelight toggle
and the buttons with the app killed on a device (the Simulator does not kill or
suspend apps the way iOS does), and the control's red tint under the system's
own appearance settings.

### Spotlight and Ask Dorkroom

The Home Screen search finds the user's rolls and recently opened recipes, and
"Ask Dorkroom" (Siri, the Shortcuts app) opens Home with a question in the box.

**What is indexed.** The on-device Core Spotlight index only (`CSSearchableIndex.default()`,
nothing public, nothing synced or donated). Two domains:

- `rolls`: every roll. Title `rollLabel`; description camera, `EI <iso>`, the
  status word (`rollStatusLabel`), frames shot; keywords film stock, camera and
  the lenses used on its shots. Keyword matching (finding a roll by its film,
  camera or lens alone) was not seen on the Simulator; check it on a device.
- `recipes`: the recently opened recipes the catalog can name, at most 50
  (`MAX_SPOTLIGHT_RECIPES`). Title "Ilford HP5 Plus in Ilford DD-X" (the
  development record's name), description time, dilution, EI and temperature;
  keywords film and developer. The recent list keeps 50 ids
  (`MAX_RECIPE_HISTORY` in `recent-store.ts`); Home still shows the first 3. The
  mobile app has no custom recipes, so there are none to index.

**What never is:** notes (roll, shot, camera, lens, development, recipe),
places, coordinates, photos. The builders (`rollSpotlightItem`,
`recipeSpotlightItem` in `src/lib/spotlight-index.ts`, pure) pick fields one by
one, and `spotlight-index.test.ts` builds fixtures that carry notes, places and
coordinates and checks none reaches any field. Every item is removable: a
deleted roll is removed on the next sync, an empty film log clears the whole
`rolls` domain (`removeSpotlightDomain`), and recipes that leave the recent list
or the catalog are removed.

**Ids are app paths.** An item's id is the path it opens
(`/shoot/film-log/roll/<id>`, `/develop/recipes/recipe/<uuid>`), so a tap needs
no lookup table. Both sides allow only those two prefixes followed by one
segment of `[A-Za-z0-9_-]`, at most 128 characters (`SPOTLIGHT_PATH_PREFIXES`
and `spotlightPath` in JS, `DorkroomSpotlight.pathPrefixes` in Swift, compared by
a test); Swift refuses anything else both when indexing and when a result is
tapped. A roll that was deleted after indexing still opens the film log, not an
empty screen (`resolveMissingRollLink`, see "Legacy paths").

**Sending only changes.** `planSpotlightSync` (pure) compares the desired items
with the record of what the index last accepted, kept per domain in MMKV
(`dorkroom-spotlight`, keys `indexed.rolls` and `indexed.recipes`: id to content
hash and time). It sends new, changed, and week-old items (`SPOTLIGHT_REFRESH_MS`:
items expire after a month by default, and the native side also sets no expiry
with `expirationDate = .distantFuture`), and removes ids no longer wanted. The
record changes only for what the index accepted (`syncSpotlightDomain` in
`spotlight.ts`), so a failure or a dev client without the module retries on the
next sync. Clearing an empty domain is skipped when nothing is recorded (no
native call). Each record carries the native build it was made under
(`build.<domain>`: `appBuildIdentity` of `Constants.expoConfig.version` and
`Constants.platform.ios.buildNumber`, the binary's `CFBundleVersion`, from
`expo-constants`); under a new build the domain is cleared once and everything is
sent again, so an index wiped behind the record's back (a restore, a reinstall)
is noticed at the next build rather than after a week. A domain's syncs run one
at a time (`createSerialQueue`) in `createSpotlightRuntime` (`spotlight.ts`,
dependencies injected and tested); `spotlight-sync.ts` wires it to MMKV and the
film log. Nothing reaches Spotlight in the first `STARTUP_SYNC_DELAY_MS` (3 s)
after start: work asked for earlier (a recipe sync from the first render, a
film log change) waits in its queue. Rolls sync once when that delay ends and on
MMKV changes of the film log's `rolls`, `cameras` and
`lenses`, coalesced for 300 ms with the widgets' `createCoalescer`. Recipes are
sent by `SpotlightEffects` (`src/components/spotlight-effects.tsx`, mounted in the
root layout beside `TimerRunEffects`), which reads the recent list with
`useSyncExternalStore`. It enables the catalog queries (`useHomeSearchData`)
only when a recent recipe is missing from the record or due for a re-send
(`recipesNeedIndexing`); otherwise it only removes the indexed recipes that
left the list (`pruneSpotlightDomain`). It sends nothing until the films,
developers and recipes have all loaded, so a slow or failed load never empties
the index. A recent recipe the catalog no longer has stays "missing", so it
keeps the catalog wanted at launch until it leaves the recent list. A recipe
already indexed whose catalog details change keeps its old details in Spotlight
until the 7-day re-send (`SPOTLIGHT_REFRESH_MS`). An empty catalog list while
recent recipes exist sends nothing (`recipeSyncAction`), so it cannot clear the
domain.

**Native.** `DorkroomSpotlightModule` (`Name("DorkroomSpotlight")`) is a second
module class in the `dorkroom-shared` pod, so a dev client built before it
reports it missing and `src/lib/spotlight.ts` falls back to a no-op with one
development warning. `DorkroomSpotlight.swift` imports only system frameworks
(`swiftc -typecheck` works on it alone). The content type is `UTType.text`.

**Taps.** `DorkroomSpotlightAppDelegateSubscriber`, registered with
`appDelegateSubscribers` in `expo-module.config.json`, handles
`CSSearchableItemActionType` only: it validates `CSSearchableItemActivityIdentifier`
against the allow-list and hands `dorkroom://<path>` to the app delegate's
`application(_:open:options:)`, exactly as the scene delegate
(`plugins/with-ios-scene-lifecycle`) hands it every real URL: expo-linking's
subscriber records it synchronously, so on a cold launch (this runs before the
JS bundle) it is the initial URL expo-router reads, `RCTLinkingManager` posts it
to a running app, and `redirectSystemPath` routes it (warm through the hub
handoff). Not `UIApplication.open`, an OS round trip whose delivery while the
scene is still connecting is less certain. The scene delegate forwards
launch-time activities and `scene(_:continue:)` to the app delegate, which calls
every subscriber. That delegate method is deprecated in iOS 26 (a compiler
warning, as in the scene delegate).

**"Search in App" is deliberately off** (no `CoreSpotlightContinuation` in
`app.json`): expo-router 57.0.29's `ExpoHeadAppDelegateSubscriber`, which would
handle that activity, encodes the query with `.urlHostAllowed` (so `+` becomes a
space and `&` cuts the question short) and only posts it to a running app (so a
cold launch loses it). Our subscriber never handles
`CSQueryContinuationActionType` (a test checks), so turning the row on later
cannot make one tap open two URLs; expo-router's acts only on that type or an
`href` in the user info, ours only on `CSSearchableItemActionType`.

**Ask Dorkroom.** `AskDorkroomIntent.swift` (app target, in the
`with-app-intents` file list): a required `String` parameter "Question" with the
request dialog "What do you want to know?", `openAppWhenRun` (the app target's
proven style), and `perform()` opening `dorkroom://search?q=<question>`,
percent-encoded to RFC 3986 unreserved characters. Its App Shortcut phrases
("Ask Dorkroom", "Ask Dorkroom a darkroom question", ...) hold no parameter
(App Shortcut phrases cannot include a `String`), so Siri asks for the question.
There are 7 App Shortcuts of the 10 allowed. The answer shows in the app, in
Home's answer card, not in Siri: answering inside Siri would need the catalog and
the parser in Swift. `CalculateReciprocityIntent` stays a stub; "reciprocity
for 30s on HP5" style questions go through Ask Dorkroom and Search.
`tool-manifest.test.ts` reads the URL and the encoding set from the Swift and
checks a question reaches Home as a search event, cold and warm.

**Verified on the iOS 27.2 Simulator** (iPhone 18 Pro, Debug dev build): every
index, remove and domain call resolved true and `searchd` logged each donation as
completed; on a launch the roll sync ran at +3.0 s with no Spotlight call before
it; a new roll was sent alone (the diff), a rename re-sent only that roll, a
delete sent one remove; Spotlight showed a QA roll and all three recent recipes
by title, and tapping them opened the roll or recipe cold and warm (warm through
the hub, Back naming the phase); after the delete the result was gone and the
roll's link opened the film log cold and warm; a frame's note, place and
location (37.7749, -122.4194) matched no Dorkroom result; the Shortcuts app
listed all seven App Shortcuts, Ask Dorkroom showed "What do you want to know?"
and opened Home with the question and its answer card cold and warm, `+`, `&`
and `#` intact.

**Not seen on the Simulator, or flaky there:** Spotlight's ranking surfaced
Dorkroom results only for some queries (titles such as "Zephyr", "DD-X",
"BwXX"; the same query sometimes showed none), and never for a keyword alone
(film, camera or lens names), although the items were accepted. Unverified:
Siri voice, so the App Shortcut phrases and Ask Dorkroom through Siri (the
Simulator has no Siri voice); Spotlight ranking and keyword matching on a
device.

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
    Each record is parsed on its own (`stored-collection.ts`): one that fails is
    skipped and quarantined on the next write, never the whole list.
    The film-log types (`FilmRoll`, `Shot`, `Camera`, ...) are `z.infer` of
    those schemas and exported from the same file. Add a field to the schema
    only: zod strips unlisted keys, so a field on a hand-written type would be
    erased on the next MMKV read.
  - **Schema changes to the film log are additive and optional.** Old data must
    parse unchanged, with a hydration test that proves it. Never add a value
    to an existing enum: an older build reading newer data would fail that
    record and quarantine it on its next write. Give a new optional sub-object
    `.optional().catch(undefined)` (as `FilmRoll.development` does) so a
    malformed one costs only itself. An older build still drops a field it does
    not know on its next write; that is the accepted cost of an additive field.
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
  the local plugins in `plugins/` (`with-app-intents`, `with-ios-scene-lifecycle`, `with-ios-status-bar-forwarding`, `with-local-notifications-only`, `with-widget-interaction-hold`, `with-widget-controls`) and the `expo-widgets` entry
- the local Expo module in `modules/` (`dorkroom-shared`), or the control Swift in
  `plugins/with-widget-controls/swift/`
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
