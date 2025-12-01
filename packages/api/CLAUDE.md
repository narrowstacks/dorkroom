# @dorkroom/api Package

This package provides an API client and TypeScript type definitions for the Dorkroom API, including both raw API response types (snake_case) and transformed application types (camelCase).

## Package Structure

```
packages/api/src/
├── dorkroom/
│   ├── client.ts   # API client with data transformation
│   ├── types.ts    # Type definitions for Films, Developers, Combinations
│   └── index.ts    # Re-exports
└── index.ts        # Package entry point
```

## API Client

### DorkroomApiClient

The main API client class that handles fetching and transforming data:

```typescript
import { DorkroomApiClient, DEFAULT_BASE_URL } from '@dorkroom/api';

// Uses production API by default (https://dorkroom.art/api)
const client = new DorkroomApiClient();

// Custom base URL for development/staging
const devClient = new DorkroomApiClient('http://localhost:3001/api');

// Fetch data
const films = await client.fetchFilms();
const developers = await client.fetchDevelopers();
const combinations = await client.fetchCombinations();
```

### DEFAULT_BASE_URL

The default production API URL is exported for reference:

```typescript
import { DEFAULT_BASE_URL } from '@dorkroom/api';

console.log(DEFAULT_BASE_URL); // 'https://dorkroom.art/api'
```

### Convenience Functions

Simple functions using the default client:

```typescript
import { fetchFilms, fetchDevelopers, fetchCombinations } from '@dorkroom/api';

// With abort signal
const controller = new AbortController();
const films = await fetchFilms({ signal: controller.signal });

// Without options
const developers = await fetchDevelopers();
```

### TanStack Query Integration

Functions designed for TanStack Query's `QueryFunctionContext`:

```typescript
import { fetchFilmsForQuery, fetchDevelopersForQuery, fetchCombinationsForQuery } from '@dorkroom/api';
import { useQuery } from '@tanstack/react-query';

function useFilms() {
  return useQuery({
    queryKey: ['films'],
    queryFn: fetchFilmsForQuery,
  });
}
```

### Default Client Instance

A pre-configured client instance is exported:

```typescript
import { apiClient } from '@dorkroom/api';

const films = await apiClient.fetchFilms();
```

## Type Definitions

### Raw vs. Transformed Types

The Dorkroom API returns data in snake_case format, but the application uses camelCase. This package defines both:

1. **Raw types** - Direct API response format (snake_case)
2. **Transformed types** - Application format (camelCase)

The `DorkroomApiClient` automatically transforms raw API responses to camelCase.

### Film Types

**Transformed Type (for use in app):**

```typescript
export interface Film {
  id: number;
  uuid: string;
  slug: string;
  brand: string;
  name: string;
  colorType: string;
  isoSpeed: number;
  grainStructure: string | null;
  description: string;
  manufacturerNotes: string[] | null;
  reciprocityFailure: string | null;
  discontinued: boolean;
  staticImageUrl: string | null;
  dateAdded: string;
  createdAt: string;
  updatedAt: string;
}
```

**Raw Type (API response):**

```typescript
export interface RawFilm {
  id: number;
  uuid: string;
  slug: string;
  brand: string;
  name: string;
  color_type: string;
  iso_speed: number;
  grain_structure: string | null;
  description: string;
  manufacturer_notes: string[] | null;
  reciprocity_failure: string | null;
  discontinued: boolean;
  static_image_url: string | null;
  date_added: string;
  created_at: string;
  updated_at: string;
}
```

### Developer Types

**Transformed Type:**

```typescript
export interface Developer {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  description: string;
  filmOrPaper: boolean;
  dilutions: Dilution[];
  mixingInstructions: string | null;
  storageRequirements: string | null;
  safetyNotes: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dilution {
  id: string;
  name: string;
  dilution: string;
}
```

**Raw Type:**

```typescript
export interface RawDeveloper {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  manufacturer: string;
  type: string;
  description: string;
  film_or_paper: boolean;
  dilutions: RawDilution[];
  mixing_instructions: string | null;
  storage_requirements: string | null;
  safety_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawDilution {
  id: number;
  name: string;
  dilution: string;
}
```

### Combination Types

**Transformed Type:**

```typescript
export interface Combination {
  id: number;
  uuid: string;
  name: string;
  filmStockId: string;
  filmSlug: string;
  developerId: string;
  developerSlug: string;
  shootingIso: number;
  dilutionId: string | null;
  customDilution: string | null;
  temperatureC: number;
  temperatureF: number;
  timeMinutes: number;
  agitationMethod: string;
  agitationSchedule: string | null;
  pushPull: number;
  tags: string[] | null;
  notes: string | null;
  infoSource: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Raw Type:**

```typescript
export interface RawCombination {
  id: number;
  uuid: string;
  name: string;
  film_stock: string;
  developer: string;
  shooting_iso: number;
  dilution_id: number | null;
  temperature_celsius: number;
  time_minutes: number;
  agitation_method: string;
  push_pull: number;
  tags: string | null;
  info_source: string | null;
  created_at: string;
  updated_at: string;
}
```

### API Response Types

Wrapper types for API responses:

```typescript
export interface FilmsApiResponse {
  data: Film[];
  count: number;
}

export interface DevelopersApiResponse {
  data: Developer[];
  count: number;
}

export interface CombinationsApiResponse {
  data: Combination[];
  count: number;
}
```

## Error Handling

**DorkroomApiError:**

Custom error class for API-specific errors:

```typescript
export class DorkroomApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'DorkroomApiError';
  }
}
```

**Usage:**

```typescript
import { DorkroomApiError } from '@dorkroom/api';

try {
  const data = await fetchFilms();
} catch (error) {
  if (error instanceof DorkroomApiError) {
    console.error(`API Error at ${error.endpoint}: ${error.message}`);
    console.error(`Status Code: ${error.statusCode}`);
  }
}
```

## Data Transformation

The `DorkroomApiClient` automatically transforms API responses:

### Field Naming

**API (snake_case) → App (camelCase):**

- `color_type` → `colorType`
- `iso_speed` → `isoSpeed`
- `grain_structure` → `grainStructure`
- `manufacturer_notes` → `manufacturerNotes`
- `film_or_paper` → `filmOrPaper`
- `temperature_celsius` → `temperatureC` (with calculated `temperatureF`)
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

### Special Transformations

- **Temperature**: `temperature_celsius` is transformed to both `temperatureC` and `temperatureF` (calculated)
- **Dilution IDs**: Numeric `dilution_id` is converted to string `dilutionId`
- **Tags**: String tags are parsed into `string[]` arrays

## Type Conventions

### Null Handling

Use explicit `null` types for nullable fields:

```typescript
// ✅ Correct
grainStructure: string | null;
manufacturerNotes: string[] | null;

// ❌ Incorrect
grainStructure?: string;  // Don't use optional for API nulls
```

The API explicitly returns `null` for missing values, so types should reflect this.

### Array Fields

Some fields can be either arrays or null:

```typescript
// Tags field in Combination
tags: string[] | null;

// Manufacturer notes in Film
manufacturerNotes: string[] | null;
```

Always check for null before mapping:

```typescript
const tagList = combination.tags?.map((tag) => tag.trim()) ?? [];
```

## Import/Export

**Package exports:**

```typescript
// Client and constants
export { DorkroomApiClient, DEFAULT_BASE_URL, apiClient } from '@dorkroom/api';

// Convenience functions
export { fetchFilms, fetchDevelopers, fetchCombinations } from '@dorkroom/api';
export { fetchFilmsForQuery, fetchDevelopersForQuery, fetchCombinationsForQuery } from '@dorkroom/api';

// Types
export type { Film, RawFilm } from '@dorkroom/api';
export type { Developer, RawDeveloper } from '@dorkroom/api';
export type { Combination, RawCombination } from '@dorkroom/api';
export type { Dilution, RawDilution } from '@dorkroom/api';

// Error class
export { DorkroomApiError } from '@dorkroom/api';
```

**Usage in other packages:**

```typescript
// In @dorkroom/logic
import { apiClient, type Film, type Developer } from '@dorkroom/api';

// In apps/dorkroom
import { fetchFilmsForQuery, type Film, type Combination } from '@dorkroom/api';

// External consumers
import { DorkroomApiClient, DEFAULT_BASE_URL } from '@dorkroom/api';
```

## Best Practices

1. **Use the client** - Prefer `DorkroomApiClient` or convenience functions over raw fetch
2. **Custom URLs** - Pass custom base URL to constructor for non-production environments
3. **Abort signals** - Pass `{ signal }` for cancellable requests
4. **Type imports** - Use `type` imports for types to ensure tree-shaking
5. **Error handling** - Check for `DorkroomApiError` for API-specific error details

## Dependencies

**Runtime:** None - This package has no runtime dependencies.

**Build:**

- TypeScript 5.8.2 for type checking and `.d.ts` generation
