# Homepage Screenshot + README Badge Sync Workflows — Design

**Date:** 2026-06-03
**Status:** Approved (pending spec review)

## Goal

Keep two things in `README.md` automatically in sync on relevant pushes to `main`:

1. **`resources/dorkroom-homepage.png`** (the hero image) — build & serve the app in
   CI, capture a fresh homepage screenshot, commit it back when it changes.
2. **Hardcoded shields.io version badges** — Version (CalVer), React, Tailwind, and
   TypeScript — regenerated from the installed dependency versions, committed back
   when they drift.

These run as **two separate workflows** so a pure dependency bump updates the badges
without paying for a full build + headless-browser run. Each commits independently.

## Decisions

- **Source of truth:** build & serve the just-pushed commit in CI and screenshot
  that — never the live site — so the image always matches the committed code.
- **Data:** allow live API calls to `https://dorkroom.art/api/*` during capture, so
  the shot matches what users see. (Acceptable dependency: API uptime during CI.)
- **Commit-back:** auto-commit the updated PNG directly to `main`.
- **Trigger:** push to `main` filtered to UI-affecting paths, plus `workflow_dispatch`.

## Components

### 1. `scripts/screenshot-homepage.ts`

A Playwright capture script, also runnable locally (`bun run scripts/screenshot-homepage.ts`).

- Launches headless Chromium.
- Target URL configurable via env (`SCREENSHOT_URL`, default `http://localhost:4300/`)
  so the same script works locally and in CI.
- Viewport **1280×918** (matches the current `resources/dorkroom-homepage.png`,
  `deviceScaleFactor: 1`).
- Navigates, waits for `networkidle` plus a homepage content selector to be visible,
  then captures the viewport (not full-page) to `resources/dorkroom-homepage.png`.
- Exits non-zero on navigation/timeout failure so CI fails loudly rather than
  committing a blank image.

### 2. `scripts/sync-readme-badges.ts`

A script (also runnable locally) that reads dependency versions and rewrites the four
hardcoded shields.io badge values in `README.md` in place. Each badge has a distinct
label + color, so regex replacement on the `badge/<Label>-<value>-<color>` segment is
unambiguous.

| Badge | Source (root `package.json`) | Rule |
|-------|------------------------------|------|
| `Version` | `version` | verbatim (CalVer, e.g. `2026.05.28`) |
| `React` | `dependencies.react` | major only (`19.2.3` → `19`) |
| `Tailwind` | `devDependencies.tailwindcss` | full `x.y.z`, strip leading `^`/`~` |
| `TypeScript` | `devDependencies.@typescript/native-preview` | `major.minor` + `_beta` (`7.0.0-dev…` → `7.0_beta`) |

- Source of truth is `package.json` (not `bun.lock`) — the declared versions.
- The script only writes when a value changes; idempotent.
- The dynamic badges (uptime, CI status, issues/PRs) fetch live and are left untouched.

### 3. `.github/workflows/homepage-screenshot.yml`

Heavy job (build + Chromium). Triggered only by changes that can affect how the
homepage *looks*.

```
name: Homepage Screenshot

on:
  push:
    branches: [main]
    paths:
      - apps/dorkroom/src/app/pages/home-page.tsx
      - apps/dorkroom/src/routes/index.tsx
      - packages/ui/**
      - scripts/screenshot-homepage.ts
      - .github/workflows/homepage-screenshot.yml   # first push adding this file runs it
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: homepage-screenshot-${{ github.ref }}
  cancel-in-progress: true

jobs:
  screenshot:
    runs-on: ubuntu-latest
    steps:
      - checkout (fetch-depth: 0)
      - setup node 22 + bun + caches      # mirror ci.yml
      - bun install --frozen-lockfile
      - bun run build
      - bunx playwright install --with-deps chromium
      - vite preview (apps/dorkroom, port 4300) in background; wait for port
      - bun run scripts/screenshot-homepage.ts
      - if resources/dorkroom-homepage.png changed:
          git add resources/dorkroom-homepage.png
          git commit -m "chore: update homepage screenshot [skip ci]"
          git push
```

### 4. `.github/workflows/sync-readme-badges.yml`

Lightweight job — no build, no browser. The script only reads `package.json` and
rewrites text, so it needs nothing installed beyond bun itself.

```
name: Sync README Badges

on:
  push:
    branches: [main]
    paths:
      - "**/package.json"                            # version/dep changes
      - scripts/sync-readme-badges.ts
      - .github/workflows/sync-readme-badges.yml     # first push adding this file runs it
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: sync-readme-badges-${{ github.ref }}
  cancel-in-progress: true

jobs:
  badges:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - uses: oven-sh/setup-bun@v2
      - bun run scripts/sync-readme-badges.ts
      - if README.md changed:
          git add README.md
          git commit -m "chore: sync README version badges [skip ci]"
          git push
```

### 5. Dependency

Add `playwright` to root `devDependencies` with a `^` range (dev-only tooling;
backstopped by the `bunfig.toml` `minimumReleaseAge` gate). Used only by the
screenshot workflow / script. The badge-sync script has no extra dependencies.

## Loop / noise prevention

- Both auto-commit messages contain `[skip ci]` so the bot commits do not re-trigger
  workflows. Note the badge commit only touches `README.md` and the screenshot commit
  only touches the PNG — neither matches the *other* workflow's path filter, so they
  cannot trigger each other either.
- Each commit step runs only when `git status --porcelain` shows its target file
  changed, so no-op runs push nothing.
- **Known risk (screenshot only):** PNG output may not be byte-identical across runs
  (font hinting / anti-aliasing) even when visually unchanged, producing noisy no-op
  commits. Start with exact byte-diff; if it proves noisy, switch to a pixel-diff
  threshold comparison before deciding whether to commit. Documented, not pre-built
  (YAGNI). Badge sync is pure text, so it is always deterministic.

## First-run guarantee

Each workflow includes its own file path in its `paths` filter, so the commit that
adds the workflow triggers its first run. `workflow_dispatch` on both is the manual
fallback.

## Out of scope

- Screenshots of pages other than the homepage.
- Multiple viewports / responsive captures.
- Pixel-diff thresholding (only added if exact-diff proves noisy).
