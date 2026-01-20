# CLAUDE.md

## What This Is

Dorkroom is an analog photography calculator app. Turborepo monorepo with React 19, TypeScript, Tailwind CSS 4, and the TanStack ecosystem (Query v5, Router v1, Form v1, Table v8, Virtual v3).

**Structure:**

- `apps/dorkroom/` - Main React application
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic, hooks, schemas (@dorkroom/logic)
- `packages/api/` - API client and types (@dorkroom/api)
- `api/` - Vercel serverless functions (proxy to Supabase)

## Toolchain

Modern Rust-based toolchain for fast builds:

- **Bundler**: [Rolldown](https://rolldown.rs) via `rolldown-vite` (replaces Rollup/esbuild)
- **Linter**: [Oxlint](https://oxc.rs/docs/guide/usage/linter) (replaces ESLint)
- **Type Checker**: [tsgo](https://github.com/nicolo-ribaudo/ts-go) (TypeScript 7 preview)
- **Formatter**: [Biome](https://biomejs.dev)

**Key configs:**

- `apps/dorkroom/vite.config.ts` - Rolldown bundling with `advancedChunks`
- `.oxlintrc.json` - Type-aware linting rules
- `biome.json` - Formatting rules

**Rollback**: To revert to the old toolchain, see the PR history for `feat/modern-toolchain`.

## Essential Commands

```bash
# Development
bun run dev                               # Start dev server (check port 4200 first!)
bun run build                             # Build all packages

# Before committing (run in this order)
bun run test                              # 1. Runs lint, test, build, typecheck
bun run format                            # 2. Format code (after test passes)
# Then commit and push                    # 3. Commit only after test + format

# Run specific tests
bun run test:unit "pattern"               # Run only tests matching pattern
```

## Documentation

**Packages** (read before modifying):

- `packages/logic/CLAUDE.md` - TanStack Query/Form/Table patterns, mutations, schemas
- `packages/ui/CLAUDE.md` - Component patterns, Tailwind, accessibility
- `packages/api/CLAUDE.md` - API types, Raw vs Transformed types, error handling
- `api/CLAUDE.md` - Vercel serverless functions, Supabase proxy endpoints

**Reference:**

- `docs/pages.md` - All pages, their purposes, and functionality requirements
- `docs/search-strategy.md` - Codebase search tool guidance

## Critical Rules

1. **Use Context7** before working with TanStack, Tailwind, or other dependencies
2. **Never use `any`** - use specific types or `unknown`
3. **Never import internal package paths** - always use `@dorkroom/ui`, `@dorkroom/logic`, `@dorkroom/api`
4. **Avoid circular dependencies** between packages
5. **Avoid using "warning" or "error" in file names** as this causes false warnings and errors flags in the build log.

## Git

- Conventional commits, short messages
- Confirm before committing; never push without explicit request

## Codebase Search

For complex multi-file analysis, use the Task tool with `subagent_type=Explore` instead of manual tool chains.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **Run quality gates** (if code changed):
   ```bash
   bun run test                           # lint, test, build, typecheck
   bun run format                         # format BEFORE committing
   ```
2. **Commit and PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
3. **Clean up** - Clear stashes, prune remote branches
4. **Verify** - All changes committed AND pushed
5. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
