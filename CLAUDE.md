# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dorkroom is an analog photography calculator app built with React 19, TypeScript, and Tailwind CSS. It's an Nx monorepo with specialized calculator tools (border, exposure, reciprocity, resize, stops) and a development recipes database. The project recently completed a major TanStack ecosystem migration (v5 Query, v1 Router, v1 Form, v8 Table).

## Essential Commands

### Development

- `bunx nx dev dorkroom -- --host=0.0.0.0` - Start development server. **Check if dev server is running on port 4200 before doing this!**
- `bunx nx build dorkroom` - Build production bundle
- `bunx nx serve dorkroom` - Alternative dev server (no hotloading of @dorkroom packages! Always rebuild dorkroom before serving.)

### Code Quality (run these after completing tasks)

- `bunx nx lint dorkroom` - Run ESLint
- `bunx nx typecheck dorkroom` - TypeScript type checking
- `bunx prettier --write .` - Format code

### Testing

- `bunx nx test` - Run Vitest tests
- `bunx nx test --ui` - Run tests with UI

### Nx Workspace

- `bunx nx graph` - Visualize dependencies
- `bunx nx show project dorkroom` - Show available targets
- `bunx nx build` - Build all packages

## Architecture

### Structure

- `apps/dorkroom/` - Main React application
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic (@dorkroom/logic)

### Key Technologies

- React 19.0.0 with functional components
- TypeScript 5.8.2 with strict mode
- Tailwind CSS 4.1.13 for styling
- Vite 6 for bundling
- Vitest 3 for testing
- Nx 21.4 for monorepo management
- TanStack Query v5 for server state management
- TanStack Router v1 for file-based routing
- TanStack Form v1 for form state management with Zod validation
- TanStack Table v8 for data tables
- Zod v4.1.12 for schema validation

## Code Conventions

### Style

- Single quotes (Prettier configured)
- PascalCase for components (`LabeledSliderInput`)
- kebab-case for files (`labeled-slider-input.tsx`)
- Interface naming: `ComponentNameProps`

### TypeScript Typing

- **Never use `any` type** - always use specific types or `unknown` where the type cannot be determined
- Use `unknown` instead of `any` for values whose type is truly unknown at compile time
- Define proper interfaces for API responses, especially raw/transformed data structures
- Use discriminated unions instead of generic object types where possible
- Leverage TypeScript's type narrowing (type guards, `instanceof`, `typeof` checks)
- For generic utilities (like throttle/debounce), use generic constraints: `<T extends (...args: any[]) => any>` is acceptable only for variadic function types where the specific signature cannot be known at definition time
- When handling API data with both camelCase and snake_case fields, create dedicated `Raw*` types that enumerate all possible field variations
- Use `null` or `undefined` explicitly in types rather than leaving fields untyped
- Avoid casting with `as any` - use specific types or type guards instead
- For Chrome/browser APIs with incomplete type definitions, create local interface definitions (e.g., `PerformanceWithMemory`)

### React Patterns

- Functional components with TypeScript
- Props destructuring with default values
- Controlled components
- Use `cn()` utility for conditional Tailwind classes

### TanStack Router Patterns (File-Based Routing)

Routes are defined using file-based routing in `apps/dorkroom/src/routes/`. Each route file exports a route component:

```typescript
// apps/dorkroom/src/routes/border-calculator.tsx
import { createFileRoute } from '@tanstack/react-router';
import { BorderCalculatorPage } from '../app/pages/border-calculator/border-calculator-page';

export const Route = createFileRoute('/border-calculator')({
  component: BorderCalculatorPage,
});
```

**Important Patterns:**

- Route files use kebab-case with `.tsx` extension
- Components in `apps/dorkroom/src/app/pages/` follow PascalCase
- Use `createFileRoute()` to define route configuration
- Router devtools available in development for debugging

### TanStack Form Patterns

Forms use TanStack Form with Zod schema validation:

```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

const schema = z.object({
  borderSize: z.number().min(0),
});

export function MyCalculator() {
  const form = useForm({
    defaultValues: {
      borderSize: 10,
    },
    onSubmit: async (values) => {
      // Handle submission
    },
    validators: {
      onChange: zodValidator({ schema }),
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    }}>
      {/* Form fields */}
    </form>
  );
}
```

**Important Patterns:**

- Zod schemas for all form validation
- Use `@tanstack/zod-adapter` for schema integration
- Always handle form submission prevention with `preventDefault()` and `stopPropagation()`

### TanStack Table Patterns

Data tables use TanStack Table v8 for rendering and interaction:

```typescript
import { createColumnHelper, useReactTable, getCoreRowModel } from '@tanstack/react-table';

const columnHelper = createColumnHelper<Recipe>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
  }),
];

export function RecipeTable({ data }: { data: Recipe[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Important Patterns:**

- Use `createColumnHelper<T>()` for type-safe column definitions
- Core features: sorting, filtering, pagination via `useReactTable` hooks
- Combine with TanStack Query for server-side data
- Use `flexRender()` for rendering cell/header content

### TanStack Query Patterns

**Query Hooks (Data Fetching):**

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

**Usage in Components:**

```typescript
const { data: films, isPending, error } = useFilms();
```

**Mutation Hooks (Data Modification):**

```typescript
// packages/logic/src/hooks/custom-recipes/use-custom-recipe-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../queries';

export function useAddCustomRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => {
      // Perform mutation
      return newRecipe;
    },
    onMutate: async (formData) => {
      // Optimistic update
      const previousRecipes = queryClient.getQueryData(queryKeys.customRecipes.list());
      queryClient.setQueryData(queryKeys.customRecipes.list(), [...previousRecipes, optimisticRecipe]);
      return { previousRecipes };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousRecipes) {
        queryClient.setQueryData(queryKeys.customRecipes.list(), context.previousRecipes);
      }
    },
    onSettled: () => {
      // Invalidate cache after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.customRecipes.list() });
    },
  });
}
```

**Query Key Structure:**

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
  // Similar structure for developers, combinations, customRecipes
};
```

**Important Patterns:**

- Query hooks located in `packages/logic/src/hooks/api/`
- Mutation hooks located in `packages/logic/src/hooks/custom-recipes/`
- Query configuration and fetch functions in `packages/logic/src/queries/`
- Always use optimistic updates for mutations affecting UI
- Always invalidate related queries after mutations
- Use `staleTime` and `gcTime` defaults from QueryClient config (5 min / 10 min)
- For client-only data (like localStorage), use `staleTime: Infinity` and `gcTime: Infinity`

### Imports/Exports

- Named exports from index files
- ES6 imports/exports
- Components exported from `packages/ui/src/index.ts`

## Package Dependencies

**UI Package (@dorkroom/ui):**

- clsx for className utilities
- tailwind-merge for Tailwind class merging
- lucide-react for icons
- Tailwind CSS 4.1.13

**Logic Package (@dorkroom/logic):**

- React peer dependencies (19.0.0)
- TanStack ecosystem (Query, Router, Form, Table)
- Zod for schema validation
- All packages build to TypeScript declarations (.d.ts)

## Git rules

- Keep commit messages short. Use conventional commit standards.

## On using ast-grep vs ripgrep (rg)

You run in an environment where `ast-grep` is available; whenever a search requires syntax-aware or structural matching, default to `ast-grep --lang typescript -p '<pattern>'` (or set `--lang` appropriately) and avoid falling back to text-only tools like `rg` or `grep` unless I explicitly request a plain-text search.
