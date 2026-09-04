# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: single-context.** One `CONTEXT.md` and one `docs/adr/` at the repo
root cover the whole product. Dorkroom is a monorepo, but its packages are
layers of one application (UI, logic, API client, serverless functions), not
separate business domains, so one glossary serves them all.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

Neither exists yet. That is expected.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-another-decision.md
├── apps/
│   ├── dorkroom/          ← Vite SPA
│   └── mobile/            ← Expo iOS app
├── packages/
│   ├── ui/
│   ├── logic/
│   └── api/
├── api/                   ← Vercel serverless functions
└── utils/                 ← helpers for api/
```

## Also read the per-package CLAUDE.md files

Separate from domain docs, this repo already keeps architectural instructions
next to the code. Read the one covering the package you're touching before
changing it:

- `packages/logic/CLAUDE.md` — TanStack Query/Form/Table patterns, mutations, schemas
- `packages/ui/CLAUDE.md` — component patterns, Tailwind, accessibility
- `packages/api/CLAUDE.md` — Raw vs Transformed types, error handling
- `api/CLAUDE.md` — Vercel serverless functions, Supabase proxy endpoints
- `apps/mobile/CLAUDE.md` — iOS conventions, build-vs-reload decision guide

`docs/pages.md` lists every page and what it must do. `docs/API.md` is the
public REST reference for `api.dorkroom.art`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

This matters more than usual here: the domain is analog photography, where terms
are precise and near-synonyms are not interchangeable. If the concept you need
isn't in the glossary yet, that's a signal: either you're inventing language the
project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
