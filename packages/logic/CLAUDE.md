# @dorkroom/logic Package

This package contains business logic, data fetching, state management, and validation for the Dorkroom application.

## Important

- **Always use Context7 before interacting with dependencies such as TanStack**, so you have the most up-to-date information on said dependency.
- **Always watch out for circular dependencies between the dorkroom packages, avoid it at all costs.**

## Package Structure

```
packages/logic/src/
├── hooks/
│   ├── api/              # TanStack Query hooks for API data
│   └── custom-recipes/   # Mutation hooks for custom recipes
├── queries/              # Query configurations and fetch functions
├── schemas/              # Zod validation schemas
├── services/             # Business logic services
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── index.ts              # Public exports
```

## TanStack Query Patterns

### Query Hooks (Data Fetching)

Query hooks handle data fetching and caching for API resources.

**Basic Query Hook:**

```typescript
// packages/logic/src/hooks/api/use-films.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys, fetchFilms } from '../../queries';

export function useFilms() {
  return useQuery({
    queryKey: queryKeys.films.list(),
    queryFn: fetchFilms,
  });
}
```

**Using in Components:**

```typescript
import { useFilms } from '@dorkroom/logic';

export function FilmList() {
  const { data: films, isPending, error } = useFilms();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {films.map((film) => (
        <li key={film.id}>{film.name}</li>
      ))}
    </ul>
  );
}
```

**Query Hook Patterns:**

- Place in `packages/logic/src/hooks/api/`
- One hook per resource or query type
- Export from package index
- Return `useQuery` result directly (don't destructure)
- Let consumers handle loading/error states

### Query Keys Structure

Query keys follow a hierarchical structure for efficient cache invalidation.

**Query Key Factory:**

```typescript
// packages/logic/src/queries/query-keys.ts
export const queryKeys = {
  films: {
    all: () => ['films'] as const,
    lists: () => [...queryKeys.films.all(), 'list'] as const,
    list: () => [...queryKeys.films.lists()] as const,
    details: () => [...queryKeys.films.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.films.details(), id] as const,
  },
  developers: {
    all: () => ['developers'] as const,
    lists: () => [...queryKeys.developers.all(), 'list'] as const,
    list: () => [...queryKeys.developers.lists()] as const,
    details: () => [...queryKeys.developers.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.developers.details(), id] as const,
  },
  customRecipes: {
    all: () => ['customRecipes'] as const,
    lists: () => [...queryKeys.customRecipes.all(), 'list'] as const,
    list: () => [...queryKeys.customRecipes.lists()] as const,
  },
};
```

**Query Key Conventions:**

- Use factory pattern for consistency
- Hierarchical structure: `all -> lists -> list` and `all -> details -> detail`
- Type as `const` for type safety
- Spread parent keys to maintain hierarchy
- Use descriptive names: `list()` for collection, `detail(id)` for single item

**Invalidation Examples:**

```typescript
// Invalidate all films queries
queryClient.invalidateQueries({ queryKey: queryKeys.films.all() });

// Invalidate just film lists
queryClient.invalidateQueries({ queryKey: queryKeys.films.lists() });

// Invalidate specific film detail
queryClient.invalidateQueries({ queryKey: queryKeys.films.detail('film-id') });
```

### Mutation Hooks

Mutation hooks handle data modification with optimistic updates and cache management.

**Complete Mutation Pattern:**

```typescript
// packages/logic/src/hooks/custom-recipes/use-custom-recipe-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../queries';
import type { CustomRecipe, CustomRecipeFormData } from '../../types';

export function useAddCustomRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: CustomRecipeFormData) => {
      // Perform the mutation
      const newRecipe = await createRecipe(formData);
      return newRecipe;
    },
    onMutate: async (formData: CustomRecipeFormData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.customRecipes.list() });

      // Snapshot previous value
      const previousRecipes = queryClient.getQueryData<CustomRecipe[]>(queryKeys.customRecipes.list());

      // Optimistically update
      const optimisticRecipe: CustomRecipe = {
        id: `temp-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<CustomRecipe[]>(queryKeys.customRecipes.list(), (old) => [...(old ?? []), optimisticRecipe]);

      // Return context for rollback
      return { previousRecipes };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousRecipes) {
        queryClient.setQueryData(queryKeys.customRecipes.list(), context.previousRecipes);
      }
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: queryKeys.customRecipes.list() });
    },
  });
}
```

**Using Mutation Hooks:**

```typescript
import { useAddCustomRecipe } from '@dorkroom/logic';

export function AddRecipeForm() {
  const addRecipe = useAddCustomRecipe();

  const handleSubmit = async (formData: CustomRecipeFormData) => {
    try {
      await addRecipe.mutateAsync(formData);
      // Success handling
    } catch (error) {
      // Error handling
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={addRecipe.isPending}>
        {addRecipe.isPending ? 'Adding...' : 'Add Recipe'}
      </button>
    </form>
  );
}
```

**Mutation Conventions:**

- Place in `packages/logic/src/hooks/custom-recipes/` or relevant domain folder
- Always implement `onMutate` for optimistic updates
- Always implement `onError` for rollback
- Always implement `onSettled` to invalidate affected queries
- Use `cancelQueries` before optimistic updates to prevent race conditions
- Return context from `onMutate` for rollback in `onError`

### Query Configuration

**Default QueryClient Configuration:**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Special Cases:**

For client-only data (localStorage, IndexedDB):

```typescript
export function useCustomRecipes() {
  return useQuery({
    queryKey: queryKeys.customRecipes.list(),
    queryFn: fetchCustomRecipes,
    staleTime: Infinity, // Never auto-refetch
    gcTime: Infinity, // Never garbage collect
  });
}
```

**Configuration Guidelines:**

- Use defaults for API data (5 min staleTime, 10 min gcTime)
- Use `Infinity` for client-only data
- Set `retry: false` for mutations
- Disable `refetchOnWindowFocus` for expensive queries

### Fetch Functions

Fetch functions live in `packages/logic/src/queries/` alongside query keys.

**Fetch Function Pattern:**

```typescript
// packages/logic/src/queries/films.ts
import type { Film, RawFilm } from '../types';

export async function fetchFilms(): Promise<Film[]> {
  const response = await fetch('/api/films.json');
  if (!response.ok) {
    throw new Error('Failed to fetch films');
  }
  const rawFilms: RawFilm[] = await response.json();
  return rawFilms.map(transformFilm);
}

function transformFilm(raw: RawFilm): Film {
  return {
    id: raw.film_id,
    name: raw.film_name,
    // ... transform snake_case to camelCase
  };
}
```

**Fetch Function Conventions:**

- Export async functions that return typed data
- Handle response errors explicitly
- Transform raw API data to app types
- Keep transformation logic separate from fetching
- Use dedicated `Raw*` types for API responses

## TanStack Form Patterns

Forms use TanStack Form with Zod validation.

**Basic Form Pattern:**

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

const borderSchema = z.object({
  borderSize: z.number().min(0).max(100),
  imageWidth: z.number().positive(),
  imageHeight: z.number().positive(),
});

export function BorderCalculator() {
  const form = useForm({
    defaultValues: {
      borderSize: 10,
      imageWidth: 800,
      imageHeight: 600,
    },
    onSubmit: async ({ value }) => {
      // Handle form submission
      console.log('Form values:', value);
    },
    validators: {
      onChange: zodValidator({ schema: borderSchema }),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="borderSize">
        {(field) => (
          <div>
            <label htmlFor={field.name}>Border Size</label>
            <input id={field.name} type="number" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
            {field.state.meta.errors && <span>{field.state.meta.errors[0]}</span>}
          </div>
        )}
      </form.Field>
      <button type="submit">Calculate</button>
    </form>
  );
}
```

**Form Conventions:**

- Always use Zod schemas for validation
- Use `@tanstack/zod-adapter` for schema integration
- Always call `preventDefault()` and `stopPropagation()` on form submission
- Access values via `form.state.values` or `field.state.value`
- Display first error: `field.state.meta.errors?.[0]`

## TanStack Table Patterns

**Basic Table Pattern:**

```typescript
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import type { Recipe } from '../types';

const columnHelper = createColumnHelper<Recipe>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('developer', {
    header: 'Developer',
  }),
  columnHelper.accessor('time', {
    header: 'Time (min)',
    cell: (info) => `${info.getValue()} min`,
  }),
];

export function RecipeTable({ data }: { data: Recipe[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Table Conventions:**

- Use `createColumnHelper<T>()` for type-safe columns
- Always use `flexRender()` for rendering cells/headers
- Enable features via row model imports (`getCoreRowModel`, `getSortedRowModel`, etc.)
- Combine with TanStack Query for server data

## Zod Schemas

Schemas live in `packages/logic/src/schemas/`.

**Schema Pattern:**

```typescript
// packages/logic/src/schemas/custom-recipe.ts
import { z } from 'zod';

export const customRecipeSchema = z.object({
  film: z.string().min(1, 'Film is required'),
  developer: z.string().min(1, 'Developer is required'),
  dilution: z.string().regex(/^\d+:\d+$/, 'Must be in format "1:1"'),
  time: z.number().positive('Time must be positive'),
  temperature: z.number().min(10).max(40),
  notes: z.string().optional(),
});

export type CustomRecipeFormData = z.infer<typeof customRecipeSchema>;
```

**Schema Conventions:**

- Export both schema and inferred type
- Include validation messages
- Use `.min()`, `.max()`, `.positive()` for numbers
- Use `.regex()` for pattern matching
- Use `.optional()` for optional fields
- Use `.default()` for default values

## Type Definitions

### Raw vs. Transformed Types

API responses often use snake_case, but the app uses camelCase.

**Raw Type (snake_case from API):**

```typescript
// packages/logic/src/types/film.ts
export interface RawFilm {
  film_id: string;
  film_name: string;
  manufacturer: string;
  iso_speed: number;
  film_type: 'color' | 'bw';
  format?: string;
}
```

**Transformed Type (camelCase for app):**

```typescript
export interface Film {
  id: string;
  name: string;
  manufacturer: string;
  isoSpeed: number;
  filmType: 'color' | 'bw';
  format?: string;
}
```

**Transformation Function:**

```typescript
export function transformFilm(raw: RawFilm): Film {
  return {
    id: raw.film_id,
    name: raw.film_name,
    manufacturer: raw.manufacturer,
    isoSpeed: raw.iso_speed,
    filmType: raw.film_type,
    format: raw.format,
  };
}
```

**Type Conventions:**

- Prefix raw types with `Raw` (e.g., `RawFilm`)
- Keep transformed types unprefixed (e.g., `Film`)
- Export both from same file
- Include transformation function
- Document field variations in comments

## Services

Business logic services live in `packages/logic/src/services/`.

**Service Pattern:**

```typescript
// packages/logic/src/services/exposure-calculator.ts
export interface ExposureCalculation {
  newShutterSpeed: number;
  newAperture: number;
  stops: number;
}

export function calculateExposure(currentISO: number, newISO: number, currentShutterSpeed: number): ExposureCalculation {
  const stops = Math.log2(newISO / currentISO);
  const newShutterSpeed = currentShutterSpeed * Math.pow(2, stops);

  return {
    newShutterSpeed,
    newAperture: currentAperture, // simplified
    stops,
  };
}
```

**Service Conventions:**

- Pure functions when possible
- Clear input/output types
- No React dependencies
- Export both types and functions
- Document calculation formulas in comments

## Testing

**Testing Query Hooks:**

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFilms } from './use-films';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useFilms', () => {
  it('fetches films successfully', async () => {
    const { result } = renderHook(() => useFilms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

**Testing Services:**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateExposure } from './exposure-calculator';

describe('calculateExposure', () => {
  it('calculates correct stops when doubling ISO', () => {
    const result = calculateExposure(100, 200, 1 / 125);
    expect(result.stops).toBe(1);
  });
});
```

## Dependencies

**Core:**

- `@tanstack/react-query` v5
- `@tanstack/react-router` v1
- `@tanstack/react-form` v1
- `@tanstack/react-table` v8
- `@tanstack/zod-adapter`
- `zod` v4.1.12

**Peer:**

- `react` 19.0.0

**Build:**

- TypeScript 5.8.2
- Vitest 3 for testing
