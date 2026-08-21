# @dorkroom/logic

Business logic, data fetching, state management, and validation for Dorkroom.

Shared by the web app **and** the iOS app. Nothing platform-specific belongs
here: no DOM assumptions, no `react-native` imports, no analytics. When a hook
genuinely needs a different implementation per platform, add a `.native.ts`
sibling (Metro picks it up automatically; see `use-window-dimensions.native.ts`).

## Before You Start

1. **Use Context7** for TanStack Query/Form/Table docs before making changes
2. **Watch for circular dependencies** between @dorkroom packages
3. Calculator math lives here, not in a screen or page component

## Structure

```
src/
├── constants/           # Per-calculator defaults, storage keys, feature flags
├── hooks/               # Calculator hooks (use-*-calculator.ts) at the top level
│   ├── api/             # TanStack Query hooks
│   ├── border-calculator/
│   ├── custom-recipes/  # Mutation hooks
│   ├── development-recipes/
│   └── films/
├── queries/             # Query keys and fetch functions
├── schemas/             # Zod validation schemas
├── services/            # filmdev.org client, localStorage wrapper
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

- Hierarchical: `all -> lists -> list` and `all -> details -> detail`
- Every level is a function, including `all()`. Call it, don't spread the bare property
- Example: `queryKeys.films.detail('film-id')`

### Mutations

All mutations must implement:

- `onMutate` for the optimistic update, with `cancelQueries` first
- `onError` for rollback using the context returned by `onMutate`
- `onSettled` to invalidate affected queries

See `src/hooks/custom-recipes/use-custom-recipe-mutations.ts` for the worked example.

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
