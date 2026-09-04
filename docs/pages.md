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
- State persistence to localStorage

**Key hook:**

- `useMatCalculator()` - all parsing, geometry, best fit, warnings, and
  persistence. The iOS app consumes the same hook.

**Note:** this calculator is imperial-only; it does not yet follow the global
imperial/metric preference (issue #250).

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
- `useLocalStorageFormPersistence()` - Generic form state persistence hook

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
- `useLocalStorageFormPersistence()` - Form state persistence

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
- Recipe detail modal
- Custom recipe creation/editing
- Recipe sharing (URL and clipboard)
- Recipe import from external sources

**URL search params:**

```typescript
{
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
- `useCustomRecipes()` - CRUD for custom recipes
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
`apps/dorkroom/src/app/lib/analytics/events.ts`, and in root `PRIVACY.md` must
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
7. **State persistence:** localStorage via `useLocalStorageFormPersistence()`

### State Persistence Pattern

```typescript
useLocalStorageFormPersistence({
  storageKey: STORAGE_KEY,
  form,
  formValues,
  persistKeys: ['field1', 'field2'],
  validators: {
    field1: { validate: (v) => typeof v === 'number' && Number.isFinite(v) },
  },
});
```

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
