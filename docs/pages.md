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
| `/reciprocity` | Reciprocity Calculator | Film | Implemented |
| `/development` | Film Development Recipes | Film | Implemented |
| `/lenses` | Lens Equivalency Calculator | Camera | Implemented |
| `/exposure` | Camera Exposure Calculator | Camera | Implemented |
| `/films` | Film Database | Reference | Implemented |
| `/docs` | Documentation | Reference | Placeholder |
| `/settings` | Settings | — | Implemented |

---

## Home (`/`)

**Purpose:** Dashboard landing page with navigation to all tools.

**Location:** `apps/dorkroom/src/app/pages/home-page.tsx`

**Features:**

- Hero section with app description
- Stats cards (total recipes, favorites, custom recipes)
- Calculator tool cards with navigation
- Coming soon section for unreleased features
- Footer with GitHub and donation links

**Data dependencies:**

- `useCombinations()` - Total recipe count
- `useFavorites()` - Favorite recipe IDs
- `useCustomRecipes()` - User's custom recipes

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

## Placeholder Pages

### Documentation (`/docs`)

**Status:** Placeholder

**Planned purpose:** How-to guides and reference material for analog photography.

---

## Common Patterns

### Calculator Pages

All calculator pages follow a consistent pattern:

1. **Layout:** `CalculatorLayout` with title, description, sidebar, and results slots
2. **Two-column layout:** Main content + sidebar (info/help)
3. **Input card:** `CalculatorCard` with form fields
4. **Results card:** `CalculatorCard` with accent color showing calculations
5. **Info cards:** How-to-use and educational content in sidebar
6. **State persistence:** localStorage via `useLocalStorageFormPersistence()`

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
