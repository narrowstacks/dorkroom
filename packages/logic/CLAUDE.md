# @dorkroom/logic

Business logic, data fetching, state management, and validation for Dorkroom.

Shared by the web app **and** the iOS app. Nothing platform-specific belongs
here: no DOM assumptions, no `react-native` imports, no analytics. When a hook
genuinely needs a different implementation per platform, add a `.native.ts`
sibling (Metro picks it up automatically; see `use-window-dimensions.native.ts`).

## Before You Start

1. **Check current TanStack Query/Form/Table docs** (Context7 when connected) before making changes
2. **Watch for circular dependencies** between @dorkroom packages
3. Calculator math lives here, not in a screen or page component

## Structure

```
src/
├── constants/           # Per-calculator defaults, storage keys, feature flags
├── hooks/               # Calculator hooks (use-*-calculator.ts) at the top level
│   ├── api/             # TanStack Query hooks
│   ├── border-calculator/
│   ├── custom-recipes/  # useCustomRecipes (reads services/custom-recipe-store)
│   ├── development-recipes/
│   └── films/
├── queries/             # Query keys and fetch functions
├── schemas/             # Zod validation schemas
├── services/            # filmdev.org client, localStorage wrapper, custom recipe store
├── types/               # TypeScript definitions
├── utils/               # Pure calculation and parsing helpers
└── index.ts             # Public exports (the only entry point)
```

`utils/` is where the actual math lives (`border-calculations.ts`,
`exposure-calculations.ts`, `light-meter.ts`, …). Keep those functions pure and
unit-tested; hooks wire them to state.

## Key Patterns

### Query Keys

Use the factory pattern in `src/queries/query-keys.ts`:

- Hierarchical: `all -> lists -> list`
- Every level is a function, including `all()`. Call it, don't spread the bare property
- Example: `queryKeys.films.list()`

### Mutations

TanStack Query mutations against server state must implement:

- `onMutate` for the optimistic update, with `cancelQueries` first
- `onError` for rollback using the context returned by `onMutate`
- `onSettled` to invalidate affected queries

This applies to server state only. Synchronous local data is not a query and
must not be wrapped in one: a `localStorage` write cannot be pending or fail
later, so there is nothing to roll back. Custom recipes are the example: they
live in a plain external store (`src/services/custom-recipe-store.ts`: `read`,
`add`, `update`, `remove`, `subscribe`) behind a storage adapter (localStorage,
or in-memory for tests), and React reads it through `useCustomRecipes`, built on
`useSyncExternalStore`. There are no query keys or mutation hooks for them.

### Schemas

Export both schema and inferred type:

```typescript
export const mySchema = z.object({ ... });
export type MyFormData = z.infer<typeof mySchema>;
```

### Types

- Raw types (snake_case from API): prefix with `Raw`
- Transformed types (camelCase): no prefix
- Include transformation functions

### Persistence

Persisted state goes through `globalThis.localStorage` with a key from
`constants/storage-keys.ts`. On iOS that global is an MMKV shim installed at app
startup, so keep reads synchronous and never assume a browser `Storage` object.

## Testing

Wrap query hook tests with `QueryClientProvider` using `retry: false`.
`src/test-setup.ts` supplies a `localStorage` mock and the React `act`
environment flag, so tests do not need to stub either.
