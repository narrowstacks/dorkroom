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

**Purpose:** Dashboard landing page with navigation to all tools.

**Location:** `apps/dorkroom/src/app/pages/home-page.tsx`

**Features:**

- Grain-textured hero panel: `Greeting`, the "Skip the math. Make prints!"
  tagline, and a one-line stat summary (development recipes, film stocks,
  developers)
- Two hero calls to action, linking to `/border` and `/development`
- `HomeHeroPreview` - a live border-calculator preview, shown from the `md`
  breakpoint up
- Tools grid of `ToolCard`s, one per calculator, driven by the module-level
  `CALCULATORS` array (category, accent tone, and icon per tool)
- Footer with license, `/privacy`, GitHub, and Ko-fi links

**Data dependencies:**

- `useStats()` - Recipe, film, and developer counts for the hero stat line

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
- Film detail panel with expandable info
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
`false`, `1` or `0`.

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
