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
├── constants/           # Per-calculator defaults, storage keys
├── hooks/               # Calculator hooks (use-*-calculator.ts) at the top level
│   ├── api/             # TanStack Query hooks
│   ├── border-calculator/
│   ├── custom-recipes/  # useCustomRecipes (reads services/custom-recipe-store)
│   ├── development-recipes/
│   └── films/
├── queries/             # Query keys and fetch functions
├── schemas/             # Zod validation schemas
├── services/            # filmdev.org client, storage seam + localStorage wrapper, custom recipe store
├── types/               # TypeScript definitions
├── utils/               # Pure calculation and parsing helpers
├── calculators.ts       # `@dorkroom/logic/calculators` entry (pure, no React)
└── index.ts             # Public exports (the root entry)
```

## Entry Points

- **`@dorkroom/logic`** (`src/index.ts`): everything, hooks included. The web
  and iOS apps use this.
- **`@dorkroom/logic/calculators`** (`src/calculators.ts`): calculator link
  params, links, defaults, math and formatting, for code outside React. The
  serverless functions use it (`utils/calculatorShare.ts`, for `api/meta.ts`
  and the edge-runtime `api/og.tsx`). Re-export only from `constants/`,
  `schemas/`, `types/` and `utils/`; `__tests__/calculators-entry.test.ts`
  fails if its import graph reaches `hooks/`, `services/`, or any package but
  zod.

Both resolve to the built `dist/` (run `bun run build`, or turbo's `^build`).
The subpath is declared twice in `package.json`: in `exports` for Node, Vite,
vitest and Vercel's function tracer, and in `typesVersions` for TypeScript's
`node10` resolution, which `api/tsconfig.json` (TypeScript 6) still uses and
which ignores `exports`. Add a new subpath to both.

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

Persisted state is keyed from `constants/storage-keys.ts` and goes through the
`KeyValueStorage` seam (`services/key-value-storage.ts`: synchronous
`getItem` / `setItem` / `removeItem` of strings). Adapters: localStorage (web,
the default), in-memory (`createMemoryStorage`, tests), and MMKV (iOS, in
`apps/mobile/src/lib/mmkv-storage.ts`, since this package must not depend on
`react-native-mmkv`).

Calculators persist through `usePersistedCalculator(definition, binding)`
(`hooks/use-persisted-calculator.ts`). It owns hydrate (once on mount, each
field checked by its validator, an invalid field keeps its default), the
300ms debounced write, clear, and reset. The definition comes from
`definePersistedCalculator(storageKey, fieldSchemas, defaults)` next to the
calculator's schema; the binding is `{ form, values }` for a TanStack Form or
`{ values, setValues, onReset? }` for `useState`. Storage keys and persist-key
order are pinned by `__tests__/schemas/calculator-persistence.test.ts` and the
web hydration tests, because changing either drops users' saved state.

A calculator opens pre-filled from a URL through its link:
`defineCalculatorLink(definition, PARAMS)` next to the persistence definition,
with the param map in `constants/calculator-link-params.ts` (no runtime
imports, so web routes can read it cheaply). `link.read(search)` returns
validated field values, which go to `usePersistedCalculator` as `overrides`
(applied once on mount, after the stored snapshot); `link.build(values)` goes
the other way. A map is flat (one param, one field): a field another field
must mirror is the calculator's business, as border does in its web
controller. Param names are pinned by
`__tests__/utils/calculator-url-params.test.ts`; see the "Link Parameters"
section of `docs/pages.md`.

The hook reads its storage from `PersistenceStorageProvider`. The iOS app
provides MMKV once in `app/_layout.tsx`; with no provider it falls back to
`localStorage`, and a development build warns once if the host has none.
The border reducer (`use-border-calculator-state.ts`) validates its snapshot
whole rather than per field, so it does not use the hook, but it reads the
same provider.

Other persisted state (custom recipes, border presets, view preference) still
uses `globalThis.localStorage` through `createStorageManager`. On iOS that
global is an MMKV shim installed at app startup over the same MMKV instance,
so keep reads synchronous and never assume a browser `Storage` object.

## Testing

Wrap query hook tests with `QueryClientProvider` using `retry: false`.
`src/test-setup.ts` supplies a `localStorage` mock and the React `act`
environment flag, so tests do not need to stub either.
