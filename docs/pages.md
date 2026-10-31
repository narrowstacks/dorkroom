# Pages Reference

Documentation for all pages in the Dorkroom application.

## Route Structure

Routes use TanStack Router file-based routing in `apps/dorkroom/src/routes/`.

| Route | Page | Category | Status |
|-------|------|----------|--------|
| `/` | Home | — | Implemented |
| `/border` | Border Calculator | Printing | Implemented |
| `/stops` | Stops Calculator | Printing | Implemented |
| `/resize` | Resize Calculator | Printing | Implemented |
| `/mat` | Mat Cut Calculator | Printing | Implemented |
| `/reciprocity` | Reciprocity Calculator | Film | Implemented |
| `/development` | Film Development Recipes | Film | Implemented |
| `/negative-inverter` | Negative Inverter | Film | Implemented (Phase 1, web MVP) |
| `/lenses` | Lens Equivalency Calculator | Camera | Implemented |
| `/exposure` | Camera Exposure Calculator | Camera | Implemented |
| `/films` | Film Database | Reference | Implemented |
| `/docs` | Documentation | Reference | Separate repo (microfrontend) |
| `/privacy` | Privacy | — | Implemented |
| `/settings` | Settings | — | Implemented |

`/docs` has no route file in this repo. It is served by a different
application through Vercel Microfrontends; see [Documentation
(`/docs`)](#documentation-docs) below.

---

## Home (`/`)

**Purpose:** Answer a darkroom question straight away, then lead to the tool
that goes deeper. The search box is the hero: type a question and the page
answers it with a real number, from the calculators' own math or the recipe
database.

**Location:** `apps/dorkroom/src/app/pages/home-page.tsx`, with the search in
`apps/dorkroom/src/app/pages/home/`. The parsing and answers are
`searchHome` / `suggestHome` in `packages/logic/src/utils/home-search/`, pure
and platform-free so the iOS app can share them (issue #528).

**Features:**

- Grain-textured hero panel: `Greeting`, the "Skip the math. Make prints!"
  tagline, a one-line stat summary (development recipes, film stocks,
  developers), and the search box
- Search box (`SearchCombobox`): a WAI-ARIA 1.2 combobox whose popup is the
  results on the page itself, never a list over them. Once there is a query,
  its options are, in order, the answer card's link, the suggestions, then
  every match row. The listbox is the results panel; each section is a
  labelled group, led by an "Answer" group whose one option, for screen
  readers only, repeats the card's link and names the answer ("Open recipe:
  Ilford HP5 Plus in Ilford DD-X"), so the listbox's order is the arrow keys'.
  The answer is preselected, else the first match (never a suggestion, which
  only fills the box), so Enter opens it. Arrow keys move the active option
  (`aria-activedescendant`, focus stays in the box, the row is scrolled into
  view with room above and below), and wrap. While the box has focus the
  active option is tinted (the card's own link when the answer is active),
  never given the focus ring. Enter on a suggestion fills the box; an Enter
  that confirms an input method's composition is left alone. Escape clears
  the box. Rows work as links with a mouse or a tap. With an empty box the
  example's links are plain links, not options, and `aria-expanded` is false.
  `/` anywhere on the page focuses the box
- Answer card (`AnswerCard`): the title, a source or calculator tag, a "Read as"
  row showing how the query was understood (defaults marked "(default)"), a
  notice above the number when it answers something other than what was asked
  (an EI or a temperature the pair has no recipe for; both when both), the big
  number in Fraunces on one line (a long one steps down a size; inch
  fractions in it are set in the body font, as in the facts), a few facts
  (a reciprocity formula's power set as a superscript), notes, and a link that
  opens the matching page pre-filled (see [Link Parameters](#link-parameters))
- Results panel beside the answer (`ResultGroups`): up to four "Suggestions"
  (completions of film, developer and tool names, plus query templates that
  teach the syntax; none that repeats a match, and no recipe suggestions once
  a film and developer are both named, since the answer and the pair's other
  recipes cover them), then the grouped matches: development recipes, film stocks,
  developers and tools, each with a count. With a recipe answer the recipes
  group is "Other recipes for this pair", the ones its footnote counts.
  Suggestions name films and developers in full, as the matches do, and fill
  the box short ("HP5 Plus in D-76"). A suggested pairing is the partner most
  widely used in the data (the most films or developers it has recipes with),
  then the one with most recipes for the pair
- With an empty box: a real answer to an example query, labelled "Example",
  and "Try" chips that fill the box and move focus to it
- Tools grid of `ToolCard`s, one per calculator, from the `homeToolCards` tool
  manifest in `@dorkroom/ui`
- Footer with license, `/privacy`, GitHub, and Ko-fi links

**Query syntax:**

| Kind | Examples | Answer |
| --- | --- | --- |
| Recipe | `hp5 at 800 in dd-x`, `tri-x xtol 1600`, `tri-x in d-76 1+1`, `fp4 in id-11`, `hc-110 dilution b tri-x` | Time, temperature, dilution, EI with push or pull, agitation ("Not in source" when the data has none), source, official or community, and the EIs of the pair's other recipes. EI via `at`, `@`, `ei` or `iso`, or a bare number that is part of neither name and is an EI the pair has a recipe at or a film speed of 100 or more (so `hp5 rodinal 50` and `hp5 xtol 68` read no EI; a push beats a box speed typed beside it, `hp5 400 xtol 1600`); an EI with no recipe says so above the time ("No EI 1600 recipe for this pair. Showing EI 400.") and lists the other EIs that have one. Dilution as `1+4`, `1:31`, `stock` or an HC-110 letter; temperature as `24c`, `24 °C` or `75f`; a temperature with no recipe is said above the time in the unit typed, plus the visitor's when that differs ("No recipe at 24°C (75.2°F). This one is at 20°C (68°F)."). Temperatures lead with the visitor's °C/°F setting (shared with `/development`) |
| Reciprocity | `tri-x 30s`, `delta 3200 2m`, `hp5 reciprocity` | Corrected time from the film's reciprocity factor. Without a time it assumes 30s, marked |
| Border | `11x14 6x7 1.45`, `8x10 35mm 1 1/4`, `24x30cm 6x6 2cm`, `8x10 645 borderless`, `9.5x12 6x9 1 portrait`, `6x7 1.5` | Print size and the borders on each side, centred, with a diagram. The larger size is the paper (default 8x10), the other the negative (default 35mm); a lone `4x5` is a negative. A bare border up to 4 is inches; any number with a unit (`15mm`, `2cm`, `2in`) is read in that unit; a bare number above 4 is ignored with a note. ISO papers `a2` to `a6` read as their size in cm (`a4 35mm` is 21×29.7 cm, a custom paper in the Border Calculator link). Metric queries answer in metric first. Inch fractions are all written one way (`9 5⁄16`), and a border is never shown under the minimum asked for: the print is worked out for the minimum rounded up to a step the answer shows (1.45 in becomes 1 1⁄2, so `11x14 6x7 1.45` is 8 × 9 5⁄16), which keeps the negative's shape, makes both units describe one print, and is the border the Border Calculator link passes. Paper lies landscape (the Border Calculator's default) unless the query says `portrait` or `vertical`; an ISO paper stands portrait, as the standard gives it, unless the query says `landscape` or `horizontal`; the diagram is drawn the way the paper lies |
| Resize | `8x10 to 11x14 12s`, `11x14 from 8x10 20s`, `24x30cm to 30x40cm 15s`, `height 40cm to 60cm 10s`, `8x10 to 11x14` | New time, stops, factor, and whether the two sizes share a shape |
| Lens | `80mm on 6x6`, `80mm 6x6 to 35mm`, `90mm on 645 to apsc`, `25mm mft equivalent` | Equivalent focal length, field of view, crop factors. Target defaults to full frame (6x6 from full frame), marked. With paper named, a mm number is a border unless it cannot fit or the query says `lens` or `equivalent` |
| Stops | `12s +1/3`, `12s plus 2 stops`, `15s down 1 stop`, `12 seconds plus half a stop`, `12 sec minus a third of a stop` | New time. A change as a number (`1/3 stop`, `-0.5`) or in words (`half a stop`, `two thirds of a stop`, `two stops`, `one and a half stops`), signed with `+`, `-`, `plus`, `minus`, `add`, `up` or `down` |
| Mat | `16x20 mat 8x10 print`, `11x14 mat for 8x10`, `mat 16x20 11x14 reveal 1/8`, `16x20 mat 11x14 1/8 reveal`, `16x20 mat 8x10 bottom weight` | Window opening and best-fit borders; the reveal (its number before or after the word) defaults to the calculator's, marked. Needs the word `mat`, `matte` or `window` |
| Camera exposure | `f/8`, `1/125`, `iso 400 f/8`, `sunny 16`, `what shutter` | A link to the Camera Exposure calculator, no answer. Only when no other calculator reads the query: `enlarge 8x10 to 16x20 20s f/8` is a resize |
| Lookup | `portra 400`, `rodinal`, `foma`, `reciprocity` | Grouped matches only. Every tool is found by its name |

Times worked out in stops, resize and reciprocity answers are at darkroom
precision: a tenth of a second under a minute (`15.1s`, `17.0s`), whole
seconds from there (`3m 8s`). A time the query typed is echoed as typed
(`12s`, not `12.0s`).

**Spellings:** names match however they are spaced or run together (`hp5+`,
`tmax400`, `t max 400`, `tri x`, `d 76`). A small alias table in
`packages/logic/src/utils/home-search/catalog.ts` covers what the catalog does
not spell out: Kodak's codes `tmx`, `tmy` and `tmz` (T-MAX 100, 400 and P3200),
`5222` (Eastman Double-X) and the misspelling `rodinol`. A generic word in many
film names (`plus`, `pro`, `classic`) never names a film on its own.

**Data loading:** the page fetches only `useStats()` on load. Films,
developers and recipes (the recipes are about 500 KB) load on the first sign
of interest in searching: focus, pointer over the box, a keystroke, or a Try
chip. The example and every calculator answer need no data, so first paint
never waits on the catalog; a catalog query typed before it arrives shows
"Loading recipes and films". So does an easel query with a word it cannot
explain (`d76 8x10`, `tmax 100 4x5`), and a film and developer pair waits for
the recipes, so neither answers one way and then changes. If part of the
catalog fails to load, the card and the screen reader announcement say which
part, and calculator questions keep working.

**Data dependencies:**

- `useStats()` - recipe, film, and developer counts for the hero stat line
- `useFilms`, `useDevelopers`, `useCombinations` (with `enabled` off until the
  search is used) - the catalog the search reads

**Analytics:** one `home_search` event per settled distinct query (1.5s
without change, not per keystroke, never for the example), with the kind of
answer and the number of matches. Never the query text.

The footer year is set in a mount effect rather than during render, so
build-time prerender snapshots stay deterministic.

---

## Border Calculator (`/border`)

**Purpose:** Calculate print borders and trim guides for darkroom printing.

**Location:** `apps/dorkroom/src/app/pages/border-calculator/`

**Features:**

- Visual preview of border layout
- Input fields for paper size, image size, border widths
- Support for symmetric and asymmetric borders
- Responsive layouts (desktop/mobile)
- State persistence to localStorage

**Key components:**

- `DesktopBorderLayout` / `MobileBorderLayout` - Platform-specific layouts
- `useBorderCalculatorController()` - Form state and calculations

---

## Stops Calculator (`/stops`)

**Purpose:** Calculate exposure time adjustments by f-stops.

**Location:** `apps/dorkroom/src/app/pages/exposure-calculator/`

**Features:**

- Original exposure time input
- Stop adjustment buttons (±1/3, ±1/2, ±1 stop)
- Custom stop value input
- Calculated new exposure time
- Shows percentage change and multiplier
- Formula display: `time × 2^stops`
- State persistence to localStorage
- Share button in the header: hands on a link that reopens the current
  inputs (see [Link Parameters](#link-parameters))

**Calculations:**

- `calculateNewExposureTime(originalTime, stops)` → `originalTime × 2^stops`
- `calculatePercentageIncrease(original, new)`

---

## Resize Calculator (`/resize`)

**Purpose:** Calculate exposure adjustments when scaling prints.

**Location:** `apps/dorkroom/src/app/pages/resize-calculator/`

**Features:**

- Two calculation modes:
  - **Print Size Mode:** Original and target print dimensions (width × height)
  - **Enlarger Height Mode:** Lens-to-paper distances
- Original exposure time input
- Aspect ratio mismatch warning
- Calculated new exposure time and stops difference
- Unit conversion (imperial/metric via settings)
- State persistence to localStorage
- Share button in the header: hands on a link that reopens the current
  inputs (see [Link Parameters](#link-parameters))

**Calculations:**

- Print size: `newTime = originalTime × (newArea / originalArea)`
- Enlarger height: `newTime = originalTime × (newHeight² / originalHeight²)`

---

## Mat Cut Calculator (`/mat`)

**Purpose:** Plan a single-window mat and get the numbers a mat cutter needs.

**Location:** `apps/dorkroom/src/app/pages/mat-calculator/`

**Features:**

- Outer mat dimensions, with common board presets (`MAT_PRESETS`) and an
  orientation flip
- Independent top, bottom, left, and right borders
- Optional artwork dimensions plus a per-side reveal, which turns on reveal
  mode and the best-fit calculation
- Bottom weighting, for the optical-centre convention where the bottom border
  is deeper than the top
- Best fit: proposes the four borders that centre the artwork at the requested
  reveal, previewed before it is applied
- `mat-diagram.tsx` - proportional preview of board, window, and artwork
- Warnings for an invalid window and for a window that does not match the
  requested reveal
- Window-opening result, four cutter guide-bar settings, and a full dimension
  table
- Fraction-friendly inputs (`fraction-field.tsx`): decimals, simple fractions,
  and mixed fractions all round-trip
- Unit conversion (imperial/metric via settings): metric shows centimetre
  inputs and results, while form state, presets, and persistence stay in
  inches. `mat-units.ts` is the whole boundary.
- State persistence to localStorage
- Share button in the header: hands on a link that reopens the current
  inputs (see [Link Parameters](#link-parameters))

**Key hook:**

- `useMatCalculator()` - all parsing, geometry, best fit, warnings, and
  persistence. The iOS app consumes the same hook. Its optional `formatValue`
  option renders the derived strings in another unit; the math stays imperial.

**Note:** the iOS screen does not follow the measurement preference yet
(issue #263).

---

## Reciprocity Calculator (`/reciprocity`)

**Purpose:** Compensate for reciprocity failure in long exposures.

**Location:** `apps/dorkroom/src/app/pages/reciprocity-calculator/`

**Features:**

- Film stock selection with built-in reciprocity profiles
- Custom factor input for unlisted films
- Metered time input (accepts `30s`, `1m30s`, `2h` formats)
- Exposure presets (quick selection buttons)
- Adjusted exposure result
- Interactive reciprocity curve chart (collapsible, expandable)
- State persistence to localStorage
- Share button in the header: hands on a link that reopens the current
  inputs (see [Link Parameters](#link-parameters))

**Calculations:**

- `adjustedTime = meteredTime ^ factor`
- Factor varies by film stock (e.g., Tri-X = 1.3, Pan F = 1.2)

---

## Negative Inverter (`/negative-inverter`)

**Purpose:** Turn a phone photo of a negative (ideally shot on a light table)
into a "good enough" positive preview, for black and white or C-41 colour
film. Issue #527, Phase 1 (web MVP).

**Location:** `apps/dorkroom/src/app/pages/negative-inverter/`

**Features:**

- Load locally: file picker and drag-and-drop, plus a separate camera button
  (`capture="environment"`). Decoding uses `createImageBitmap` with
  `imageOrientation: 'from-image'`; a failed decode (HEIC outside Safari, a
  non-image file) shows a clear message instead of a blank canvas.
- Film type: Black & White (luminance) or Color (C-41, per channel)
- Crop rectangle with eight large touch handles plus a move area (pointer
  events; arrow keys nudge a focused handle). Statistics come only from inside
  the crop, so the light-table surround cannot wreck the levels.
- Film base picker and, for C-41, a neutral grey picker. Both show a loupe
  while the finger is down and pick where it lifts; keyboard users move a
  crosshair with the arrow keys and press Enter.
- Negative/positive toggle, exposure and contrast sliders, warmth and tint for
  C-41
- Download as JPEG (quality 0.92) or PNG, optionally only the cropped area
- Images never leave the device; the page says so. No analytics events.

**How it works:**

- On load the photo is decoded once, drawn into a proxy with a 2048 px long
  edge, and the full-size bitmap is closed. The proxy drives the preview,
  picking, and the density histograms.
- Histograms are rebuilt only when the base, crop, or film type changes;
  sliders only re-derive the coefficients (`deriveCoefficients` in
  `@dorkroom/logic`) and update shader uniforms.
- `inversion-shader.ts` holds the WebGL fragment shader (GLSL ES 1.00, so one
  source serves WebGL 2 and WebGL 1). It mirrors `invertPixel` and adds a
  4x4 ordered dither before the 8-bit write. Without WebGL,
  `cpu-inversion.ts` runs `invertPixel` with the same dither.
- Export (`export-positive.ts`) decodes the original again, crops and fits it
  under the iOS Safari canvas cap (16,777,216 px) in one `drawImage`, then runs
  the pixel pass in 2048 px tiles (or smaller, per `MAX_TEXTURE_SIZE` /
  `MAX_RENDERBUFFER_SIZE`). Above the cap it exports at the largest size that
  fits and says so ("Exported at 16 MP; original is 48 MP"). Every bitmap,
  canvas and GL context is released afterwards.
- Pure, platform-neutral geometry (proxy sizing, export fitting, tiling,
  coordinate mapping, crop dragging) lives in
  `packages/logic/src/utils/negative-inverter-geometry.ts` for the iOS app to
  reuse.

**TODO:** the issue's golden image corpus (reference B&W and C-41 negatives
shot on a light table, with the Phase 1 outputs saved as goldens) needs real
photos and is not in the repo yet. Phase 2 (WASM codecs, strip-wise export
with no canvas cap) is a follow-up.

---

## Lens Equivalency Calculator (`/lenses`)

**Purpose:** Calculate equivalent focal lengths between different sensor and film formats.

**Location:** `apps/dorkroom/src/app/pages/lens-calculator/`

**Features:**

- Source and target format selection (digital sensors, medium format film, large format film)
- Focal length input with preset buttons (24, 35, 50, 85, 135mm)
- Swap button to quickly reverse source/target formats
- Sensor size visualization comparing both formats
- Calculated equivalent focal length and diagonal field of view
- Source and target crop factor display
- Formula display: `focalLength × (sourceCropFactor / targetCropFactor)`
- State persistence to localStorage
- Share button in the header: hands on a link that reopens the current
  inputs (see [Link Parameters](#link-parameters))

**Calculations:**

- `equivalentFocalLength = focalLength × (sourceCropFactor / targetCropFactor)`
- `fieldOfView = 2 × atan(sensorDiagonal / (2 × focalLength))` (in degrees)

**Key components:**

- `SensorSizeVisualization` - Visual comparison of sensor/film sizes
- `usePersistedCalculator()` - Generic calculator state persistence hook

---

## Camera Exposure Calculator (`/exposure`)

**Purpose:** Balance aperture, shutter speed, and ISO for correct exposure. Find equivalent exposures and compare settings across different lighting conditions.

**Location:** `apps/dorkroom/src/app/pages/camera-exposure-calculator/`

**Features:**

- Aperture, shutter speed, and ISO selection from standard values
- EV (Exposure Value) calculation with scene brightness description
- Equivalent exposures table at the same EV and ISO
- Exposure comparison section (stops difference between two settings)
- Collapsible EV presets (lighting conditions like Sunny, Overcast, etc.)
- "Solve for" selector: adjust shutter speed, aperture, or ISO when applying a preset
- Formula display: `EV = log₂(N² × 100 / t × S)`
- State persistence to localStorage
- Share button in the header: hands on a link that reopens the current
  inputs (see [Link Parameters](#link-parameters))

**Calculations:**

- `calculateExposureValue(aperture, shutterSpeed, iso)` → EV number + description
- `getEquivalentExposures(ev, iso, aperture, shutterSpeed)` → table of aperture/shutter pairs
- `compareExposures(apertureA, shutterA, isoA, apertureB, shutterB, isoB)` → stops difference
- `solveForShutterSpeed(ev, aperture, iso)`, `solveForAperture(ev, shutterSpeed, iso)`, `solveForISO(ev, aperture, shutterSpeed)`

**Key components:**

- `EVResultCard` - EV display with formula
- `EVPresetButton` - Lighting condition preset buttons
- `usePersistedCalculator()` - Form state persistence

---

## Film Development Recipes (`/development`)

**Purpose:** Browse, filter, and manage B&W film development recipes.

**Location:** `apps/dorkroom/src/app/pages/development-recipes/`

**Features:**

- Film and developer selection dropdowns
- Collapsible filters (developer type, dilution, ISO, recipe type, custom recipes)
- Favorites filtering
- Grid and table view modes
- Pagination
- Recipe detail panel (sidebar on desktop, bottom drawer on mobile)
- Custom recipe creation/editing
- Recipe sharing (URL and clipboard)
- Recipe import from external sources

**URL search params:**

All of these are read, validated and written by `useRecipeUrlState`
(`packages/logic`), the only writer of the page's query string: one debounced
(300ms) `history.replaceState`, so filter changes never add history entries.
`q` seeds the search box at mount; the rest are applied once the catalogue
loads (`useUrlStateSync`). No param is written back until the catalogue has
loaded, `q` included, so if loading fails the URL keeps what the link carried.

```typescript
{
  q?: string;              // Free-text recipe search
  film?: string;           // Film slug
  developer?: string;      // Developer slug
  dilution?: string;
  iso?: string;            // ISO value or 'boxspeed'
  developerType?: string;  // 'powder' | 'concentrate'
  recipeType?: string;     // 'all' | 'hide-custom' | 'only-custom' | 'official'
  favorites?: string;      // 'true' to show favorites only
  recipe?: string;         // Recipe UUID for direct link
  source?: string;         // 'share' for shared recipes
  view?: 'favorites' | 'custom'; // Legacy, use recipeType/favorites instead
}
```

**Data dependencies:**

- `useDevelopmentRecipes()` - Main data hook
- `useCustomRecipes()` - CRUD for custom recipes (synchronous localStorage store)
- `useFavorites()` - Favorite management
- `useRecipeSharing()` - Share/copy functionality

---

## Film Database (`/films`)

**Purpose:** Browse and search the complete film stock database.

**Location:** `apps/dorkroom/src/app/pages/films/`

**Features:**

- Full-text search across film names
- Filters: color type (B&W, color, slide), ISO, brand, discontinued status
- Collapsible filter panel (desktop) / mobile filter layout
- Virtualized film results list (TanStack Virtual)
- Film detail panel with expandable info, and a Share button that hands on
  the film's `?film=slug` link
- Direct-link support via URL `?film=slug` parameter
- Debounced URL sync for all filter state (500ms)
- Accessibility: skip-to-results link, ARIA live region for result counts

**URL search params:**

```typescript
{
  search?: string;         // Full-text search query
  color?: 'bw' | 'color' | 'slide';
  iso?: string;            // ISO filter
  brand?: string;          // Brand filter
  status?: 'all' | 'active' | 'discontinued';
  film?: string;           // Film slug for direct link
}
```

**Data dependencies:**

- `useFilmDatabase()` - Main data hook with filtering logic

---

## Settings (`/settings`)

**Purpose:** User preferences and app configuration.

**Location:** `apps/dorkroom/src/app/pages/settings-page.tsx`

**Features:**

- Theme selection:
  - Dark (default)
  - Light
  - High Contrast (e-ink optimized)
  - Darkroom (pure black with red accents)
  - System (follows OS preference)
- Animation toggle (hidden for high-contrast/darkroom themes)
- Unit selection (Imperial/Metric)

**State management:**

- `useTheme()` - Theme and animation preferences
- `useMeasurement()` - Unit preference

---

## Privacy (`/privacy`)

**Purpose:** State exactly what the app measures and what it deliberately does
not.

**Location:** `apps/dorkroom/src/app/pages/privacy-page.tsx`

**Features:**

- The short version, then what we use, every event we record, what we never
  collect, opting out, and checking our work
- A table of every custom analytics event, rendered from the page's own
  `TRACKED_EVENTS` array

**Kept in sync, and enforced:** the event names here, in
`apps/dorkroom/src/app/lib/analytics/tracked-events.ts`, and in root `PRIVACY.md` must
match. `tools/__tests__/analytics-privacy-sync.test.ts` compares all three and
fails if they diverge; it runs as `bun run test:docs`, inside `bun run test`,
and in CI. Adding or changing an event means editing all three in the same PR.

---

## Documentation (`/docs`)

**Status:** Live, and served from a **separate repository**.

`dorkroom.art/docs` is a Fumadocs site owned by another repo and stitched in
through Vercel Microfrontends. Nothing under those paths lives here and there
is no `routes/docs.tsx`.

`apps/dorkroom/microfrontends.json` declares which paths route to it:

- `/docs/:path*`
- `/keystatic`, `/keystatic/:path*`, `/api/keystatic/:path*`
- `/api/search`
- `/og/docs/:path*`
- `/llms-full.txt`

`/docs` still gets a title and description from `ROUTE_TITLES` /
`ROUTE_DESCRIPTIONS` in `utils/routeMetadata.ts`, because the bot metadata
endpoint answers for the whole domain.

---

## Common Patterns

### Calculator Pages

All calculator pages follow a consistent pattern:

1. **Layout:** `CalculatorLayout` with title, description, sidebar, and results
   slots. The border calculator also uses `CalculatorLayout` on desktop
   (`ResponsiveBorderLayout`); its mobile drawer layout keeps its bespoke
   structure but gets the same accent header.
2. **Per-calculator accent identity:** each page passes an `icon` +
   `accentTone` to its header (the `--accent-<tone>-*` family from plan 003,
   aligned with nav categories so color = category, shade = tool). The same
   tone backs the primary results `CalculatorCard accent` and any toned
   `CalculatorStat`. Tones collapse to monochrome in high-contrast/darkroom.
   Mapping: border=indigo, stops=blue, resize=teal, mat=cyan,
   reciprocity=amber, development=rose (header only), lenses=emerald,
   exposure=teal (EV card; violet/sky secondaries), films=cyan (Reference).
   The mat diagram (`mat-diagram.tsx`) also uses the cyan accent token instead
   of the brand green so the page reads as its own tool.
3. **Two-column layout:** Main content + sidebar (info/help)
4. **Input card:** `CalculatorCard` with form fields
5. **Results card:** `CalculatorCard` with the page's accent tone
6. **Info cards:** How-to-use and educational content in sidebar
7. **State persistence:** localStorage via `usePersistedCalculator()`
8. **Sharing:** the page passes `onShare` to `CalculatorLayout` (or
   `CalculatorPageHeader`), which shows a Share button next to Reset. See
   [Sharing a calculation](#sharing-a-calculation). `/border` shares through
   its presets instead.

### State Persistence Pattern

Each calculator has one persistence definition, built next to its schema:

```typescript
export const myCalculatorPersistence = definePersistedCalculator(
  MY_STORAGE_KEY,
  { field1: positiveNumber, field2: z.boolean() }, // per-field bounds
  MY_FORM_DEFAULTS
);

const form = useForm({ defaultValues: myCalculatorPersistence.defaults });
const formValues = useStore(form.store, (state) => state.values);
const { resetToDefaults } = usePersistedCalculator(myCalculatorPersistence, {
  form,
  values: formValues,
});
```

The hook hydrates each persisted field through its schema (an invalid field
keeps its default), writes the persisted fields as one JSON object 300ms after
the last change, and clears the snapshot on reset. Storage comes from
`PersistenceStorageProvider` (MMKV on iOS) and falls back to `localStorage`.

### Link Parameters

Every calculator in this section can be opened pre-filled from URL search
params, for example `/lenses?focal=80&from=film-6x6&to=full-frame`. The
mechanism is shared; per calculator there is a param map plus a line of
wiring in each of the link, the route and the page:

1. **Param map** (`packages/logic/src/constants/calculator-link-params.ts`):
   URL param name to the persisted field it sets, such as
   `LENS_CALCULATOR_LINK_PARAMS = { focal: 'focalLength', ... }`. It has no
   runtime imports, so routes can use it without pulling calculator code into
   the entry chunk.
2. **Link** (next to the persistence definition):
   `defineCalculatorLink(lensCalculatorPersistence, LENS_CALCULATOR_LINK_PARAMS)`
   type-checks the field names and gives `read(search)` and `build(values)`.
3. **Route**: `...calculatorRoute(params, Page)` from
   `apps/dorkroom/src/components/calculator-route.tsx` in `createFileRoute`.
   It supplies `validateSearch` (a catch-all object, so other params such as
   `?preset=` survive) and a component that captures the link's params on
   mount, passes them to the page as `linkSearch`, and strips them from the
   URL. A navigation within the route that adds link params is ignored until
   the page mounts again.
4. **Page**: typed `CalculatorLinkProps<typeof lensCalculatorLink>`, so a
   route that hands it another calculator's params fails to compile. It
   passes `lensCalculatorLink.read(linkSearch ?? {})` as `overrides` to
   `usePersistedCalculator` (or its logic hook).

The persistence hook applies overrides over the stored snapshot, and they are
then saved like any edit, so a reload keeps them without re-applying the link.
Each value is checked by the field's persistence validator; an invalid or
unknown param is ignored. `link.build(values)` produces the params for a value
set.

On `/border`, a link renders the same whatever the viewer had stored. Each
length also sets the `lastValid*` mirror the layout draws from, as editing it
does. `landscape` pins the paper orientation, as Flip Paper does, even for
custom paper. A link that sets the paper (`paper`, `paperW` or `paperH`)
without `landscape` orients it the way picking that paper in the form does:
landscape for a standard size, and from the width and height for custom
paper. `offsetH` or `offsetV` turns offsets on (unless `offsets=false`), and a
link that sets the paper or ratio without any offset param centres the print.

Lengths are inches and times are seconds, as the calculators store them,
whatever unit the viewer has picked in `/settings`. Numbers accept a comma
decimal (`12,5`) or a simple fraction (`1/125`, `-1/3`). Booleans accept `true`,
`false`, `1` or `0`. An empty param (`artW=`) clears a text field, as clearing
that input does; on `/mat`, empty artwork sizes turn reveal mode off.

| Route          | Param          | Field                     | Value                                                     |
| -------------- | -------------- | ------------------------- | --------------------------------------------------------- |
| `/border`      | `paper`        | Paper size                | `8x10`, `11x14`, `5x7`, ..., or `custom`                  |
|                | `paperW`       | Custom paper width        | inches                                                    |
|                | `paperH`       | Custom paper height       | inches                                                    |
|                | `ratio`        | Aspect ratio              | `3:2`, `5:4`, `1:1`, `even-borders`, ..., or `custom`     |
|                | `ratioW`       | Custom ratio width        | number                                                    |
|                | `ratioH`       | Custom ratio height       | number                                                    |
|                | `border`       | Minimum border            | inches                                                    |
|                | `landscape`    | Landscape paper           | boolean                                                   |
|                | `flip`         | Flip the aspect ratio     | boolean                                                   |
|                | `offsets`      | Offsets on                | boolean                                                   |
|                | `offsetH`      | Horizontal offset         | inches, -3 to 3                                           |
|                | `offsetV`      | Vertical offset           | inches, -3 to 3                                           |
|                | `ignoreMin`    | Offsets may cross the minimum border | boolean                                        |
| `/stops`       | `time`         | Original time             | seconds                                                   |
|                | `stops`        | Stops to add              | number (negative removes)                                 |
| `/resize`      | `height`       | Enlarger height mode      | boolean                                                   |
|                | `fromW`        | Original print width      | inches                                                    |
|                | `fromL`        | Original print length     | inches                                                    |
|                | `toW`          | New print width           | inches                                                    |
|                | `toL`          | New print length          | inches                                                    |
|                | `fromH`        | Original enlarger height  | inches                                                    |
|                | `toH`          | New enlarger height       | inches                                                    |
|                | `time`         | Original time             | seconds                                                   |
| `/mat`         | `outerW`       | Outer mat width           | inches, decimal or fraction text (`16`, `3 1/2`)          |
|                | `outerH`       | Outer mat height          | inches                                                    |
|                | `top`          | Top border                | inches                                                    |
|                | `bottom`       | Bottom border             | inches                                                    |
|                | `left`         | Left border               | inches                                                    |
|                | `right`        | Right border              | inches                                                    |
|                | `artW`         | Artwork width             | inches                                                    |
|                | `artH`         | Artwork height            | inches                                                    |
|                | `reveal`       | Reveal                    | inches                                                    |
|                | `bottomWeight` | Bottom weighting          | boolean                                                   |
| `/reciprocity` | `film`         | Film                      | film id (`hp5`, `tri-x`, ...) or `custom`                 |
|                | `time`         | Metered time              | `30s`, `1m30s`, `2h`, or plain seconds                    |
|                | `factor`       | Custom reciprocity factor | number                                                    |
| `/lenses`      | `focal`        | Focal length              | millimetres                                               |
|                | `from`         | Source format             | format id (`full-frame`, `film-6x6`, `aps-c-canon`, ...) |
|                | `to`           | Target format             | format id                                                 |
| `/exposure`    | `aperture`     | Aperture                  | f-number (`5.6`)                                          |
|                | `shutter`      | Shutter speed             | seconds (`1/125`, `0.5`)                                  |
|                | `iso`          | ISO                       | number                                                    |
|                | `solve`        | Value to solve for        | `shutterSpeed`, `aperture` or `iso`                       |

The param names are a public contract (links already shared depend on them)
and are pinned by
`packages/logic/src/__tests__/utils/calculator-url-params.test.ts`.

#### Sharing a calculation

`/stops`, `/resize`, `/mat`, `/reciprocity`, `/lenses` and `/exposure` each
have a Share button in the page header. It builds
`<origin><route>?<link.build(current values)>`, so the link carries only the
fields the calculator's link params cover, and runs it through
`useShareLink(tool)` (`apps/dorkroom/src/app/lib/use-share-link.tsx`). That
hook is the one share flow for app pages: the share sheet on mobile, the
clipboard otherwise (with a "Link copied" toast), the shared `ShareModal` with
the link to copy by hand when neither works, and the `share` analytics event
for the tool. The tool sets the route, so a page only passes
`link.build(values)`, and renders the hook's `manualCopyDialog` once. The film
detail panel on `/films` uses the same hook for its `?film=slug` link.

On the form-backed calculators (`/stops`, `/resize`, `/reciprocity`) the
button is disabled while a field fails validation (`shareDisabled`): the link
would drop that field, and the recipient would see their own value in its
place.

`/border` keeps its preset sharing (`useCalculatorSharing`, `?preset=`), which
carries a named preset rather than the bare inputs, so it has no second Share
button.

### Form Validation

All forms use TanStack Form with Zod validation:

```typescript
const form = useForm({
  defaultValues: { ... },
  validators: {
    onChange: createZodFormValidator(schema),
  },
});
```
