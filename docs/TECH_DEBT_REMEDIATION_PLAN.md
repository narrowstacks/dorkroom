# Tech Debt Remediation Plan

> Generated: 2025-11-25
> Status: Active

## Executive Summary

This document outlines tech debt, deprecated functionality, and security issues identified during a comprehensive codebase review. The Dorkroom codebase is generally well-maintained with good security practices. However, there are **10 dependency vulnerabilities**, several **tech debt patterns**, and a few areas requiring attention.

---

## 1. Dependency Vulnerabilities

### Critical Findings (from `bun audit`)

| Package                           | Severity     | Issue                           | Advisory            |
| --------------------------------- | ------------ | ------------------------------- | ------------------- |
| `glob` (>=10.2.0 <10.5.0)         | **HIGH**     | Command injection via -c/--cmd  | GHSA-5j98-mcp5-4vw2 |
| `path-to-regexp` (>=4.0.0 <6.3.0) | **HIGH**     | Backtracking regex DoS          | GHSA-9wv6-86v2-598j |
| `tar` (=7.5.1)                    | Moderate     | Race condition memory exposure  | GHSA-29xp-372q-xqph |
| `vite` (>=5.2.6 <=5.4.20)         | Moderate     | server.fs.deny bypass (Windows) | GHSA-93m4-6634-74q7 |
| `undici` (>=4.5.0 <5.28.5)        | Moderate/Low | Random values issue, DoS        | GHSA-c76h-2ccp-4975 |
| `esbuild` (<=0.24.2)              | Moderate     | Dev server request interception | GHSA-67mh-4wv8-2f99 |
| `js-yaml` (<3.14.2)               | Moderate     | Prototype pollution in merge    | GHSA-mh29-5h37-fv8m |

### Version Mismatch (FIXED)

The React version mismatch between `react` (19.2.0) and `react-dom` (19.0.0) has been resolved.

---

## 2. Tech Debt

### 2.1 Type Safety Issues

**Location:** `apps/dorkroom/src/app/pages/development-recipes/hooks/useRecipeActions.ts:35-44`

```typescript
// Multiple eslint-disable for `any` types
shareCustomRecipe: (params: any) => Promise<any>;
copyCustomRecipeToClipboard: (params: any) => Promise<any>;
shareRegularRecipe: (params: any) => Promise<any>;
copyRegularRecipeToClipboard: (params: any) => Promise<any>;
decodeSharedCustomRecipe: (input: string) => any;
```

**Action Required:** Create proper interfaces for sharing functions to replace `any` types.

### 2.2 Suppressed ESLint Rules

**react-hooks/exhaustive-deps suppressions** (can cause stale closure bugs):

- `packages/logic/src/hooks/development-recipes/use-recipe-url-state.ts:425`
- `apps/dorkroom/src/app/pages/exposure-calculator/exposure-calculator-page.tsx:145`
- `packages/ui/src/components/border-calculator/mobile-border-calculator.tsx:166`
- `apps/dorkroom/src/app/pages/border-calculator/hooks/use-border-calculator-controller.ts:85`

**Action Required:** Review each suppression and either fix the dependency array or document why suppression is necessary.

### 2.3 Deprecated Code

**Location:** `packages/ui/src/lib/tag-colors.ts:15-47`

```typescript
// Legacy Tailwind colors - deprecated, use getTagThemeStyle instead
export const TAG_COLORS: Record<string, TagColorConfig> = { ... };
```

**Action Required:** Remove legacy `TAG_COLORS` export and update all usages to `getTagThemeStyle`.

### 2.4 Dead Code Logic

**Location:** `supabase/functions/films/index.ts:96-104`

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

**Action Required:** Implement proper fuzzy vs exact search differentiation or remove the unused `fuzzy` parameter.

### 2.5 Console Statements in Production Code

Multiple console.log/warn/error statements found that are NOT wrapped in debug utilities:

- `packages/logic/src/hooks/development-recipes/use-development-recipes.ts:294,300,449,453`
- `packages/ui/src/components/development-recipes/actions-bar.tsx:132`
- `packages/logic/src/hooks/use-border-calculator.ts:142`

**Action Required:** Wrap remaining console calls in debugLog utilities.

### 2.6 Package Version Inconsistencies

| Package               | Root    | @dorkroom/ui | @dorkroom/api |
| --------------------- | ------- | ------------ | ------------- |
| @tanstack/react-table | ^8.21.3 | ^8.20.5      | -             |
| vitest                | ^3.0.0  | ^3.0.0       | ^1.6.0        |
| jsdom                 | ~22.1.0 | -            | ^23.0.1       |

**Action Required:** Align versions across workspace packages.

---

## 3. Security Analysis

### 3.1 Positive Findings

1. **No `dangerouslySetInnerHTML`** - Only mentioned in sanitization utility comments
2. **No `eval()` usage** in TypeScript source
3. **No `innerHTML` assignments**
4. **Proper text sanitization** exists: `packages/logic/src/utils/text-sanitization.ts`
5. **localStorage operations** wrapped in try-catch blocks
6. **API keys stored in environment variables**, not hardcoded
7. **No deprecated React patterns** (findDOMNode, componentWillMount, etc.)

### 3.2 Areas for Attention

**localStorage JSON parsing without schema validation:**

While all JSON.parse calls are in try-catch blocks, the parsed data is directly used without schema validation:

```typescript
// packages/logic/src/hooks/border-calculator/use-border-calculator-state.ts:181-184
const cached = JSON.parse(raw);
if (cached && typeof cached === 'object') {
  dispatch({ type: 'BATCH_UPDATE', payload: cached }); // No schema validation
}
```

**CORS wildcard in Supabase functions:**

```typescript
// supabase/functions/films/index.ts
'Access-Control-Allow-Origin': '*';
```

---

## 4. Remediation Plan

### Priority 1: Critical (Do Now) - COMPLETED

| Issue                                        | Action                                    | Status    |
| -------------------------------------------- | ----------------------------------------- | --------- |
| HIGH severity `glob` vulnerability           | Update via transitive deps                | Completed |
| HIGH severity `path-to-regexp` vulnerability | Update `@vercel/node` and Nx packages     | Completed |
| React version mismatch                       | Aligned to 19.2.0 across all declarations | Completed |

### Priority 2: High (This Sprint)

| Issue                           | Action                                            | Effort |
| ------------------------------- | ------------------------------------------------- | ------ |
| `any` types in useRecipeActions | Define proper interfaces for sharing functions    | Medium |
| Deprecated TAG_COLORS           | Remove legacy code and update to getTagThemeStyle | Low    |

### Priority 3: Medium (Next Sprint)

| Issue                            | Action                                                 | Effort |
| -------------------------------- | ------------------------------------------------------ | ------ |
| Duplicate fuzzy search logic     | Implement proper fuzzy vs exact search differentiation | Low    |
| Package version inconsistencies  | Align versions across workspace packages               | Low    |
| exhaustive-deps suppressions     | Review and fix hook dependency arrays                  | Medium |
| Console statements in production | Wrap remaining console calls in debugLog utilities     | Low    |

### Priority 4: Low (Backlog)

| Issue                          | Action                                        | Effort |
| ------------------------------ | --------------------------------------------- | ------ |
| localStorage schema validation | Add Zod schemas for localStorage data parsing | Medium |
| CORS hardening                 | Consider restricting CORS to specific origins | Low    |

---

## 5. Summary

| Category                   | Count | Critical |
| -------------------------- | ----- | -------- |
| Dependency Vulnerabilities | 10    | 2 HIGH   |
| Tech Debt Items            | 6     | -        |
| Security Issues            | 0     | 0        |
| Deprecated Code            | 1     | -        |
| Type Safety Issues         | 2     | -        |

The codebase demonstrates good security practices overall. The main concerns are dependency vulnerabilities that should be addressed promptly, and tech debt that can be resolved incrementally.

---

## Related Issues

- [ ] #TBD - Fix `any` types in useRecipeActions.ts
- [ ] #TBD - Remove deprecated TAG_COLORS
- [ ] #TBD - Fix exhaustive-deps suppressions
- [ ] #TBD - Implement proper fuzzy search in Supabase function
- [ ] #TBD - Add localStorage schema validation
