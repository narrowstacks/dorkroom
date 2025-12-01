# CLAUDE.md

## What This Is

Dorkroom is an analog photography calculator app. Nx monorepo with React 19, TypeScript, Tailwind CSS 4, and the TanStack ecosystem (Query v5, Router v1, Form v1, Table v8).

**Structure:**

- `apps/dorkroom/` - Main React application
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic, hooks, schemas (@dorkroom/logic)
- `packages/api/` - API client and types (@dorkroom/api)

## Essential Commands

```bash
# Development
bunx nx dev dorkroom -- --host=0.0.0.0   # Start dev server (check port 4200 first!)
bunx nx build dorkroom                    # Build (always run before serving)

# Verification (run before considering done)
bunx nx run-many --targets=lint,typecheck,test,build

# Formatting (run after verification passes)
bun run format
```

## Documentation

**Packages** (read before modifying):

- `packages/logic/CLAUDE.md` - TanStack Query/Form/Table patterns, mutations, schemas
- `packages/ui/CLAUDE.md` - Component patterns, Tailwind, accessibility
- `packages/api/CLAUDE.md` - API types, Raw vs Transformed types, error handling

**Reference:**

- `docs/pages.md` - All pages, their purposes, and functionality requirements
- `docs/search-strategy.md` - Codebase search tool guidance

## Critical Rules

1. **Use Context7** before working with TanStack, Tailwind, or other dependencies
2. **Never use `any`** - use specific types or `unknown`
3. **Never import internal package paths** - always use `@dorkroom/ui`, `@dorkroom/logic`, `@dorkroom/api`
4. **Avoid circular dependencies** between packages

## Git

- Conventional commits, short messages
- Confirm before committing; never push without explicit request

## Codebase Search

For complex multi-file analysis, use the Task tool with `subagent_type=Explore` instead of manual tool chains.
