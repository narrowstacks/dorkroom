---
name: react-doctor
description: Use when finishing a feature, fixing a bug, before committing React code, or when the user wants to improve code quality or clean up a codebase. Checks for score regression. Covers lint, accessibility, bundle size, architecture diagnostics.
version: "1.0.0"
---

# React Doctor

Scans React codebases for security, performance, correctness, and architecture issues. Outputs a 0–100 health score.

## After making React code changes:

Run `npx react-doctor@latest --verbose --diff` and check the score did not regress.

If the score dropped, fix the regressions before committing.

## For general cleanup or code improvement:

Run `npx react-doctor@latest --verbose` (without `--diff`) to scan the full codebase. Fix issues by severity — errors first, then warnings.

## Command

```bash
npx react-doctor@latest --verbose --diff
```

| Flag        | Purpose                                       |
| ----------- | --------------------------------------------- |
| `.`         | Scan current directory                        |
| `--verbose` | Show affected files and line numbers per rule |
| `--diff`    | Only scan changed files vs base branch        |
| `--score`   | Output only the numeric score                 |

## Dorkroom specifics

After completing a feature, fixing a bug, or before committing React code, run
React Doctor and make sure the score has **not regressed** — the target is
**100/100 for every project**:

```bash
npx react-doctor@latest --verbose         # unpinned; track the latest ruleset
```

- It scans **four** projects and prints **four** scores: `@dorkroom/source`
  (the app), `@dorkroom/mobile`, `@dorkroom/logic`, `@dorkroom/ui`. All four must be 100.
- The app scan resolves `@dorkroom/*` to package source, so the same physical
  file is reported under both `packages/.../src/...` and bare `src/...` — fix it
  once; verify it's gone from both.
- It **respects inline disables**. Prefer a real fix; only suppress a genuinely
  subjective/false-positive finding, always with a justifying comment:
  `// eslint-disable-next-line react-doctor/<rule> -- why` for native rules, or
  `jsx-a11y/<rule>` for a11y rules. Use `--explain <file:line>` to confirm a
  suppression applies.
- React Doctor's checks are separate from the gate: a 100 score does **not**
  mean `bun run test` passes (and the gate's typecheck is a no-op on the
  solution tsconfigs). Always run **both** `bun run test` and React Doctor.
- Config lives in **`doctor.config.json`** at the repo root. It ignores
  generated/vendored/non-React trees (`.design-sync`, `.ds-sync`, `ds-bundle`,
  `supabase/functions`) and the `deslop/unused-*` dead-code rules. Those
  dead-code rules are disabled because react-doctor's import analysis cannot
  resolve this repo's `@/` path alias, Vercel `api/` serverless entrypoints,
  Vitest manual mocks (`__mocks__`), `.mjs` build scripts, or shell-script CLI
  usage (e.g. `turbo-ignore` in `scripts/should-deploy.sh`, `lucide-static` in
  `apps/mobile/scripts/generate-tab-icons.mjs`) — so it reports those as
  "unused" false-positives. Circular-import detection stays on.
- **`react-doctor/no-impure-state-updater` is also ignored** (added 2026-07-13,
  react-doctor 0.7.7). The rule is meant to catch side effects inside a
  `setX(prev => …)` updater callback, but it fires on any plain event handler
  that calls a setter alongside anything else — e.g.
  `openDetailDrawer(view) { setDetailView(view); setIsDetailOpen(true); }`.
  Those handlers are typed `=> void` and are never passed to a setter, so they
  cannot be updaters; its own suggested remedy ("move this into the event
  handler") is already satisfied. It flagged 48 sites here, all false positives,
  while flagging none of the repo's ~49 real updater callbacks. **Re-check on
  each react-doctor upgrade** and drop the ignore once upstream fixes it.
