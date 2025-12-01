# @dorkroom/api

API client and TypeScript types for the Dorkroom API.

## Structure

```
src/
├── dorkroom/
│   ├── client.ts   # DorkroomApiClient with transformation
│   ├── types.ts    # Raw and transformed types
│   └── index.ts    # Re-exports
└── index.ts        # Package entry
```

## Usage

```typescript
// Default client (production API)
import { apiClient, fetchFilmsForQuery } from '@dorkroom/api';

// TanStack Query integration
useQuery({ queryKey: ['films'], queryFn: fetchFilmsForQuery });

// Custom base URL
const client = new DorkroomApiClient('http://localhost:3001/api');
```

## Type Conventions

### Raw vs Transformed

API returns snake_case, app uses camelCase:

- `RawFilm` (snake_case) → `Film` (camelCase)
- `RawDeveloper` → `Developer`
- `RawCombination` → `Combination`

The client transforms automatically.

### Null Handling

Use explicit `null` for API nulls (not optional):

```typescript
// Correct
grainStructure: string | null;

// Incorrect
grainStructure?: string;
```

## Error Handling

```typescript
import { DorkroomApiError } from '@dorkroom/api';

try {
  await fetchFilms();
} catch (error) {
  if (error instanceof DorkroomApiError) {
    console.error(error.statusCode, error.endpoint);
  }
}
```

## Exports

All types and functions through package index. Never import internal paths.
