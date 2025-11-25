# GitHub Issue Templates for Tech Debt Remediation

Copy each issue below to create in GitHub.

---

## Issue 1: Fix `any` types in useRecipeActions.ts

**Title:** refactor: Replace `any` types with proper interfaces in useRecipeActions.ts

**Labels:** `tech-debt`, `typescript`

**Body:**

````markdown
## Description

The `useRecipeActions.ts` hook has multiple `any` type annotations that should be replaced with proper TypeScript interfaces.

## Location

`apps/dorkroom/src/app/pages/development-recipes/hooks/useRecipeActions.ts:35-44`

## Current Code

```typescript
shareCustomRecipe: (params: any) => Promise<any>;
copyCustomRecipeToClipboard: (params: any) => Promise<any>;
shareRegularRecipe: (params: any) => Promise<any>;
copyRegularRecipeToClipboard: (params: any) => Promise<any>;
decodeSharedCustomRecipe: (input: string) => any;
```
````

## Expected Outcome

Define proper interfaces for:

- Share function parameters and return types
- Copy-to-clipboard function parameters and return types
- Decode function return type

## Priority

High - This Sprint

````

---

## Issue 2: Remove deprecated TAG_COLORS

**Title:** refactor: Remove deprecated TAG_COLORS export

**Labels:** `tech-debt`, `cleanup`

**Body:**

```markdown
## Description

The `TAG_COLORS` constant in `tag-colors.ts` is marked as deprecated and should be removed, with all usages migrated to `getTagThemeStyle`.

## Location

`packages/ui/src/lib/tag-colors.ts:15-47`

## Current Code

```typescript
// Legacy Tailwind colors - deprecated, use getTagThemeStyle instead
export const TAG_COLORS: Record<string, TagColorConfig> = { ... };
````

## Tasks

- [ ] Search for all usages of `TAG_COLORS` and `getTagColors`
- [ ] Replace with `getTagThemeStyle`
- [ ] Remove deprecated exports

## Priority

High - This Sprint

````

---

## Issue 3: Review and fix exhaustive-deps suppressions

**Title:** fix: Review react-hooks/exhaustive-deps ESLint suppressions

**Labels:** `tech-debt`, `react-hooks`, `bug-risk`

**Body:**

```markdown
## Description

Several components have `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions that can cause stale closure bugs. Each should be reviewed and either fixed or documented.

## Locations

1. `packages/logic/src/hooks/development-recipes/use-recipe-url-state.ts:425`
2. `apps/dorkroom/src/app/pages/exposure-calculator/exposure-calculator-page.tsx:145`
3. `packages/ui/src/components/border-calculator/mobile-border-calculator.tsx:166`
4. `apps/dorkroom/src/app/pages/border-calculator/hooks/use-border-calculator-controller.ts:85`

## Tasks

For each location:
- [ ] Review the useEffect and its dependencies
- [ ] Either fix the dependency array OR add a comment explaining why suppression is necessary
- [ ] Remove suppression if dependency array is fixed

## Priority

Medium - Next Sprint
````

---

## Issue 4: Implement proper fuzzy search in Supabase function

**Title:** fix: Differentiate fuzzy vs exact search in Supabase films function

**Labels:** `tech-debt`, `backend`, `dead-code`

**Body:**

````markdown
## Description

The fuzzy and non-fuzzy branches in the films Supabase function have identical implementations, making the `fuzzy` parameter ineffective.

## Location

`supabase/functions/films/index.ts:96-104`

## Current Code

```typescript
if (query) {
  if (fuzzy) {
    // Fuzzy search: use ilike with wildcards
    dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
  } else {
    // Exact search: same implementation as fuzzy!
    dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
  }
}
```
````

## Tasks

- [ ] Implement proper exact search (e.g., `eq` or stricter `ilike`)
- [ ] OR remove the unused `fuzzy` parameter if not needed
- [ ] Update similar functions (developers, combinations) if applicable

## Priority

Medium - Next Sprint

````

---

## Issue 5: Align package versions across workspace

**Title:** chore: Align package versions across workspace packages

**Labels:** `tech-debt`, `dependencies`

**Body:**

```markdown
## Description

Several packages have version inconsistencies across the workspace that should be aligned.

## Version Inconsistencies

| Package               | Root    | @dorkroom/ui | @dorkroom/api |
| --------------------- | ------- | ------------ | ------------- |
| @tanstack/react-table | ^8.21.3 | ^8.20.5      | -             |
| vitest                | ^3.0.0  | ^3.0.0       | ^1.6.0        |
| jsdom                 | ~22.1.0 | -            | ^23.0.1       |

## Tasks

- [ ] Update `@dorkroom/ui` to use `@tanstack/react-table: ^8.21.3`
- [ ] Update `@dorkroom/api` to use `vitest: ^3.0.0`
- [ ] Align jsdom versions across packages

## Priority

Medium - Next Sprint
````

---

## Issue 6: Add localStorage schema validation

**Title:** feat: Add Zod schema validation for localStorage data

**Labels:** `enhancement`, `security`, `tech-debt`

**Body:**

````markdown
## Description

Currently, JSON data parsed from localStorage is used directly without schema validation. Adding Zod schema validation would provide:

- Runtime type safety
- Protection against corrupted/malicious data
- Better error messages when data is invalid

## Example Location

`packages/logic/src/hooks/border-calculator/use-border-calculator-state.ts:181-184`

```typescript
const cached = JSON.parse(raw);
if (cached && typeof cached === 'object') {
  dispatch({ type: 'BATCH_UPDATE', payload: cached }); // No schema validation
}
```
````

## Tasks

- [ ] Create Zod schemas for each localStorage data type
- [ ] Add validation before dispatching state updates
- [ ] Handle validation errors gracefully (fallback to defaults)
- [ ] Apply to all localStorage hooks

## Priority

Low - Backlog

````

---

## Issue 7: Wrap console statements in debug utilities

**Title:** chore: Replace direct console calls with debug utilities

**Labels:** `tech-debt`, `cleanup`

**Body:**

```markdown
## Description

Several files have direct `console.log/warn/error` calls that are not wrapped in debug utilities, causing them to appear in production.

## Locations

- `packages/logic/src/hooks/development-recipes/use-development-recipes.ts:294,300,449,453`
- `packages/ui/src/components/development-recipes/actions-bar.tsx:132`
- `packages/logic/src/hooks/use-border-calculator.ts:142`

## Tasks

- [ ] Import `debugLog`, `debugWarn`, `debugError` from debug-logger
- [ ] Replace direct console calls with debug utilities
- [ ] Verify no console output in production build

## Priority

Medium - Next Sprint
````

---

## Quick Create Links

After copying each issue, create them at:
https://github.com/narrowstacks/dorkroom/issues/new
