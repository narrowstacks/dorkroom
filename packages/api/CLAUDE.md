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

### Internal (dorkroom.art app)

```typescript
// Singleton client uses INTERNAL_API_BASE_URL ('/api') — same-origin
import { apiClient, fetchFilmsForQuery } from '@dorkroom/api';

// TanStack Query integration
useQuery({ queryKey: ['films'], queryFn: fetchFilmsForQuery });
```

### External (npm consumers)

```typescript
import { DorkroomApiClient } from '@dorkroom/api';

// Defaults to PUBLIC_API_BASE_URL ('https://api.dorkroom.art')
const client = new DorkroomApiClient({ apiKey: 'dk_...' });
const films = await client.fetchFilms();
```

### Base URL Constants

- `PUBLIC_API_BASE_URL` — `https://api.dorkroom.art` (requires API key)
- `INTERNAL_API_BASE_URL` — `/api` (same-origin, used by `apiClient` singleton)

### Constructor

```typescript
interface DorkroomApiClientConfig {
  baseUrl?: string;  // defaults to PUBLIC_API_BASE_URL
  apiKey?: string;   // sent as X-API-Key header
}
new DorkroomApiClient(config?: DorkroomApiClientConfig)
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
