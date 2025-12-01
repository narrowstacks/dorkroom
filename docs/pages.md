# Pages Reference

Documentation for all pages in the Dorkroom application.

## Route Structure

Routes use TanStack Router file-based routing in `apps/dorkroom/src/routes/`.

| Route | Page | Status |
|-------|------|--------|
| `/` | Home | Implemented |
| `/border` | Border Calculator | Implemented |
| `/stops` | Stops Calculator | Implemented |
| `/resize` | Resize Calculator | Implemented |
| `/reciprocity` | Reciprocity Calculator | Implemented |
| `/development` | Film Development Recipes | Implemented |
| `/settings` | Settings | Implemented |
| `/exposure` | Camera Exposure | Placeholder |
| `/infobase` | Infobase | Placeholder |

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

## Film Development Recipes (`/development`)

**Purpose:** Browse, filter, and manage B&W film development recipes.

**Location:** `apps/dorkroom/src/app/pages/development-recipes/`

**Features:**

- Film and developer selection dropdowns
- Collapsible filters (developer type, dilution, ISO, tags, custom recipes)
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
  film?: string;      // Film UUID
  developer?: string; // Developer UUID
  dilution?: string;
  iso?: string;
  recipe?: string;    // Recipe UUID for direct link
  source?: string;    // Shared recipe source
  view?: 'favorites' | 'custom';
}
```

**Data dependencies:**

- `useDevelopmentRecipes()` - Main data hook
- `useCustomRecipes()` - CRUD for custom recipes
- `useFavorites()` - Favorite management
- `useRecipeSharing()` - Share/copy functionality

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

### Camera Exposure (`/exposure`)

**Status:** Placeholder

**Planned purpose:** Equivalent exposure calculator for balancing aperture, shutter, and ISO in the field.

### Infobase (`/infobase`)

**Status:** Placeholder

**Planned purpose:** Reference tables, photography guides, and notes.

---

## Common Patterns

### Calculator Pages

All calculator pages follow a consistent pattern:

1. **Header:** `CalculatorPageHeader` with eyebrow, title, description
2. **Two-column layout:** Inputs on left (7fr), info/help on right (5fr)
3. **Input card:** `CalculatorCard` with form fields
4. **Results card:** `CalculatorCard` with accent color showing calculations
5. **Info cards:** How-to-use and educational content
6. **State persistence:** localStorage via hydration pattern

### State Persistence Pattern

```typescript
const hydrationRef = useRef(false);

// Hydrate on mount (once)
useEffect(() => {
  if (hydrationRef.current) return;
  hydrationRef.current = true;
  // Load from localStorage
}, []);

// Persist on change
useEffect(() => {
  localStorage.setItem(KEY, JSON.stringify(state));
}, [state]);
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
