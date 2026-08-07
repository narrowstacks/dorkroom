# CLAUDE.md

## What This Is

Dorkroom is an analog photography calculator app. Turborepo monorepo with React 19, TypeScript, Tailwind CSS 4, and the TanStack ecosystem (Query v5, Router v1, Form v1, Table v8, Virtual v3).

**Structure:**

- `apps/dorkroom/` - Main React application
- `apps/mobile/` - iOS app (Expo, React Native) reusing @dorkroom/logic and @dorkroom/api
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic, hooks, schemas (@dorkroom/logic)
- `packages/api/` - API client and types (@dorkroom/api)
- `api/` - Vercel serverless functions (proxy to Supabase)

## Essential Commands

```bash
# Development
bun run dev                               # Start dev server (check port 4200 first!)
bun run build                             # Build all packages

# Verification (run before considering done)
bun run test                              # Runs lint, test, build, typecheck
bun run test:unit "pattern"               # Run only tests matching pattern
npx react-doctor@latest --score           # Health score — must stay 100/100 (see below)

# Formatting (run after verification passes)
bun run format
```

## Health Score (React Doctor) — run when finishing a task

Run `npx react-doctor@latest --verbose` after completing a feature, fixing a bug,
or before committing React code. All four projects must stay at **100/100**.
A 100 score does **not** mean `bun run test` passes — always run both.
See the `react-doctor` skill (`.claude/skills/react-doctor/`) for the full
ruleset, `doctor.config.json` policy, and which rules are suppressed and why.

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

## OG Image Generation

When adding or changing routes/pages or API endpoints, regenerate the OG images.
See the `og-image-routes` skill (`.claude/skills/og-image-routes/`) for the
four-step procedure. Note: the generic `og-image` skill describes a different,
screenshot-based approach that does **not** apply to this repo.

## Versioning

**CalVer** (`YYYY.MM.DD`). Web and iOS version independently, each with its own
changelog (root `CHANGELOG.md` / `apps/mobile/CHANGELOG.md`). README badges are
workflow-synced — never hand-edit. See the `releasing` skill
(`.claude/skills/releasing/`) before pushing to main.

## Toolchain

Lint with `oxlint`, format with Biome, typecheck/build with `tsgo`
(`@typescript/native-preview`). Type-aware rules run separately via
`bun run lint:types` and are not yet in the CI gate. Dependency pinning is
two-tier, backstopped by the `bunfig.toml` `minimumReleaseAge` gate. See the
`toolchain` skill (`.claude/skills/toolchain/`) for the full policy and rationale.

## Pull Requests

**Every PR that changes rendered output must include before/after screenshots.**
That means a route, a shared component, a theme token, or a calculator's
displayed result — anything a user would see. Use the **`pr-screenshots`** skill:
it maps the diff to the affected routes, captures each one before (from the
merge-base) and after, and uploads the images to GitHub's CDN. Nothing is
committed to the repo.

If a PR has no rendered output — an `api/` change, a config bump, tests — say so
in the description in one line. Silence is ambiguous: a reviewer can't tell
whether screenshots were considered or forgotten.

## Git

- Conventional commits, short messages
- Confirm before committing; never push without explicit request

## Codebase Search

For complex multi-file analysis, use the Task tool with `subagent_type=Explore` instead of manual tool chains.
