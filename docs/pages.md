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

**Location:** `apps/dorkroom/src/app/pages/home-page.tsx`. The search UI is
`SearchPanel` (`variant="hero"`) in `apps/dorkroom/src/components/search/`,
shared with the nav bar's search dialog (see [Site
Search](#site-search)). The parsing and answers are
`searchHome` / `suggestHome` in `packages/logic/src/utils/home-search/`, pure
and platform-free so the iOS app can share them (issue #528).

**Features:**

- Grain-textured hero panel: `Greeting`, the "Skip the math. Make prints!"
  tagline, a one-line stat summary (development recipes, film stocks,
  developers), and the search box
- Search box (`SearchCombobox`): a WAI-ARIA 1.2 combobox. Up to six
  suggestions while typing (completions of film, developer and tool names,
  plus query templates that teach the syntax); arrow keys move through them,
  Enter or a click fills the box and searches, Escape closes the list and then
  clears the box, Tab closes the list. Cmd+K or Ctrl+K, or `/` outside a text
  field, focuses the box. The nav bar has no search button on this page, so
  there is never a second search box on screen
- Answer card (`AnswerCard`): the title, a source or calculator tag, a "Read as"
  row showing how the query was understood (defaults marked "(default)"), the
  big number in Fraunces, a few facts, notes, and a link that opens the matching
  page pre-filled (see [Link Parameters](#link-parameters))
- Grouped matches beside the answer (`ResultGroups`): development recipes, film
  stocks, developers and tools, each with a count
- With an empty box: a real answer to an example query, labelled "Example",
  and "Try" chips that fill the box and move focus to it
- Tools grid of `ToolCard`s, one per calculator, from the `homeToolCards` tool
  manifest in `@dorkroom/ui`
- Footer with license, `/privacy`, GitHub, and Ko-fi links

**Query syntax:**

| Kind | Examples | Answer |
| --- | --- | --- |
| Recipe | `hp5 at 800 in dd-x`, `tri-x in d-76 1+1`, `fp4 in id-11`, `hc-110 dilution b tri-x` | Time, temperature, dilution, EI with push or pull, agitation ("Not in source" when the data has none), source, official or community, other recipes for the pair. EI via `at`, `@`, `ei` or `iso`; dilution as `1+4`, `1:31`, `stock` or an HC-110 letter; temperature as `24c` or `75f`. Temperatures lead with the visitor's °C/°F setting (shared with `/development`) |
| Reciprocity | `tri-x 30s`, `delta 3200 2m`, `hp5 reciprocity` | Corrected time from the film's reciprocity factor. Without a time it assumes 30s, marked |
| Border | `11x14 6x7 1.45`, `8x10 35mm 1 1/4`, `24x30cm 6x6 2cm`, `8x10 645 borderless`, `9.5x12 6x9 1 portrait`, `6x7 1.5` | Print size and the borders on each side, centred, with a diagram. The larger size is the paper (default 8x10), the other the negative (default 35mm); a lone `4x5` is a negative. A bare border up to 4 is inches; any number with a unit (`15mm`, `2cm`, `2in`) is read in that unit; a bare number above 4 is ignored with a note. Metric queries answer in metric first |
| Resize | `8x10 to 11x14 12s`, `11x14 from 8x10 20s`, `24x30cm to 30x40cm 15s`, `height 40cm to 60cm 10s`, `8x10 to 11x14` | New time, stops, factor, and whether the two sizes share a shape |
| Lens | `80mm on 6x6`, `80mm 6x6 to 35mm`, `90mm on 645 to apsc`, `25mm mft equivalent` | Equivalent focal length, field of view, crop factors. Target defaults to full frame (6x6 from full frame), marked. With paper named, a mm number is a border unless it cannot fit or the query says `lens` or `equivalent` |
| Stops | `12s +1/3`, `12s plus 2 stops`, `15s down 1 stop` | New time |
| Mat | `16x20 mat 8x10 print`, `11x14 mat for 8x10`, `mat 16x20 11x14 reveal 1/8`, `16x20 mat 8x10 bottom weight` | Window opening and best-fit borders; the reveal defaults to the calculator's, marked. Needs the word `mat`, `matte` or `window` |
| Camera exposure | `f/8`, `1/125`, `iso 400 f/8`, `sunny 16`, `what shutter` | A link to the Camera Exposure calculator, no answer |
| Lookup | `portra 400`, `rodinal`, `foma` | Grouped matches only |

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

### Site Search

Every page except the home page has a Search control: in the header from
`sm` up, an icon button like its neighbours whose tooltip carries the
shortcut hint ("Search (⌘K)", or "Ctrl K" off Apple devices; the header is
capped at `max-w-6xl` and the nav already fills it, so a text label and hint
would overflow it at every width); on phones a round search button beside the
floating menu toggle (the open menu drawer covers it; both buttons take their
size and spots from `components/mobile-fab.ts`). Cmd+K or Ctrl+K opens it from
anywhere, and `/` does too outside a text field. On the home page the same
keys focus the hero's search box instead.

It opens a dialog (`Modal`, so `role="dialog"`, `aria-modal`, labelled
"Search", Tab trapped inside, focus back to the trigger on close) holding the
home page's search: `SearchPanel` with `variant="dialog"`, so the same
combobox, answer card, grouped matches and Try chips. With an empty box it
shows only the Try chips (no example answer). Focus starts in the
box. Escape closes the suggestion list first; with the list closed it closes
the dialog (it does not clear the box, as it does on the home page). Following
any link from the dialog closes it, including one to the page already open.
Back and forward to another page close it too (it is open only while the
pathname is the one it was opened at), while a page's own search param
updates, such as `/films` syncing its filters, leave it open. At phone width the dialog is a full-height sheet; from
`sm` up a wide panel near the top of the screen. Recipe answers follow the
°C/°F setting (`SearchPanel` mounts its own `TemperatureProvider`, which
reads the same stored unit as `/development`). The `/` key hint shows only in
the home page's box: in the dialog the box already has focus.

**Bundle:** only the triggers and the shortcut
(`components/search/nav-search.tsx`, `search-shortcut.ts`) are in every
page's first load. The dialog, and with it the search panel and
`searchHome`, is a lazy chunk loaded on first open (and prefetched when a
pointer or focus reaches a trigger). The catalog loads when the search box
takes focus, as on the home page.

**Analytics:** one `nav_search` event per settled distinct query, with the
same two properties as `home_search` (the kind of answer and the number of
matches). Never the query text.

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
   URL. Link params that reappear in the URL while the route is mounted (a
   link to the calculator already open, such as a search answer on its own
   page) are captured again, and the page remounts with them; the strip only
   removes params, so it never triggers a capture of its own.
   `/development` is not a calculator route but gets the same result its own
   way: the page reads its `film`, `developer`, `recipe` and other params on
   mount and keeps the URL in step through `history.replaceState`, passing
   the entry's existing state so the router's history key stays the same.
   `components/development-route.tsx` (the route's component) keys the page
   on that key. A router navigation that lands there while
   it is open (a recipe answer from the nav search, the nav link) remounts the
   page with the link's filters and recipe. The router writes a navigation
   to the browser URL in a microtask, after a link click has rendered, so the
   route flushes that pending write before rendering the page; otherwise the
   new page would read the old URL and write the old filters back.
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
