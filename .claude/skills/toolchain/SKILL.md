---
name: toolchain
description: Dorkroom's lint/format/typecheck/dependency toolchain — oxlint, Biome, tsgo (TypeScript 7 preview), and the two-tier dependency pinning policy. Use when changing lint or format config, upgrading TypeScript or build tooling, adding or pinning dependencies, or debugging why a lint rule is not running.
---

# Dorkroom toolchain

## Lint and format

- **Lint with `oxlint`, format with Biome.** Each package's `lint` runs `oxlint` (lint, config in
  `.oxlintrc.json`) then `biome check --linter-enabled=false .` (formatting + import sorting only —
  Biome is no longer the linter). `bun run format` writes Biome formatting.
- Several jsx-a11y rules are set to `warn` (consumer-labelled input primitives, intentional modal
  backdrops) rather than `error`; fix genuine findings and tighten to `error` over time.

## Type-aware lint

- Type-aware rules (`no-floating-promises`, `no-misused-promises`, etc.) run via `bun run lint:types`
  (`oxlint --type-aware`, powered by `oxlint-tsgolint`).
- **Not in the CI gate yet:** tsgolint can't parse a couple of the project tsconfigs (`tsconfig-error`)
  and it surfaces ~200 findings to triage. Run it locally to catch real async bugs; wire it into the
  gate once those are resolved.

## Typecheck and build

- Typecheck/build use **`tsgo`** (`@typescript/native-preview`, the TypeScript 7 beta). The
  `typescript` 5.x package is retained for editor, Vite, and Vitest type services. Migrate to stable
  TypeScript 7 once it ships and drop the preview pin.
- **`@typescript/native-preview` is an exact dev snapshot that never auto-updates.** Re-evaluate it
  periodically (e.g. monthly) against newer snapshots for interim fixes — the feed is the
  `@beta`/`@latest` tags at <https://www.npmjs.com/package/@typescript/native-preview?activeTab=versions>
  (`bun pm view @typescript/native-preview`).

## Dependency pinning

Pinning is **two-tier**:

- Toolchain that shapes the production bundle (vite, vitest, tailwindcss, jsdom, etc.) is pinned exact.
- Everything else uses `^` ranges.
- Babel (`@babel/*`) stays on ranges — Vite 8/Oxc does the actual transforms, so Babel is dev-only
  tooling here.
- The `bunfig.toml` `minimumReleaseAge` gate (7 days) backstops the ranges. To install something
  published in the last week (e.g. an urgent CVE patch), run `bun install --minimum-release-age 0` or
  add the package to `minimumReleaseAgeExcludes`.
