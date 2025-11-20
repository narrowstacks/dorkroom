# @dorkroom/api Package

This package contains TypeScript type definitions for the Dorkroom API, including both raw API response types (snake_case) and transformed application types (camelCase).

## Package Structure

```
packages/api/src/
├── dorkroom/
│   ├── types.ts    # Type definitions for Films, Developers, Combinations
│   └── index.ts    # Re-exports
└── index.ts        # Package entry point
```

## Type Definitions

### Raw vs. Transformed Types

The Dorkroom API returns data in snake_case format, but the application uses camelCase. This package defines both:

1. **Raw types** - Direct API response format (snake_case)
2. **Transformed types** - Application format (camelCase)

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
  color_type: string; // snake_case
  iso_speed: number; // snake_case
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

**Transformation Example:**

```typescript
// In packages/logic/src/queries/films.ts
import type { RawFilm, Film } from '@dorkroom/api';

function transformFilm(raw: RawFilm): Film {
  return {
    id: raw.id,
    uuid: raw.uuid,
    slug: raw.slug,
    brand: raw.brand,
    name: raw.name,
    colorType: raw.color_type, // Transform to camelCase
    isoSpeed: raw.iso_speed, // Transform to camelCase
    grainStructure: raw.grain_structure,
    description: raw.description,
    manufacturerNotes: raw.manufacturer_notes,
    reciprocityFailure: raw.reciprocity_failure,
    discontinued: raw.discontinued,
    staticImageUrl: raw.static_image_url,
    dateAdded: raw.date_added,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
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
  film_or_paper: boolean; // snake_case
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

**Usage in fetch functions:**

```typescript
import type { RawFilm, Film, FilmsApiResponse } from '@dorkroom/api';

export async function fetchFilms(): Promise<Film[]> {
  const response = await fetch('/api/films.json');
  if (!response.ok) {
    throw new DorkroomApiError('Failed to fetch films', response.status, '/api/films.json');
  }

  const rawFilms: RawFilm[] = await response.json();
  return rawFilms.map(transformFilm);
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

## Type Conventions

### Field Naming

**API (snake_case) → App (camelCase):**

- `color_type` → `colorType`
- `iso_speed` → `isoSpeed`
- `grain_structure` → `grainStructure`
- `manufacturer_notes` → `manufacturerNotes`
- `film_or_paper` → `filmOrPaper`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

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

## Transformation Guidelines

When creating transformation functions in `@dorkroom/logic`:

1. **One-to-one mapping** - Every snake_case field maps to camelCase
2. **Type safety** - Use both Raw and Transformed types
3. **Null preservation** - Keep null values, don't convert to undefined
4. **Array handling** - Transform nested arrays/objects recursively
5. **Date strings** - Keep as ISO strings, transform to Date in services if needed

**Example Transformation:**

```typescript
// In @dorkroom/logic package
import type { RawDeveloper, Developer, RawDilution, Dilution } from '@dorkroom/api';

function transformDilution(raw: RawDilution): Dilution {
  return {
    id: String(raw.id), // Convert number to string
    name: raw.name,
    dilution: raw.dilution,
  };
}

function transformDeveloper(raw: RawDeveloper): Developer {
  return {
    id: raw.id,
    uuid: raw.uuid,
    slug: raw.slug,
    name: raw.name,
    manufacturer: raw.manufacturer,
    type: raw.type,
    description: raw.description,
    filmOrPaper: raw.film_or_paper,
    dilutions: raw.dilutions.map(transformDilution), // Transform nested array
    mixingInstructions: raw.mixing_instructions,
    storageRequirements: raw.storage_requirements,
    safetyNotes: raw.safety_notes,
    notes: null, // Field not in raw type
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}
```

## Import/Export

**Package exports:**

```typescript
// From @dorkroom/api
export type { Film, RawFilm } from '@dorkroom/api';
export type { Developer, RawDeveloper } from '@dorkroom/api';
export type { Combination, RawCombination } from '@dorkroom/api';
export type { Dilution, RawDilution } from '@dorkroom/api';
export { DorkroomApiError } from '@dorkroom/api';
```

**Usage in other packages:**

```typescript
// In @dorkroom/logic
import type { Film, RawFilm, DorkroomApiError } from '@dorkroom/api';

// In apps/dorkroom
import type { Film, Developer, Combination } from '@dorkroom/api';
```

## Best Practices

1. **Separate concerns** - Keep transformation logic in `@dorkroom/logic`, not in this package
2. **Type-only exports** - This package exports types only, no runtime code (except DorkroomApiError)
3. **No business logic** - Pure type definitions, no validation or computation
4. **Complete types** - Define all fields, even if unused in current implementation
5. **Document differences** - Comment any field name changes or type coercions

## Dependencies

**None** - This is a pure TypeScript types package with no runtime dependencies.

**Build:**

- TypeScript 5.8.2 for type checking and `.d.ts` generation
