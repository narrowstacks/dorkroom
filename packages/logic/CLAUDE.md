# @dorkroom/logic

Business logic, data fetching, state management, and validation for Dorkroom.

## Before You Start

1. **Use Context7** for TanStack Query/Form/Table docs before making changes
2. **Watch for circular dependencies** between @dorkroom packages

## Structure

```
src/
├── hooks/api/           # TanStack Query hooks
├── hooks/custom-recipes/# Mutation hooks
├── queries/             # Query keys and fetch functions
├── schemas/             # Zod validation schemas
├── services/            # Pure business logic
├── types/               # TypeScript definitions
└── index.ts             # Public exports
```

## Key Patterns

### Query Keys

Use the factory pattern in `src/queries/query-keys.ts`:

- Hierarchical: `all -> lists -> list` and `all -> details -> detail`
- Example: `queryKeys.films.detail('film-id')`

### Mutations

All mutations must implement:

- `onMutate` - optimistic update with `cancelQueries`
- `onError` - rollback using context
- `onSettled` - invalidate affected queries

See `src/hooks/custom-recipes/` for examples.

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

## Testing

Wrap query hook tests with `QueryClientProvider` using `retry: false`.
