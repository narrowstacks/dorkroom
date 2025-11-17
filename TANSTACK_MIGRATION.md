# TanStack Ecosystem Migration Plan

**Project:** Dorkroom
**Date:** 2025-11-15
**Status:** Feasibility Analysis Complete - Ready for Implementation
**Approach:** Big Bang Migration
**Estimated Duration:** 15-20 days

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current State Analysis](#current-state-analysis)
- [Migration Strategy](#migration-strategy)
- [Library-by-Library Breakdown](#library-by-library-breakdown)
- [Phase-by-Phase Implementation Plan](#phase-by-phase-implementation-plan)
- [Dependencies and Installation](#dependencies-and-installation)
- [Risk Assessment](#risk-assessment)
- [Success Metrics](#success-metrics)
- [LLM Agent Instructions](#llm-agent-instructions)

---

## Executive Summary

### Recommendation: ✅ HIGHLY FEASIBLE AND RECOMMENDED

The Dorkroom project is an ideal candidate for migrating to the TanStack ecosystem. Current architecture uses minimal third-party libraries with custom implementations that TanStack is designed to replace.

### Key Outcomes

| Metric                | Current            | After Migration    | Impact            |
| --------------------- | ------------------ | ------------------ | ----------------- |
| Lines of Custom Code  | ~800               | ~200-300           | **↓ 60-75%**      |
| Data Fetching Logic   | 300 lines (custom) | ~50 lines (hooks)  | **↓ 83%**         |
| Table/Pagination Code | 200 lines (custom) | ~80 lines (config) | **↓ 60%**         |
| Form Boilerplate      | High               | Low                | **↓ 40-60%**      |
| Type Safety           | Partial            | Complete           | **↑ 100%**        |
| Developer Experience  | Good               | Excellent          | **↑ Significant** |

### Priority Rankings

1. **🔴 Critical Priority:** TanStack Query (Highest ROI)
2. **🟠 High Priority:** TanStack Table (High ROI)
3. **🟡 Medium-High Priority:** TanStack Form (Good ROI)
4. **🟢 Medium Priority:** TanStack Router (Ecosystem completion)

---

## Current State Analysis

### Technology Stack (Before Migration)

```
React 19.0.0
React Router DOM 6.29.0
TypeScript (strict mode)
Vite (bundler)
Tailwind CSS 4.1.13
Nx Workspace
```

### Pain Points Identified

#### 1. Data Fetching (`packages/api/src/dorkroom/client.ts`)

**Current Implementation:**

- Custom `DorkroomClient` class (~200 lines)
- Manual in-memory caching
- Manual cache expiry (5-minute default)
- Parallel fetching with `Promise.all`
- No automatic refetching
- No request deduplication
- Inconsistent loading/error states

**Code Smell:**

```typescript
// Custom cache management (to be replaced)
private filmsCache: Film[] | null = null;
private developersCache: Developer[] | null = null;
private combinationsCache: Combination[] | null = null;
private lastLoadTime: number | null = null;
cacheExpiryMs: 5 * 60 * 1000
```

#### 2. Tables (`packages/ui/src/components/development-recipes/results-table.tsx`)

**Current Implementation:**

- Custom HTML table (~150 lines)
- Manual sorting logic
- Custom pagination hook (`usePagination` ~50 lines)
- No column resizing
- No column visibility controls
- No global filtering

**Code Smell:**

```typescript
// Manual pagination management (to be replaced)
const { currentPage, totalPages, paginatedItems, ... } = usePagination(items, 24)
```

#### 3. Forms (`packages/ui/src/components/development-recipes/custom-recipe-form.tsx`)

**Current Implementation:**

- Fully custom form handling
- useState for all fields (~15+ fields)
- Manual validation
- Verbose onChange handlers
- No form-level validation
- No field-level error handling

**Code Smell:**

```typescript
// Manual form state management (to be replaced)
const [formData, setFormData] = useState<CustomRecipeFormData>({
  name: '',
  useExistingFilm: true,
  selectedFilmId: '',
  temperatureF: 68,
  // ... 11+ more fields
});
```

#### 4. Routing (`apps/dorkroom/src/app/app.tsx`)

**Current Implementation:**

- React Router DOM v6.29.0
- Manual route definitions
- Custom URL state management
- No type-safe params
- Manual navigation hooks

**Code Smell:**

```typescript
// String-based routing (to be replaced)
<Route path="/" element={<HomePage />} />
<Route path="/border" element={<BorderCalculatorPage />} />
```

---

## Migration Strategy

### Approach: Big Bang Migration

**Rationale:**

- Small, manageable codebase
- Clear library boundaries
- Faster time to unified developer experience
- One-time learning curve
- Leverage cross-library integrations

### Execution Model

```
Phase 1: Setup (1 day)
    ↓
Phase 2: TanStack Query (3 days)
    ↓
Phase 3: TanStack Table (3 days)
    ↓
Phase 4: TanStack Form (4 days)
    ↓
Phase 5: TanStack Router (5 days)
    ↓
Phase 6: Testing & Optimization (2-4 days)
```

### Success Criteria

- [ ] All existing features work identically
- [ ] Code reduction ≥ 50%
- [ ] Type safety coverage = 100%
- [ ] DevTools integrated and functional
- [ ] Build passes with no errors
- [ ] Tests pass (if applicable)

---

## Library-by-Library Breakdown

### 1. TanStack Query

**Priority:** 🔴 Critical
**Effort:** 2-3 days
**ROI:** Very High
**Lines Eliminated:** ~300

#### Files to Modify

| File                                                                      | Action           | Complexity |
| ------------------------------------------------------------------------- | ---------------- | ---------- |
| `packages/api/src/dorkroom/client.ts`                                     | **DELETE**       | Medium     |
| `packages/logic/src/hooks/development-recipes/use-development-recipes.ts` | **REWRITE**      | Medium     |
| `packages/logic/src/services/filmdev-api.ts`                              | **CONVERT**      | Low        |
| `apps/dorkroom/src/main.tsx`                                              | **ADD PROVIDER** | Low        |

#### Implementation Pattern

**Before:**

```typescript
// packages/api/src/dorkroom/client.ts
export class DorkroomClient {
  private filmsCache: Film[] | null = null;
  private lastLoadTime: number | null = null;

  async loadAll(): Promise<void> {
    if (this.isCacheValid()) return;
    const [films, developers, combinations] = await Promise.all([...]);
    this.filmsCache = films;
  }
}
```

**After:**

```typescript
// packages/logic/src/hooks/use-films.ts
import { useQuery } from '@tanstack/react-query';

export const useFilms = () => {
  return useQuery({
    queryKey: ['films'],
    queryFn: async () => {
      const response = await fetch('/api/films');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

#### Query Keys Structure

```typescript
// packages/logic/src/query-keys.ts
export const queryKeys = {
  films: ['films'] as const,
  developers: ['developers'] as const,
  combinations: ['combinations'] as const,
  customRecipes: ['customRecipes'] as const,
};
```

#### Benefits

- ✅ Automatic cache management
- ✅ Background refetching
- ✅ Request deduplication
- ✅ Built-in loading/error states
- ✅ DevTools for debugging
- ✅ Optimistic updates support

---

### 2. TanStack Table

**Priority:** 🟠 High
**Effort:** 2-3 days
**ROI:** Very High
**Lines Eliminated:** ~200

#### Files to Modify

| File                                                               | Action      | Complexity |
| ------------------------------------------------------------------ | ----------- | ---------- |
| `packages/ui/src/components/development-recipes/results-table.tsx` | **REWRITE** | Medium     |
| `packages/logic/src/hooks/use-pagination.ts`                       | **DELETE**  | Low        |
| `packages/ui/src/components/development-recipes/results-cards.tsx` | **UPDATE**  | Low        |

#### Implementation Pattern

**Before:**

```typescript
// Manual table with sorting
const [sortConfig, setSortConfig] = useState({ key: 'film', direction: 'asc' });
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => {
    /* manual sorting */
  });
}, [items, sortConfig]);
```

**After:**

```typescript
// packages/ui/src/components/development-recipes/results-table.tsx
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';

const columns: ColumnDef<Recipe>[] = [
  {
    accessorKey: 'filmName',
    header: 'Film',
    cell: (info) => info.getValue(),
  },
  // ... more columns
];

const table = useReactTable({
  data: recipes,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
```

#### Column Definitions

```typescript
// packages/ui/src/components/development-recipes/table-columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { Recipe } from '@dorkroom/logic';

export const recipeColumns: ColumnDef<Recipe>[] = [
  {
    accessorKey: 'filmName',
    header: 'Film',
    enableSorting: true,
  },
  {
    accessorKey: 'developer',
    header: 'Developer',
    enableSorting: true,
  },
  {
    accessorKey: 'dilution',
    header: 'Dilution',
  },
  {
    accessorKey: 'temperature',
    header: 'Temperature',
    cell: ({ row }) => {
      const temp = row.getValue('temperature');
      return `${temp}°F`;
    },
  },
];
```

#### Benefits

- ✅ Type-safe column definitions
- ✅ Built-in sorting, filtering, pagination
- ✅ Column resizing and visibility
- ✅ Headless design (keep Tailwind styles)
- ✅ Server-side pagination support

---

### 3. TanStack Form

**Priority:** 🟡 Medium-High
**Effort:** 2-4 days
**ROI:** High
**Lines Reduced:** ~150-250

#### Files to Modify

| File                                                                    | Action      | Complexity |
| ----------------------------------------------------------------------- | ----------- | ---------- |
| `packages/ui/src/components/development-recipes/custom-recipe-form.tsx` | **REWRITE** | High       |
| `packages/ui/src/forms/`                                                | **CREATE**  | Medium     |

#### Implementation Pattern

**Before:**

```typescript
// Manual form state
const [formData, setFormData] = useState({
  name: '',
  selectedFilmId: '',
  temperatureF: 68,
  // ... 12+ more fields
});

const handleSubmit = (e) => {
  e.preventDefault();
  // Manual validation
  if (!formData.name) return;
  // Manual submission
};
```

**After:**

```typescript
// packages/ui/src/components/development-recipes/custom-recipe-form.tsx
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  selectedFilmId: z.string().optional(),
  temperatureF: z.number().min(40).max(120),
  // ... more fields
});

const CustomRecipeForm = () => {
  const form = useForm({
    defaultValues: {
      name: '',
      selectedFilmId: '',
      temperatureF: 68,
    },
    validators: {
      onChange: zodValidator(recipeSchema),
    },
    onSubmit: async ({ value }) => {
      // Type-safe submission
      await saveRecipe(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (value.length < 3 ? 'Name too short' : undefined),
        }}
      >
        {(field) => <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />}
      </form.Field>
      {/* More fields... */}
    </form>
  );
};
```

#### Benefits

- ✅ Reduce form boilerplate by 40-60%
- ✅ Built-in validation with Zod
- ✅ Type-safe field handling
- ✅ Field-level and form-level errors
- ✅ Better developer experience

---

### 4. TanStack Router

**Priority:** 🟢 Medium
**Effort:** 3-5 days
**ROI:** Medium-High
**Lines Modified:** Significant (routing is pervasive)

#### Files to Modify

| File                            | Action               | Complexity |
| ------------------------------- | -------------------- | ---------- |
| `apps/dorkroom/src/main.tsx`    | **REPLACE PROVIDER** | Medium     |
| `apps/dorkroom/src/app/app.tsx` | **CONVERT ROUTES**   | High       |
| All route components            | **UPDATE HOOKS**     | Medium     |

#### Implementation Pattern

**Before:**

```typescript
// apps/dorkroom/src/app/app.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/border" element={<BorderCalculatorPage />} />
  </Routes>
</BrowserRouter>;
```

**After:**

```typescript
// apps/dorkroom/src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <div>
      <Nav />
      <Outlet />
    </div>
  ),
});

// apps/dorkroom/src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// apps/dorkroom/src/routes/border.tsx
export const Route = createFileRoute('/border')({
  component: BorderCalculatorPage,
});
```

#### Type-Safe Navigation

**Before:**

```typescript
const navigate = useNavigate();
navigate('/posts/123'); // String-based, no type safety
```

**After:**

```typescript
const navigate = useNavigate();
navigate({
  to: '/posts/$postId',
  params: { postId: '123' }, // Type-safe, autocompleted
});
```

#### Search Params Validation

```typescript
// apps/dorkroom/src/routes/development.tsx
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';

const searchSchema = z.object({
  page: z.number().default(1),
  filter: z.string().default(''),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

export const Route = createFileRoute('/development')({
  validateSearch: zodValidator(searchSchema),
  component: DevelopmentPage,
});

function DevelopmentPage() {
  // Fully typed and validated
  const { page, filter, sort } = Route.useSearch();
}
```

#### Benefits

- ✅ 100% type-safe routing
- ✅ Autocomplete for routes and params
- ✅ Built-in search param validation
- ✅ Better URL state management
- ✅ Router DevTools

---

## Phase-by-Phase Implementation Plan

### Phase 1: Setup & Infrastructure (Day 1)

#### Tasks

- [ ] Install TanStack dependencies
- [ ] Configure QueryClient and provider
- [ ] Set up React Query DevTools
- [ ] Create shared configuration files
- [ ] Update tsconfig if needed

#### Implementation

```bash
# Install dependencies
bun add @tanstack/react-query @tanstack/react-table @tanstack/react-form @tanstack/react-router
bun add -D @tanstack/react-query-devtools @tanstack/router-devtools
bun add @tanstack/zod-adapter zod
```

```typescript
// apps/dorkroom/src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

---

### Phase 2: TanStack Query Migration (Days 2-4)

#### Day 2: Core Data Fetching

- [ ] Create query hooks for films
- [ ] Create query hooks for developers
- [ ] Create query hooks for combinations
- [ ] Create query keys structure

**Files:**

```
packages/logic/src/hooks/
  ├── use-films.ts          (NEW)
  ├── use-developers.ts     (NEW)
  ├── use-combinations.ts   (NEW)
  └── query-keys.ts         (NEW)
```

#### Day 3: Custom Recipes & Mutations

- [ ] Create mutations for custom recipes (localStorage)
- [ ] Implement optimistic updates
- [ ] Add cache invalidation logic

**Files:**

```
packages/logic/src/hooks/
  ├── use-custom-recipes.ts     (NEW)
  └── use-custom-recipe-mutation.ts (NEW)
```

#### Day 4: Integration & Cleanup

- [ ] Update `use-development-recipes.ts` to use Query hooks
- [ ] Test all data fetching scenarios
- [ ] Delete `DorkroomClient` class
- [ ] Verify DevTools functionality

**Files to Delete:**

```
packages/api/src/dorkroom/client.ts ❌
```

---

### Phase 3: TanStack Table Migration (Days 5-7)

#### Day 5: Table Setup

- [ ] Create column definitions
- [ ] Set up basic table with sorting
- [ ] Configure pagination

**Files:**

```
packages/ui/src/components/development-recipes/
  ├── table-columns.tsx (NEW)
  └── results-table.tsx (REWRITE)
```

#### Day 6: Advanced Features

- [ ] Add filtering capabilities
- [ ] Implement column visibility controls
- [ ] Update mobile card view

#### Day 7: Testing & Cleanup

- [ ] Test all table features
- [ ] Verify sorting, filtering, pagination
- [ ] Delete old pagination hook

**Files to Delete:**

```
packages/logic/src/hooks/use-pagination.ts ❌
```

---

### Phase 4: TanStack Form Migration (Days 8-11)

#### Day 8: Form Infrastructure

- [ ] Create form factory with `createFormHook`
- [ ] Build reusable form components (TextField, NumberField, etc.)
- [ ] Set up Zod schemas

**Files:**

```
packages/ui/src/forms/
  ├── form-factory.ts       (NEW)
  ├── components/
  │   ├── TextField.tsx     (NEW)
  │   ├── NumberField.tsx   (NEW)
  │   └── SelectField.tsx   (NEW)
  └── schemas/
      └── recipe-schema.ts  (NEW)
```

#### Day 9-10: Form Migration

- [ ] Migrate CustomRecipeForm
- [ ] Migrate calculator forms
- [ ] Add validation schemas

#### Day 11: Testing

- [ ] Test form validation
- [ ] Test form submission
- [ ] Verify error handling

---

### Phase 5: TanStack Router Migration (Days 12-16)

#### Day 12-13: Route Structure

- [ ] Create route tree structure
- [ ] Set up file-based routing (or createRoute approach)
- [ ] Configure router provider

**Files:**

```
apps/dorkroom/src/routes/
  ├── __root.tsx            (NEW)
  ├── index.tsx             (NEW)
  ├── border.tsx            (NEW)
  ├── development.tsx       (NEW)
  └── ... (other routes)
```

#### Day 14-15: Search Params & Navigation

- [ ] Add search param validation schemas
- [ ] Update all navigation code
- [ ] Convert all `<Link>` components
- [ ] Update `useNavigate` usage

#### Day 16: Cleanup

- [ ] Remove React Router
- [ ] Test all routes
- [ ] Verify lazy loading
- [ ] Test navigation flows

**Dependencies to Remove:**

```
react-router-dom ❌
```

---

### Phase 6: Testing & Optimization (Days 17-18)

#### Day 17: Comprehensive Testing

- [ ] Manual testing of all features
- [ ] Test data fetching and caching
- [ ] Test table sorting, filtering, pagination
- [ ] Test form validation and submission
- [ ] Test routing and navigation

#### Day 18: Optimization & Documentation

- [ ] Performance profiling
- [ ] Code cleanup
- [ ] Remove old patterns and unused code
- [ ] Update CLAUDE.md with new patterns
- [ ] Document new conventions

---

## Dependencies and Installation

### Required Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.60.5",
    "@tanstack/react-table": "^8.20.5",
    "@tanstack/react-form": "^0.35.0",
    "@tanstack/react-router": "^1.114.3",
    "@tanstack/zod-adapter": "^1.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.60.5",
    "@tanstack/router-devtools": "^1.114.3"
  }
}
```

### Installation Command

```bash
bun add @tanstack/react-query @tanstack/react-table @tanstack/react-form @tanstack/react-router @tanstack/zod-adapter zod
bun add -D @tanstack/react-query-devtools @tanstack/router-devtools
```

### Dependencies to Remove

```json
{
  "dependencies": {
    "react-router-dom": "6.29.0" // ❌ Remove after Router migration
  }
}
```

---

## Risk Assessment

### Technical Risks

| Risk                       | Likelihood | Impact | Mitigation                                         |
| -------------------------- | ---------- | ------ | -------------------------------------------------- |
| Breaking existing features | Low        | Medium | Incremental testing, feature-by-feature validation |
| Performance regression     | Very Low   | Medium | TanStack libraries are highly optimized            |
| Learning curve             | Medium     | Low    | Excellent documentation, many examples             |
| Type safety issues         | Low        | Low    | Superior TypeScript support in TanStack            |
| Build failures             | Low        | Medium | Gradual migration, continuous testing              |

### Migration Risks

| Risk               | Likelihood | Impact | Mitigation                                       |
| ------------------ | ---------- | ------ | ------------------------------------------------ |
| Timeline overrun   | Medium     | Low    | Buffer time included in estimate                 |
| Scope creep        | Low        | Medium | Clear phase boundaries, resist feature additions |
| Integration issues | Low        | Medium | Test integration points between libraries        |

### Risk Mitigation Strategies

1. **Incremental Migration**: Migrate one library at a time, validate before proceeding
2. **Comprehensive Testing**: Test each phase before moving to next
3. **Git Branching**: Use feature branches for each phase, can rollback if needed
4. **Documentation**: Document new patterns as you go
5. **DevTools**: Use React Query DevTools and Router DevTools for debugging

---

## Success Metrics

### Code Quality Metrics

- [ ] **Code Reduction**: ≥50% reduction in custom code
- [ ] **Type Safety**: 100% type coverage on routes, forms, data fetching
- [ ] **Build Success**: No TypeScript errors, all lints pass
- [ ] **Bundle Size**: No significant increase (TanStack is lightweight)

### Functional Metrics

- [ ] **Feature Parity**: All existing features work identically
- [ ] **Performance**: No performance regression (likely improvement)
- [ ] **Developer Experience**: Faster development, better autocomplete
- [ ] **Maintainability**: Reduced custom code to maintain

### Validation Checklist

```typescript
// ✅ All data fetching uses TanStack Query
// ✅ All tables use TanStack Table
// ✅ All forms use TanStack Form
// ✅ All routing uses TanStack Router
// ✅ No React Router imports remaining
// ✅ No custom caching logic remaining
// ✅ No custom pagination hooks remaining
// ✅ DevTools working for Query and Router
// ✅ All routes type-safe with autocomplete
// ✅ All forms have Zod validation
```

---

## LLM Agent Instructions

### For Claude Code or Other LLM Agents

This section provides structured guidance for LLM agents implementing this migration.

#### General Principles

1. **Follow phases sequentially** - Complete Phase N before starting Phase N+1
2. **Test after each change** - Verify functionality before proceeding
3. **Preserve existing behavior** - Do not add new features during migration
4. **Maintain type safety** - Ensure TypeScript compilation succeeds
5. **Use DevTools** - Leverage React Query DevTools for debugging

#### Code Patterns to Replace

##### Pattern 1: Custom Data Fetching → TanStack Query

**FIND:**

```typescript
// Custom client class
export class DorkroomClient {
  private cache: Data | null = null;
  async fetchData() {
    /* ... */
  }
}
```

**REPLACE WITH:**

```typescript
import { useQuery } from '@tanstack/react-query';

export const useData = () => {
  return useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    staleTime: 5 * 60 * 1000,
  });
};
```

##### Pattern 2: Manual Table Sorting → TanStack Table

**FIND:**

```typescript
const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
const sorted = useMemo(() => items.sort(...), [items, sort]);
```

**REPLACE WITH:**

```typescript
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';

const table = useReactTable({
  data: items,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
```

##### Pattern 3: Manual Form State → TanStack Form

**FIND:**

```typescript
const [formData, setFormData] = useState({ name: '', age: 0 });
const handleChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });
```

**REPLACE WITH:**

```typescript
import { useForm } from '@tanstack/react-form';

const form = useForm({
  defaultValues: { name: '', age: 0 },
  onSubmit: async ({ value }) => {
    /* ... */
  },
});
```

##### Pattern 4: String Routes → Type-Safe Routes

**FIND:**

```typescript
<Link to="/posts/123">View Post</Link>;
const navigate = useNavigate();
navigate('/posts/123');
```

**REPLACE WITH:**

```typescript
<Link to="/posts/$postId" params={{ postId: '123' }}>
  View Post
</Link>;
const navigate = useNavigate();
navigate({ to: '/posts/$postId', params: { postId: '123' } });
```

#### Implementation Checklist Per Phase

**Phase 1 Checklist:**

- [ ] Run installation command
- [ ] Add QueryClientProvider to main.tsx
- [ ] Verify DevTools appear in browser
- [ ] Ensure build succeeds

**Phase 2 Checklist:**

- [ ] Create query hooks for each data type
- [ ] Replace DorkroomClient usage with hooks
- [ ] Test data fetching in browser
- [ ] Verify cache behavior with DevTools
- [ ] Delete DorkroomClient.ts

**Phase 3 Checklist:**

- [ ] Define column types
- [ ] Create table component
- [ ] Replace old table component
- [ ] Test sorting, filtering, pagination
- [ ] Delete usePagination hook

**Phase 4 Checklist:**

- [ ] Set up form factory
- [ ] Create Zod schemas
- [ ] Migrate forms one by one
- [ ] Test validation and submission
- [ ] Verify error display

**Phase 5 Checklist:**

- [ ] Create route tree
- [ ] Convert all route definitions
- [ ] Update all Link components
- [ ] Update all useNavigate calls
- [ ] Remove react-router-dom
- [ ] Test all routes and navigation

#### Error Handling

**Common Issues and Solutions:**

1. **Issue:** Query not refetching
   **Solution:** Check `staleTime` and `refetchOnWindowFocus` settings

2. **Issue:** Table not sorting
   **Solution:** Ensure `getSortedRowModel` is included in `useReactTable`

3. **Issue:** Form validation not working
   **Solution:** Verify Zod schema is correctly configured with `zodValidator`

4. **Issue:** Route params not typed
   **Solution:** Ensure using `Route.useParams()` instead of global `useParams()`

#### Testing Commands

```bash
# Type check
bunx nx typecheck dorkroom

# Lint
bunx nx lint dorkroom

# Build
bunx nx build dorkroom

# Dev server
bunx nx dev dorkroom -- --host=0.0.0.0
```

---

## Additional Resources

### Official Documentation

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Table Docs](https://tanstack.com/table/latest)
- [TanStack Form Docs](https://tanstack.com/form/latest)
- [TanStack Router Docs](https://tanstack.com/router/latest)

### Migration Guides

- [React Query v3 → v5 Migration Guide](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)
- [React Router → TanStack Router](https://tanstack.com/router/latest/docs/framework/react/guide/migrate-from-react-router)

### Code Examples

All TanStack libraries have extensive example repositories on GitHub.

---

## Notes

### Why TanStack?

1. **Ecosystem Cohesion**: All libraries share similar API patterns
2. **TypeScript First**: Designed with TypeScript from the ground up
3. **Headless Architecture**: Bring your own UI (keep Tailwind)
4. **Framework Agnostic**: Can use with React, Vue, Solid, etc.
5. **Active Maintenance**: Regular updates and improvements
6. **Industry Adoption**: Used by Google, Meta, Amazon, Microsoft
7. **Excellent DevTools**: Built-in debugging and inspection tools

### Post-Migration Benefits

1. **Reduced Maintenance**: Less custom code to maintain
2. **Better Onboarding**: New developers familiar with TanStack
3. **Improved Testing**: Libraries are well-tested, reduce test burden
4. **Community Support**: Large community for questions and help
5. **Future Features**: Benefit from library improvements automatically

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Status:** Ready for Implementation
