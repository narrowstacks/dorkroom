# PR Screenshots — Design

**Date:** 2026-07-13
**Status:** Approved, pending implementation

## Problem

PRs that change what the app renders — a calculator's visible output, a
component's layout, a theme token — ship without visual evidence. A reviewer
reading the diff has to imagine the result, and regressions in spacing, theme
contrast, or a calculator's displayed value pass unnoticed.

We want every PR that changes rendered output to carry before/after screenshots
of the affected routes, produced automatically, without committing binaries to
the repo.

## Goals

- A PR touching rendered UI or a calculator's visible output gets before/after
  screenshots in its description, without the author doing anything manual.
- Screenshots are hosted by GitHub, not committed to the repo.
- Non-visual PRs say so explicitly rather than silently omitting screenshots.

## Non-goals

- Pixel-diffing or automated visual regression assertions. This is evidence for
  a human reviewer, not a gate.
- Screenshotting the iOS app (`apps/mobile`). Web only.
- Running in CI. This runs locally, as part of opening the PR.

## Architecture

Three pieces, each independently useful:

1. `scripts/pr-screenshots.ts` — a Playwright capture driver. Pure mechanism:
   given a shot list and a base URL, it produces WebP files. Knows nothing
   about git, PRs, or diffs.
2. `.claude/skills/pr-screenshots/SKILL.md` — the workflow. Decides whether a
   change is visual, maps the diff to routes, authors the shot list, drives the
   two captures, delegates upload, and writes the PR body.
3. A **Pull Requests** section in `CLAUDE.md` making the screenshot step a
   standing rule for future PRs.

Hosting is solved by a trick borrowed from the installed
`github-upload-image-to-pr` skill: uploading an image to a PR's comment textarea
mints a persistent `https://github.com/user-attachments/assets/…` URL, and that
URL survives even if the comment is never submitted. So we upload, harvest the
URL, and clear the textarea without posting anything.

We *reimplement* that as `scripts/github-upload-attachment.ts` rather than
calling the skill, for two reasons. First, that skill lives in `.agents/skills/`
— an installer-managed tree governed by `skills-lock.json` — so it is not
repo-authored, can't be committed, and any local edit to it is clobbered on
reinstall. Second, it drives whatever browser the user happens to have open via
MCP, which is exactly the dependency that makes it unreliable. A script that
launches its own Playwright browser has neither problem.

### Component 1: `scripts/pr-screenshots.ts`

Follows the conventions already established by `scripts/screenshot-homepage.ts`:
Playwright `chromium`, viewport-only (not full-page) PNG buffer, `sharp` →
WebP at quality 90, `await page.evaluate(() => document.fonts.ready)` before
capture, theme forced via an init script that seeds
`localStorage['dorkroom-theme']` (the key read by
`packages/ui/src/contexts/theme-context.tsx`).

**Input** — a shot list JSON, passed by path:

```jsonc
{
  "baseUrl": "http://localhost:4200",
  "outDir": ".pr-screenshots/after",
  "shots": [
    // A bare route. Calculators have sensible defaults, so this already
    // renders a real calculation.
    { "id": "reciprocity", "route": "/reciprocity" },

    // A driven state, for error paths or specific inputs.
    {
      "id": "reciprocity-negative",
      "route": "/reciprocity",
      "viewport": "mobile",
      "theme": "high-contrast",
      "actions": [
        { "fill": "#duration", "value": "-5" },
        { "waitFor": "[role=alert]" }
      ]
    }
  ]
}
```

**Shot fields.** `id` (required, becomes the filename and the image's alt text),
`route` (required), `viewport` (`desktop` = 1280×918, `mobile` = 390×844;
default `desktop`), `theme` (one of the app's real themes — `light`, `dark`,
`darkroom`, `high-contrast`; default `dark`), `actions` (optional).

**Action vocabulary** — deliberately four verbs, no more. Anything needing more
than this should be a story for a human, not a screenshot.

| Action | Meaning |
|---|---|
| `{ "fill": <selector>, "value": <string> }` | Set an input's value |
| `{ "click": <selector> }` | Click an element |
| `{ "select": <selector>, "value": <string> }` | Choose a `<select>` option |
| `{ "waitFor": <selector> }` | Block until the element is visible |

**Output.** `<outDir>/<id>.webp`, plus a `manifest.json` listing each shot's id,
route, viewport, theme, and file path. The skill reads the manifest to pair
before/after shots by `id`.

**Failure behavior.** A shot whose `waitFor` times out or whose selector is
missing fails loudly — it writes no file, records the error in the manifest, and
the script exits non-zero at the end. A missing "before" shot is legitimate (new
page); a missing "after" shot means the shot list is wrong and the human needs
to know.

**Where output goes.** `.pr-screenshots/` at the repo root, added to
`.gitignore`. It must be *inside the repo*, not `/tmp`: MCP browser backends can
only read upload files within their configured workspace root, and a `/tmp` path
fails with `Access denied: path … is not within any of the configured workspace
roots`. (This is the same constraint `github-upload-image-to-pr` documents in
its Step 0.)

### Component 2: `.claude/skills/pr-screenshots/SKILL.md`

**Step 1 — Is this change visual?**

Visual if the diff touches any of:
- `apps/dorkroom/src/**` (routes, components, styles)
- `packages/ui/**` (shared components, theme tokens)
- a calculator hook in `packages/logic/**` whose result is displayed
  (`use-*-calculator.ts`, `use-light-meter-solver.ts`, and the
  `border-calculator/` directory)

Not visual if the diff only touches `api/`, `packages/api/**`, tests, configs,
docs, or CI. In that case, state in the PR description that the change has no
rendered output — do not silently omit the section.

**Step 2 — Map the diff to routes and author the shot list.**

Route files live in `apps/dorkroom/src/routes/` and map 1:1 to paths
(`reciprocity.tsx` → `/reciprocity`). A changed shared component or logic hook
maps to every route that consumes it; find consumers by grepping for the export.

Default matrix: **desktop × dark**, one shot per affected route.

Widen only for cause:
- Diff touches layout or responsive classes → add `mobile`.
- Diff touches theme tokens, colors, or a specific theme's stylesheet → add the
  affected theme(s), and only when the difference is notable enough to be worth
  a reviewer's attention. A change to `high-contrast` tokens gets a
  `high-contrast` shot, not all four themes.

Add an `actions` block only when the default state doesn't show the change —
error states, or a calculation that needs specific inputs.

**Step 3 — Capture "after".**

Start the dev server (`bun run dev`, port 4200) and run the driver against it
with `outDir: .pr-screenshots/after`.

**Step 4 — Capture "before".**

Create a `git worktree` at the merge-base (`git merge-base HEAD <base>`), which
never touches the working tree — no stashing, no risk of losing uncommitted
work. Install deps in the worktree, run its dev server on `PORT=4201`, capture
the same shot list to `.pr-screenshots/before`, then remove the worktree.

Two shortcuts, both explicit:
- A shot whose route or selector doesn't exist at the merge-base is a *new*
  page or control. It has no before. Record it as new; don't fail.
- `--before-url https://dorkroom.art` captures "before" from production instead
  of building the merge-base locally. Valid only when the PR's base is `main`
  and `main` is deployed — worth it because the worktree install is the slowest
  step in the whole flow.

**Step 5 — Upload.**

Run `scripts/github-upload-attachment.ts`, which returns
`user-attachments/assets/…` URLs.

**Playwright is the backend**, for the same reason the capture driver uses it: it
launches its own browser, needs no already-running Chrome, and can run headless.
That makes the whole flow one dependency (the `playwright` package already in
`devDependencies`) and one process the skill fully controls, rather than
something that only works when the user happens to have the right browser open
with the right MCP attached.

The catch is authentication — GitHub's upload endpoint needs a logged-in
session, and a fresh browser has none. Solve it with a **persistent user-data-dir**
(`chromium.launchPersistentContext('~/.dorkroom/gh-upload-profile')`):

- If the profile has no valid GitHub session, launch **headed**, navigate to
  `https://github.com/login`, and ask the user to log in once. The session
  persists in the profile.
- Every subsequent run launches **headless** against that profile and uploads
  without interaction.

The profile lives outside the repo and holds a real GitHub session, so treat it
like a credential: never commit it, never copy it into the repo tree.

If the script ever breaks (GitHub changes its markup), the installed
`github-upload-image-to-pr` skill documents the same mechanics for a
drive-the-browser-by-hand fallback.

**Step 6 — Embed.**

Append a `## Screenshots` section to the PR body via `gh pr edit`, as a table
pairing before and after by shot id:

```markdown
## Screenshots

### `/reciprocity` — desktop, dark

| Before | After |
|---|---|
| <img width="600" alt="reciprocity before" src="https://github.com/user-attachments/assets/…" /> | <img width="600" alt="reciprocity after" src="https://github.com/user-attachments/assets/…" /> |
```

New pages get a single-column **After** table with a note that the route is new.

### Component 3: `CLAUDE.md`

A new top-level **Pull Requests** section:

> Any PR that changes rendered output — a route, a shared component, a theme
> token, or a calculator's displayed result — must include before/after
> screenshots of the affected routes in its description. Use the
> `pr-screenshots` skill, which captures them and uploads them to GitHub
> without committing anything to the repo. If a PR has no rendered output, say
> so in the description rather than omitting the section.

## Two repo fixes this depends on

**1. `.gitignore` silently swallows new skills.** It blanket-ignores `.claude/*`
with no negations; the skills currently tracked (`ast-grep`, `pr`, …) survive
only because they predate that rule. A new skill added today is ignored, never
committed, and never reaches the team — which would defeat the entire point of
this work. Add negations for `.claude/skills/`, `agents/`, `hooks/`, and
`settings.json`, keeping `settings.local.json` and `worktrees/` ignored.

**2. That un-ignoring exposes vendored skill bundles to the linters.** oxlint and
Biome both honor `.gitignore`, so un-ignoring `.claude/skills/` puts vendored
files (e.g. `impeccable/scripts/live-browser.js`, ~13k lines) into their scope
and `bun run lint` starts failing. Exclude `.claude` explicitly in
`.oxlintrc.json` and `biome.json`.

Notably `doctor.config.json` needs *no* change — React Doctor scans workspace
packages, and `.claude` isn't one.

## Testing

The driver is a script with real I/O, so the test is a real run, not a unit
test:

1. On a branch with a known UI change, run the full skill and confirm the PR
   body renders both images.
2. Confirm `.pr-screenshots/` is gitignored and `git status` is clean afterward.
3. Confirm the merge-base worktree is removed even when capture fails (the
   script must clean up in a `finally`).
4. Confirm a non-visual diff (e.g. an `api/` change) is correctly skipped.
5. Confirm the upload runs headless on the second run — i.e. the persistent
   profile really did retain the GitHub session after the one headed login.

## Risks

- **The worktree install is slow.** Mitigated by `--before-url`, and by the fact
  that most PRs affect one or two routes.
- **`actions` selectors drift.** A shot list is written per-PR and thrown away,
  so drift is bounded — it can't rot the way a committed E2E suite does.
- **Upload depends on browser automation against GitHub's UI**, which changes
  occasionally. That fragility is inherited from `github-upload-image-to-pr`,
  which already documents the selectors and their fallbacks. Moving to a
  self-launched Playwright browser doesn't add fragility — it removes the
  separate failure mode of "the required MCP isn't attached right now".
- **The persistent profile can go stale** (session expires, GitHub forces
  re-auth). The skill must detect a logged-out profile and fall back to a headed
  login prompt rather than failing with an opaque upload error.
