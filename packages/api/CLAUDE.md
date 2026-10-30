# @dorkroom/api

API client, Zod schemas, and TypeScript types for the Dorkroom API. Shared by
the web app, the iOS app, and the OpenAPI generator.

## Structure

```
src/
├── dorkroom/
│   ├── client.ts    # DorkroomApiClient, singleton, TanStack Query fetchers
│   ├── schemas.ts   # Zod schemas for every raw API payload
│   ├── types.ts     # Raw and transformed types, DorkroomApiError
│   ├── openapi.ts   # buildOpenApiDocument(), derives the spec from the schemas
│   └── index.ts     # Re-exports all four
└── index.ts         # Package entry
```

`openapi.ts` is the source of `api/openapi-spec.json`. Change a schema here and
run `bun run openapi:generate` from the repo root, or the drift guard fails.

## Usage

### Internal (dorkroom.art app)

```typescript
// Singleton client uses INTERNAL_API_BASE_URL ('/api') for same-origin requests
import { apiClient, fetchFilmsForQuery } from '@dorkroom/api';

// TanStack Query integration
useQuery({ queryKey: ['films'], queryFn: fetchFilmsForQuery });
```

Each endpoint has two exported helpers: `fetchFilms(options)` takes
`{ signal }` directly, and `fetchFilmsForQuery(context)` takes the TanStack
Query context so it can be dropped straight into `queryFn`. Same for
developers, combinations, and stats.

### External (npm consumers)

```typescript
import { DorkroomApiClient } from '@dorkroom/api';

// Defaults to PUBLIC_API_BASE_URL ('https://api.dorkroom.art')
const client = new DorkroomApiClient({ apiKey: 'dk_...' });
const films = await client.fetchFilms();
```

### Base URL Constants

- `PUBLIC_API_BASE_URL` - `https://api.dorkroom.art` (requires API key)
- `INTERNAL_API_BASE_URL` - `/api` (same-origin, used by the `apiClient` singleton)

### Constructor

```typescript
interface DorkroomApiClientConfig {
  baseUrl?: string;   // defaults to PUBLIC_API_BASE_URL
  apiKey?: string;    // sent as X-API-Key
  clientId?: string;  // sent as X-Client-Id
  onInvalidRows?: (info: InvalidRowsInfo) => void;  // see Runtime Validation
}
new DorkroomApiClient(config?: DorkroomApiClientConfig)
```

`clientId` is an opaque per-install id. Sending it moves the caller onto its own
60 req/min budget instead of sharing the key's, which is how the iOS app ships a
single free-tier key across every install. See `api/CLAUDE.md` for the server
side. `configureApiClient(config)` mutates the singleton in place for callers
that learn their key or client id after startup.

## Type Conventions

### Raw vs Transformed

API returns snake_case, app uses camelCase:

- `RawFilm` (snake_case) becomes `Film` (camelCase)
- `RawDeveloper` becomes `Developer`
- `RawCombination` becomes `Combination`

The client transforms automatically.

The Raw types (and `FilmAlias`, `Stats`) are `z.infer` of the zod schemas in
`src/dorkroom/schemas.ts`, which the client validates every response against.
Add or change a wire field in the schema only, never in a hand-written
interface; the type follows, and drift becomes a compile error.

### Null Handling

Use explicit `null` for API nulls (not optional):

```typescript
// Correct
grainStructure: string | null;

// Incorrect
grainStructure?: string;
```

## Runtime Validation

Every response is parsed with Zod before it reaches the app, and the failure
modes differ on purpose:

- A malformed **envelope** (missing `data` array) throws `DorkroomApiError`.
- A malformed **item** inside a valid envelope is dropped, the rest are
  returned, and the drop is reported two ways: a `console.warn`, and the
  optional `onInvalidRows({ resource, dropped, total })` callback on
  `DorkroomApiClientConfig` (also settable via `configure()`). One bad film
  row does not blank the films page.

So a short result list is a valid outcome, not necessarily a bug. Pass
`onInvalidRows` (or check the console warning) before assuming a filter
dropped the rows. All three collection fetchers share one private
`fetchCollection` helper, so the behavior cannot drift between them.

## Error Handling

Every client failure is a `DorkroomApiError`, except an abort:

| Failure | Thrown | `statusCode` |
| --- | --- | --- |
| Non-OK HTTP response | `DorkroomApiError` | the HTTP status (404, 500, ...) |
| Network failure (fetch rejects) | `DorkroomApiError` | `undefined` |
| Body is not valid JSON | `DorkroomApiError` | `undefined` |
| Envelope / stats shape invalid | `DorkroomApiError` | `undefined` |
| Aborted request | the original `AbortError`, **not wrapped** | n/a |

`endpoint` is the full request URL (e.g. `https://api.dorkroom.art/films`).
`cause` carries the underlying error for the non-HTTP cases. Never wrap an
abort: an unwrapped `AbortError` is the conventional cancellation contract
for consumers outside TanStack Query (Query itself rejects with its own
`CancelledError` when its signal aborts). Any error raised after the signal
has aborted is passed through as-is, which also covers React Native's fetch
polyfill, whose abort error is not a real `DOMException`.

```typescript
import { DorkroomApiError } from '@dorkroom/api';

try {
  await fetchFilms();
} catch (error) {
  if (error instanceof DorkroomApiError) {
    if (error.statusCode === 404) {
      // not found
    } else if (error.statusCode === undefined) {
      // network, JSON, or response-shape failure
    }
  }
}
```

`statusCode` and `endpoint` are both optional on the type, so guard them
before use. `instanceof` is safe across transpilation (the constructor resets
the prototype).

## Exports

All types and functions through the package index. Never import internal paths.
