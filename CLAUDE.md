# CLAUDE.md

## What This Is

Dorkroom is an analog photography calculator app. Turborepo monorepo with React 19, TypeScript, Tailwind CSS 4, and the TanStack ecosystem (Query v5, Router v1, Form v1, Table v8, Virtual v3, Store v0.11).

**Structure:**

- `apps/dorkroom/` - Main React application (Vite SPA)
- `apps/mobile/` - iOS app (Expo, React Native) reusing @dorkroom/logic and @dorkroom/api
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic, hooks, schemas (@dorkroom/logic)
- `packages/api/` - API client and types (@dorkroom/api)
- `api/` - Vercel serverless functions (proxy to Supabase)
- `utils/` - Shared helpers for the `api/` functions. Repo root, not `api/utils/`

`dorkroom.art/docs` is served by a **separate repo** through Vercel
Microfrontends. `apps/dorkroom/microfrontends.json` declares which paths route
there (`/docs/*`, `/keystatic*`, `/api/search`, `/llms-full.txt`). Nothing under
those paths lives in this repo.

## Essential Commands

```bash
# Development
bun run dev                               # Start dev server (check port 4200 first!)
bun run build                             # Build all packages

# Verification (run before considering done)
bun run test                              # lint, test, build, typecheck, typecheck:api,
                                          # test:serverless, test:docs, doctor
bun run test:unit "pattern"               # Run only tests matching pattern
bun run doctor                            # React Doctor alone; fails on any warning

# Formatting (run after verification passes)
bun run format
```

CI runs exactly `bun run test`, so a green local run means a green pipeline.

## Health Score (React Doctor)

**Enforced.** `bun run doctor` runs `react-doctor --blocking warning`, which
exits non-zero on any warning, and it is part of `bun run test`. CI runs the
same command, so a regression fails the PR rather than drifting unnoticed.

`react-doctor` is a pinned devDependency, not `npx @latest`, so Renovate
proposes upgrades as reviewable PRs. This matters: the tool renamed
`no-multi-comp` to `no-multi-component-file`, our suppressions kept naming the
old rule, and the score silently fell to 90/100 (fixed in #229). A pinned
version turns that into one failing PR instead of a mystery.

Use `bun run doctor` to check, `bunx react-doctor --verbose` to see per-file
detail. See the `react-doctor` skill (`.claude/skills/react-doctor/`) for the
ruleset, `doctor.config.json` policy, and which rules are suppressed and why.

## Documentation

**Packages** (read before modifying):

- `packages/logic/CLAUDE.md` - TanStack Query/Form/Table patterns, mutations, schemas
- `packages/ui/CLAUDE.md` - Component patterns, Tailwind, accessibility
- `packages/api/CLAUDE.md` - API types, Raw vs Transformed types, error handling
- `api/CLAUDE.md` - Vercel serverless functions, Supabase proxy endpoints
- `apps/mobile/CLAUDE.md` - iOS app conventions and the build-vs-reload decision guide

**Reference:**

- `docs/pages.md` - All pages, their purposes, and functionality requirements
- `docs/API.md` - Public REST API reference for `api.dorkroom.art`

## Critical Rules

1. **Use Context7** before working with TanStack, Tailwind, or other dependencies
2. **Never use `any`**. Use specific types or `unknown`
3. **Import only published entry points.** `@dorkroom/logic` and `@dorkroom/api`
   expose a single root entry. `@dorkroom/ui` also publishes subpaths
   (`/forms`, `/calculator`, `/border-calculator`, `/development-recipes`,
   `/films`) declared in its `exports` map. Anything not in an `exports` map is
   an internal path and off limits.
4. **Avoid circular dependencies** between packages
5. **Avoid using "warning" or "error" in file names**, which raises false warning and error flags in the build log.

## OG Image Generation

When adding or changing routes/pages or API endpoints, regenerate the OG images.
See the `og-image-routes` skill (`.claude/skills/og-image-routes/`) for the
four-step procedure. Note: the generic `og-image` skill describes a different,
screenshot-based approach that does **not** apply to this repo.

## Analytics and Privacy

Vercel Web Analytics custom events are declared in **one** place:
`apps/dorkroom/src/app/lib/analytics/events.ts`. Two constraints are
load-bearing there: at most **two properties per event** (the Pro-plan
ceiling; Vercel drops the surplus silently) and **closed unions or numbers
only, never free text**, so nothing a user typed can reach the wire. URL query
strings and hashes are stripped in `redact.ts` before any event is sent.

Analytics lives in the app, never in `packages/logic` or `packages/ui`. The
iOS app shares those packages and has no Vercel Analytics, so instrument at the
app-level action hooks (`use-calculator-analytics.ts`,
`use-search-analytics.ts`, `use-preference-analytics.ts`) and page components
instead.

Adding or changing an event means updating `events.ts`, `PRIVACY.md`, and
`apps/dorkroom/src/app/pages/privacy-page.tsx` **in the same PR**. This is
enforced: `tools/__tests__/analytics-privacy-sync.test.ts` compares the event
names in all three and fails if they diverge. It runs as `bun run test:docs`,
inside `bun run test`, and in CI. It lives at the repo root rather than in the
app so that a `PRIVACY.md`-only edit still busts turbo's cache.

## Versioning

**CalVer** (`YYYY.MM.DD`). Web and iOS version independently, each with its own
changelog (root `CHANGELOG.md` / `apps/mobile/CHANGELOG.md`). README badges are
workflow-synced by `.github/workflows/sync-readme-badges.yml`. Never hand-edit
them. See the `releasing` skill (`.claude/skills/releasing/`) before pushing to
main.

## Toolchain

Lint with `oxlint`, format with Biome. Typecheck/build run on **stable
TypeScript 7** via the `typescript-7` npm alias; `typescript` is deliberately
held on **6.x** because TS 7.0 ships no programmatic API and `@vercel/node`
resolves `typescript` from the project to build the functions in `api/`. Do not
collapse the two. **Renovate** manages all dependencies (`renovate.json`);
Dependabot was dropped because its bun support is blind to the `typescript-7`
alias, unifies versions across workspace manifests, and desyncs react/react-dom
(issue #208). Type-aware rules run separately via `bun run lint:types` and are
not yet in the CI gate. Dependency pinning is two-tier, backstopped by the
`bunfig.toml` `minimumReleaseAge` gate. See the `toolchain` skill
(`.claude/skills/toolchain/`) for the full policy and rationale.

## Vercel Runtime

**Never pin `@vercel/node` in `vercel.json`.** It is an *official* builder: the
build image installs the version bundled with its own CLI and then hard-fails if
a `functions[].runtime` pin disagrees.

```
> Installing Builder: @vercel/node@5.10.1
Error: Failed to load Builders after installing them: @vercel/node@5.9.0 (version-mismatch)
```

A pin can only match by coincidence, and Vercel rolls the image forward on its
own schedule. This repo chased that treadmill four times (5.3.0, 5.6.3, 5.8.26,
5.9.0) before removing it. `functions[].runtime` is for **community** runtimes
(`vercel-php@0.5.2`) only. Zero-config `api/` detection already builds every
entrypoint. It always did, which is why `api/og.tsx` deployed fine despite
never matching the old `api/**/*.ts` glob.

The Node major is set by root `package.json` `engines.node` (currently `24.x`),
which **overrides** the Vercel dashboard setting. Change it here, not there.
Diagnose build failures from the full log (the `Installing Builder` line above
the error names the real cause), not the error string alone.

## Pull Requests

**Every PR that changes rendered output must include before/after screenshots.**
That means a route, a shared component, a theme token, or a calculator's
displayed result: anything a user would see. Use the **`pr-screenshots`** skill.
It maps the diff to the affected routes, captures each one before (from the
merge-base) and after, and uploads the images to GitHub's CDN. Nothing is
committed to the repo.

If a PR has no rendered output (an `api/` change, a config bump, tests), say so
in the description in one line. Silence is ambiguous: a reviewer can't tell
whether screenshots were considered or forgotten.

**Every PR must use the template at `.github/PULL_REQUEST_TEMPLATE.md`.**
Fill in every section: check the actual boxes that apply, list real changes,
and delete nothing. When creating a PR with `gh pr create`, start the body from
the template file rather than writing a freeform description. Issues likewise
use the forms in `.github/ISSUE_TEMPLATE/`.

**Every PR and issue must be labeled.** Pick from the existing labels
(`gh label list`): at least one type label (`bug`, `enhancement`, `adjustment`,
`refactoring`, `documentation`, `dependencies`) plus any area labels that apply
(`api`, `infobase`, per-calculator/page labels, etc.). Add `claude` to anything
Claude Code creates. Never apply `eas-build` unless an EAS build is intended:
that label triggers builds. Don't invent new labels without asking.

## Git

- Conventional commits, short messages
- Confirm before committing; never push without explicit request
- `main` rejects merge commits. Land branches by squash or rebase
