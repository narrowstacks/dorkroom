---
name: toolchain
description: Dorkroom's lint/format/typecheck/dependency toolchain — oxlint, bun fmt, bun check, the side-by-side TypeScript 7 (compiler) / TypeScript 6 (API) split, and the two-tier dependency pinning policy. Use when changing lint or format config, upgrading TypeScript or build tooling, adding or pinning dependencies, or debugging why a lint rule is not running.
---

# Dorkroom toolchain

## Lint and format

- **Lint with `oxlint`, format with `bun fmt`.** Each package's `lint` runs `oxlint` (config in
  `.oxlintrc.json`) then `bun fmt --check` (formatting and import sorting). `bun run format` writes.
  Biome did the formatting until it was replaced by `bun fmt`, which prints what Prettier 3 prints
  and was about 4.5x faster on this repo.
- **`bun fmt` config is split in two on purpose.** Style options (quotes, trailing commas, width,
  double quotes in CSS) live in `.prettierrc.json`, which `bun fmt` reads, so the Prettier VS Code
  extension formats on save with identical output. Bun-only options live under `[fmt]` in
  `bunfig.toml`: `sortImports` (with `newlinesBetween = false`, matching the single import block
  Biome produced) and `ignorePatterns`. The editor extension does not sort imports, so run
  `bun run format` (or let `lint` catch it) after adding imports.
- **`ignorePatterns` repeats the build directories from `.gitignore`.** With a Prettier config
  present, `bun fmt` reads only the `.gitignore` in the working directory, so the per-package `lint`
  runs would otherwise check `dist/` and other build output. Add any new ignored build directory
  there too. Markdown and YAML are ignored as well: they were hand-formatted under Biome, whose
  formatters for them rewrote ~50 docs and every workflow in a style the repo doesn't use.
- Turbo's `lint` task lists `.oxlintrc.json`, `.prettierrc.json` and `bunfig.toml` as `inputs`
  (via `$TURBO_ROOT$`), so a config change re-runs every package's lint instead of hitting cache.
- Root `bun run lint` / `lint:fix` walk the **whole repo** (a local convenience). CI instead runs root
  `lint:root` as turbo's `//#lint:root` task, which covers only root-owned files (workspaces own
  `apps/*` and `packages/*`). The script has **two path lists**: `oxlint` lints `api/ utils/ scripts/
  tools/ supabase/` and the root JS/TS configs (`postcss.config.js`, `vitest.config.ts`);
  `bun fmt --check` covers those plus `.vscode/` and the root JSON configs. Turbo schedules a root
  task only if `turbo.json` declares it as `//#<task>`. Its `inputs` are `$TURBO_DEFAULT$` minus the
  workspaces, so turbo needs no change, but a new root-owned directory with JS/TS must go in **both**
  lists of the `lint:root` script (format-list-only means it is format-checked but never linted).
- The `// biome-ignore lint/...` comments left in the source are dead: Biome's linter stopped
  running when oxlint took over. They are harmless; remove them as you touch those lines.
- oxlint 1.78+ ships the React Compiler lint set (`react/set-state-in-effect`, `refs`, `purity`,
  `immutability`, `static-components`, `incompatible-library`, `preserve-manual-memoization`) under
  `correctness`. They are `off` in `.oxlintrc.json`: the app doesn't use React Compiler, many hits are
  false positives here (Reanimated `sharedValue.value =` writes, TanStack Virtual/Table flagged as
  "incompatible", the documented setState-during-render resync in `calculator-number-field`), and
  React Doctor re-reports oxlint warnings as blocking, so `warn` isn't an option. Revisit if React
  Compiler is adopted.
- Several jsx-a11y rules are set to `warn` (consumer-labelled input primitives, intentional modal
  backdrops) rather than `error`; fix genuine findings and tighten to `error` over time.

## Type-aware lint

- Type-aware rules (`no-floating-promises`, `no-misused-promises`, etc.) run via `bun run lint:types`
  (`oxlint --type-aware`, powered by `oxlint-tsgolint`).
- **Not in the CI gate yet:** tsgolint can't parse a couple of the project tsconfigs (`tsconfig-error`)
  and it surfaces ~200 findings to triage. Run it locally to catch real async bugs; wire it into the
  gate once those are resolved.

## Typecheck and build

**Two TypeScripts are installed on purpose. 7 compiles; 6 provides the API. Do not collapse them.**

- **Typecheck runs on `bun check`**, Bun's built-in checker, which reports exactly what `tsc` from
  TypeScript 7 reports (`bun -p process.versions.typescript` is the version it matches; keep it
  equal to the `typescript-7` pin). Every package's `typecheck` is plain `bun check`, which follows
  the `references` in the package's `tsconfig.json`, so a project missing from `references` is
  silently not checked. It was ~2.5x faster than the nine separate `tsc` runs it replaced.
  `bun check` needs Bun 1.4.3+, and `bun fmt` needs 1.4.4+; CI pins the version in
  `.github/workflows/*.yml` and `packageManager`.
- **Build stays on `tsc`**, because `bun check` never emits `.d.ts` files. Build runs on **stable
  TypeScript 7**, installed as `typescript-7` (an npm alias for `typescript@^7.0.2`, the Go
  compiler), invoked by explicit path: `node ../../node_modules/typescript-7/bin/tsc`.
- **`typecheck:api` also stays on `tsc`**, the 6.x one: `api/tsconfig.json` still uses
  `moduleResolution: node10` and `baseUrl`, which TypeScript 7 (and so `bun check`) rejects. The same
  two options are the `tsconfig-error` that keeps `lint:types` out of the CI gate.
- **`typescript` is deliberately held on 6.x — it is the compiler _API_, not the compiler.**
  TypeScript 7.0 ships no programmatic API (it returns in 7.1), and `@vercel/node` does
  `require.resolve('typescript')` against the project to compile `api/**/*.ts` at deploy time, so a
  7.x `typescript` silently breaks the serverless build (`ts.sys`/`ts.readConfigFile` are
  `undefined`). Vite, Vitest, and the editor language service resolve the same package. This is the
  side-by-side layout from
  [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
  `renovate.json` disables `typescript` majors so the 6→7 bump stops being re-proposed;
  lift the hold and collapse the two packages once 7.1 restores the API (Microsoft's stated window
  is 3–4 months from the 7.0 RC, so roughly Q4 2026).
- **Renovate owns every dependency in this repo** (`renovate.json`). It replaced Dependabot, whose
  bun-ecosystem support had three disqualifying failure modes: it silently skips aliased packages
  ([dependabot-core#15847](https://github.com/dependabot/dependabot-core/issues/15847) — how the
  `typescript-7` pin sat on the moving `rc` dist-tag from #133 until caught manually), it unifies a
  version across every workspace manifest (how PR #187 rewrote apps/mobile's tailwindcss from v3 to
  v4 while calling itself a patch bump), and it bumps react-dom without react (issue #208 — always
  fails CI). Things about the config that are load-bearing:
  - The typescript-7 rule matches on **`matchDepNames: ["typescript-7"]`, not `matchPackageNames`.**
    The alias resolves to `packageName: "typescript"`, so a `matchPackageNames` rule would also
    match the 6.x compiler-API pin and propose exactly the 6→7 bump that breaks the Vercel build.
  - Global **`rangeStrategy: "bump"`**: under the default `replace` strategy an in-range release
    like typescript 7.1.0 would satisfy `^7.0.2` and produce **no PR** — and 7.1 is precisely the
    release we are waiting for. `bump` moves the floor, so releases arrive as visible PRs.
  - Global `minimumReleaseAge: "7 days"` mirrors the `bunfig.toml` soak gate, so Renovate never
    proposes a version `bun install` would refuse.
  - react/react-dom (+ their @types) are grouped into one PR (`groupName: "react"`) — they must be
    the exact same version or react-dom refuses to boot.
  - Expo SDK-managed native modules are disabled entirely: `expo install --fix` owns those
    versions, and nothing in CI builds the native app to catch a bad bump.
  - GitHub's "automated security fixes" (Dependabot security PRs) are disabled at the repo level;
    Renovate's `vulnerabilityAlerts`/`osvVulnerabilityAlerts` cover security updates instead.
  - Renovate requires the GitHub App to be installed on the repo; the config file alone does
    nothing. If updates ever go quiet for a long stretch, check that first.
- **Don't reach for the `@typescript/typescript6` compat wrapper** that the announcement recommends
  (`typescript@npm:@typescript/typescript6`). Under bun 1.3.11 it self-destructs: the wrapper's
  `@typescript/old` → `npm:typescript@^6` dependency dedupes against the `typescript` alias key and
  resolves to the wrapper itself, so `require('typescript')` returns an empty module. Plain
  `typescript@^6.0.3` gives the same API plus the lib files and `tsserver` the wrapper only proxies.
- **`bunx tsc` is TypeScript 6.** Both packages ship a `tsc` bin and bun links `typescript`'s. Use
  `bun check`, or the explicit `node node_modules/typescript-7/bin/tsc` path (as the `build` scripts
  do), whenever you mean the 7.x compiler.

## Dependency pinning

Pinning is **two-tier**:

- Toolchain that shapes the production bundle (vite, vitest, tailwindcss, jsdom, etc.) is pinned exact.
- Everything else uses `^` ranges.
- Babel (`@babel/*`) stays on ranges — Vite 8/Oxc does the actual transforms, so Babel is dev-only
  tooling here.
- The `bunfig.toml` `minimumReleaseAge` gate (7 days) backstops the ranges. To install something
  published in the last week (e.g. an urgent CVE patch), run `bun install --minimum-release-age 0`.
- **The gate currently has no exemptions, and it is worth keeping it that way.**
  `minimumReleaseAgeExcludes` existed only while `typescript-7` tracked the moving `rc` dist-tag,
  which could resolve to a same-day pre-release; it was dropped once that pin went stable. Adding a
  package back to that list punches a permanent hole in the supply-chain soak gate — prefer the
  one-off `--minimum-release-age 0` flag.
