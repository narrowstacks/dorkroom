---
name: pr-screenshots
description: Capture before/after screenshots of visual changes and attach them to a PR. Use when opening a PR, or when asked to "add screenshots to the PR", "show what this looks like", "prove the UI change works", or "document this visually". Any PR that changes rendered output — a route, a shared component, a theme token, or a calculator's displayed result — needs these. Screenshots are uploaded to GitHub's CDN, never committed to the repo.
user_invocable: true
---

# PR Screenshots

A reviewer reading a diff has to imagine the result. Screenshots mean they don't
have to — and they catch the regressions a diff hides: a value that now renders
`NaN`, a card that lost its padding, a theme where the text went invisible.

Two scripts do the work:

- `scripts/pr-screenshots.ts` — captures a **shot list** against a running dev
  server, writes WebP files.
- `scripts/github-upload-attachment.ts` — uploads those files to GitHub and
  returns permanent `user-attachments/assets/…` URLs. Nothing lands in the repo.

## Step 1 — Decide whether the change is visual

**Visual** if the diff touches any of:

- `apps/dorkroom/src/**` — routes, components, styles
- `packages/ui/**` — shared components, theme tokens
- a calculator in `packages/logic/**` whose result is *displayed*:
  `use-*-calculator.ts`, `use-light-meter-solver.ts`, `border-calculator/`

**Not visual** if the diff only touches `api/`, `packages/api/**`, tests,
configs, docs, or CI.

If it isn't visual, say so in the PR description — one line, e.g. *"No rendered
output changes; no screenshots."* Don't just omit the section, or a reviewer
can't tell whether it was considered or forgotten.

## Step 2 — Map the diff to routes, write the shot list

Routes live in `apps/dorkroom/src/routes/` and map 1:1 to paths
(`reciprocity.tsx` → `/reciprocity`). For a changed shared component or logic
hook, grep for its consumers — every route that renders it is affected.

**Default matrix: desktop × dark, one shot per affected route.** Widen only for
cause:

| Diff touches | Add |
|---|---|
| layout / responsive classes | a `mobile` shot |
| theme tokens, colors, a theme's stylesheet | a shot in *that* theme (not all four) |
| an error path, or output that needs specific inputs | an `actions` block |

Themes are `light`, `dark`, `darkroom`, `high-contrast`. There is no `system` —
a screenshot must be deterministic.

Write the list to `.pr-screenshots/shots.json`:

```jsonc
{
  "shots": [
    // Bare route. Calculators have sensible defaults, so this already renders
    // a real calculation — no actions needed.
    { "id": "reciprocity", "route": "/reciprocity" },

    // A driven state, for an error path or specific inputs.
    {
      "id": "reciprocity-negative",
      "route": "/reciprocity",
      "actions": [
        { "fill": "#duration", "value": "-5" },
        { "waitFor": "[role=alert]" }
      ]
    }
  ]
}
```

Fields: `id` (required — becomes the filename and the image's alt text), `route`
(required), `viewport` (`desktop` | `mobile`, default `desktop`), `theme`
(default `dark`), `actions` (optional: `fill`, `click`, `select`, `waitFor`).

Keep it tight. Three or four shots that show the change beat twelve that bury
it.

## Step 3 — Capture "after"

**Never hardcode the dev server's port.** `@vercel/microfrontends` assigns it
(4503 at time of writing, not the 4200 in `vite.config.ts`) and increments when
that port is taken, so `PORT=…` does *not* override it. Always read the port
back from the server's own output:

```bash
bun run dev > /tmp/dr-after.log 2>&1 &
until grep -q 'Local:' /tmp/dr-after.log; do sleep 1; done
AFTER=$(grep -o 'http://localhost:[0-9]*' /tmp/dr-after.log | head -1)

bun run scripts/pr-screenshots.ts .pr-screenshots/shots.json \
  --base-url "$AFTER" --out-dir .pr-screenshots/after
```

If a shot fails here, the shot list is wrong — a bad selector, a route that
doesn't exist. Fix it; don't ship a PR with a missing screenshot.

## Step 4 — Capture "before"

The "before" state is the merge-base, not your working tree. Get it from a
worktree, which never touches your working tree — no stashing, nothing to lose.
Leave the "after" server running: the second one auto-picks the next free port,
which you read back the same way.

```bash
BASE=$(git merge-base HEAD origin/main)
git worktree add /tmp/dr-before "$BASE"
(cd /tmp/dr-before && bun install && bun run dev > /tmp/dr-before.log 2>&1 &)
until grep -q 'Local:' /tmp/dr-before.log; do sleep 1; done
BEFORE=$(grep -o 'http://localhost:[0-9]*' /tmp/dr-before.log | head -1)

bun run scripts/pr-screenshots.ts .pr-screenshots/shots.json \
  --base-url "$BEFORE" --out-dir .pr-screenshots/before

git worktree remove --force /tmp/dr-before
```

**Always remove the worktree**, including when capture fails.

Two things to know:

- **A failed "before" shot is often correct.** A route or selector that doesn't
  exist at the merge-base means the UI is *new*. Read
  `.pr-screenshots/before/manifest.json`, confirm the failure is "this didn't
  exist yet", and give that shot an after-only entry in the table.
- **Shortcut:** if the PR's base is `main`, `--base-url https://dorkroom.art`
  captures "before" from production and skips the worktree install entirely —
  by far the slowest step. Only valid when `main` is deployed and current.

## Step 5 — Upload

First run only, to save a GitHub session into a persistent browser profile:

```bash
bun run scripts/github-upload-attachment.ts --login
```

That opens a headed browser; log in once. The profile lives at
`~/.dorkroom/gh-upload-profile`, outside the repo — it holds a real session, so
treat it as a credential. Every run after that is headless:

```bash
bun run scripts/github-upload-attachment.ts --pr <number> \
  .pr-screenshots/before/*.webp .pr-screenshots/after/*.webp
```

It prints `{"<path>": "<url>"}`. If it reports you're not logged in, the session
expired — re-run `--login`.

<details>
<summary>Why a browser at all?</summary>

GitHub has no upload API. But dropping a file on a comment box uploads it
immediately and returns a permanent `user-attachments/assets/…` URL — and that
URL survives even if the comment is never submitted. So the script uploads,
harvests the URLs, and clears the box without posting anything. This is exactly
what happens when a human drags an image into a PR.
</details>

## Step 6 — Embed in the PR

Append a `## Screenshots` section with `gh pr edit`, pairing before and after by
shot id:

```markdown
## Screenshots

### `/reciprocity` — desktop, dark

| Before | After |
|---|---|
| <img width="500" alt="reciprocity before" src="https://github.com/user-attachments/assets/…" /> | <img width="500" alt="reciprocity after" src="https://github.com/user-attachments/assets/…" /> |
```

New UI has no before — use a single **After** column and say the route is new.
Group by route, and put the shot that best shows the change first.

## Step 7 — Clean up

`.pr-screenshots/` is gitignored, but confirm `git status` is clean before
committing. Nothing from this flow belongs in a commit.
