# @dorkroom/logic

Business logic, hooks, calculations, and state management for Dorkroom.

## Overview

This package provides the core logic layer for Dorkroom, including:

- **Calculator Hooks** - React hooks for all calculator functionality
- **API Hooks** - TanStack Query hooks for data fetching
- **Utilities** - Pure functions for calculations and transformations
- **Schemas** - Zod validation schemas for form data
- **Types** - TypeScript type definitions
- **Constants** - Default values and configuration

## Installation

```bash
# Internal monorepo usage only
import { useBorderCalculator } from '@dorkroom/logic';
```

## Structure

```
src/
├── constants/       # Default values, calculator settings
├── hooks/
│   ├── api/         # TanStack Query hooks (films, developers, combinations)
│   ├── border-calculator/  # Modular border calculator hooks
│   ├── custom-recipes/     # Custom recipe management
│   └── development-recipes/ # Recipe filtering and state
├── queries/         # Query key factories
├── schemas/         # Zod validation schemas
├── services/        # External API integrations
├── types/           # TypeScript definitions
└── utils/           # Pure utility functions
```

## Calculator Hooks

### Border Calculator

```typescript
import { useBorderCalculator } from '@dorkroom/logic';

function BorderCalculatorPage() {
  const calculator = useBorderCalculator();

  // Access state
  const { paperWidth, paperHeight, borderSize } = calculator;

  // Update values
  calculator.setPaperWidth(8);
  calculator.setBorderSize(1.5);

  // Get calculated results
  const { imageWidth, imageHeight, bladeReadings } = calculator;
}
```

### Exposure Calculator

```typescript
import { useExposureCalculator } from '@dorkroom/logic';

function ExposureCalculatorPage() {
  const {
    baseTime,
    stops,
    newTime,
    setBaseTime,
    setStops
  } = useExposureCalculator();
}
```

### Resize Calculator

```typescript
import { useResizeCalculator } from '@dorkroom/logic';

function ResizeCalculatorPage() {
  const {
    originalWidth,
    originalHeight,
    targetWidth,
    targetHeight,
    scaleFactor,
    setOriginalWidth,
    // ... more
  } = useResizeCalculator();
}
```

### Reciprocity Calculator

```typescript
import { useReciprocityCalculator } from '@dorkroom/logic';

function ReciprocityCalculatorPage() {
  const {
    meteredTime,
    correctedTime,
    selectedFilm,
    setMeteredTime,
    setSelectedFilm,
  } = useReciprocityCalculator();
}
```

## API Hooks

Built on TanStack Query with proper caching and error handling.

### Fetching Films

```typescript
import { useFilms } from '@dorkroom/logic';

function FilmList() {
  const { data: films, isLoading, error } = useFilms();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return films.map(film => <FilmCard key={film.id} film={film} />);
}
```

### Fetching Developers

```typescript
import { useDevelopers } from '@dorkroom/logic';

function DeveloperList() {
  const { data: developers } = useDevelopers();
  // ...
}
```

### Fetching Combinations

```typescript
import { useCombinations } from '@dorkroom/logic';

function RecipeList() {
  const { data: combinations } = useCombinations();
  // ...
}
```

## Utilities

Pure functions for calculations - no React dependencies.

### Exposure Calculations

```typescript
import {
  calculateNewTime,
  calculateStops,
  stopsToMultiplier
} from '@dorkroom/logic';

const newTime = calculateNewTime(10, 2); // 10 seconds + 2 stops
const stops = calculateStops(10, 40); // Stops between 10s and 40s
```

### Border Calculations

```typescript
import {
  calculateBladeReadings,
  calculateImageDimensions
} from '@dorkroom/logic';

const blades = calculateBladeReadings({
  paperWidth: 8,
  paperHeight: 10,
  borderSize: 1.5,
  // ...
});
```

### Temperature Formatting

```typescript
import {
  formatTemperature,
  celsiusToFahrenheit,
  fahrenheitToCelsius
} from '@dorkroom/logic';

formatTemperature(20, 'C'); // "20°C"
celsiusToFahrenheit(20);    // 68
```

### Time Formatting

```typescript
import { formatTime, parseTime } from '@dorkroom/logic';

formatTime(90);  // "1:30"
parseTime("1:30"); // 90
```

## Schemas

Zod schemas for form validation with inferred TypeScript types.

```typescript
import {
  borderCalculatorSchema,
  type BorderCalculatorFormData
} from '@dorkroom/logic';

// Use with TanStack Form
const form = useForm({
  defaultValues: borderCalculatorDefaults,
  validators: {
    onChange: borderCalculatorSchema,
  },
});
```

## Query Keys

Factory pattern for consistent query key management.

```typescript
import { queryKeys } from '@dorkroom/logic';

// Hierarchical keys
queryKeys.films.all;           // ['films']
queryKeys.films.lists();       // ['films', 'list']
queryKeys.films.detail(id);    // ['films', 'detail', id]

queryKeys.developers.all;
queryKeys.combinations.all;
```

## Constants

Default values for all calculators.

```typescript
import {
  BORDER_CALCULATOR_DEFAULTS,
  EXPOSURE_CALCULATOR_DEFAULTS,
  RECIPROCITY_DEFAULTS
} from '@dorkroom/logic';
```

## Development

### Building

```bash
bunx nx build logic
```

### Testing

```bash
bunx nx test logic
```

### Type Checking

```bash
bunx nx typecheck logic
```

## Architecture Notes

- **No circular dependencies** - This package does not import from `@dorkroom/ui`
- **Pure logic** - Utility functions have no side effects
- **TanStack Query** - All data fetching uses query hooks with proper caching
- **Zod validation** - Runtime type safety for all form inputs
- **TypeScript strict mode** - No `any` types allowed
