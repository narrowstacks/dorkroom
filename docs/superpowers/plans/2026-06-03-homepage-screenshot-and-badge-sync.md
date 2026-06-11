# Homepage Screenshot + README Badge Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two GitHub Actions that, on relevant pushes to `main`, regenerate the README homepage screenshot and keep the hardcoded shields.io version badges in sync with installed dependency versions.

**Architecture:** A heavy `homepage-screenshot` workflow builds + serves the app and captures a Playwright screenshot; a lightweight `sync-readme-badges` workflow rewrites four badge values from `package.json`. Each is driven by its own path filter, commits only its own file with `[skip ci]`, and self-triggers on first push. The badge-rewrite logic is a pure, unit-tested function; the screenshot script is verified by running it.

**Tech Stack:** Bun, Playwright (Chromium), Vite preview, Vitest, GitHub Actions.

---

## File Structure

- `scripts/screenshot-homepage.ts` — **create.** Playwright capture; reads `SCREENSHOT_URL` env, writes `resources/dorkroom-homepage.png` at 1280×918. Runnable locally and in CI.
- `scripts/sync-readme-badges.ts` — **create.** Exports pure `deriveBadgeValues(pkg)` and `applyBadgeUpdates(readme, values)`; a `import.meta.main`-guarded runner reads root `package.json`, rewrites `README.md`. No runtime deps.
- `scripts/__tests__/sync-readme-badges.test.ts` — **create.** Unit tests for the two pure functions.
- `vitest.config.ts` — **modify.** Add the scripts test glob to the `serverless` project `include`.
- `.github/workflows/homepage-screenshot.yml` — **create.** Heavy build+screenshot workflow.
- `.github/workflows/sync-readme-badges.yml` — **create.** Light badge-sync workflow.
- `package.json` (root) — **modify.** Add `playwright` devDependency.
- `CLAUDE.md` — **modify.** Note that badges/screenshot are now auto-maintained.

Verified facts this plan relies on:
- Root `package.json`: `version` `2026.05.28`, `dependencies.react` `19.2.3`, `devDependencies.tailwindcss` `4.3.0`, `devDependencies["@typescript/native-preview"]` `7.0.0-dev.20260421.2`.
- `apps/dorkroom/vite.config.ts` sets `preview.port: 4300`, `preview.host: 'localhost'`, no `base`, build `outDir: './dist'`.
- Homepage hero element has class `hero-card` (stable wait selector).
- Current `resources/dorkroom-homepage.png` is 1280×918.
- README badge segments (line 9 and 11): `badge/Version-2026.05.28-red`, `badge/React-19-61DAFB`, `badge/TypeScript-7.0_beta-3178C6`, `badge/Tailwind-4.3.0-06B6D4`.

---

## Task 1: Add Playwright dependency

**Files:**
- Modify: `package.json` (root, `devDependencies`)

- [ ] **Step 1: Add playwright to root devDependencies**

Run from repo root (the `--minimum-release-age 0` bypasses the 7-day `bunfig.toml` gate only if the latest playwright is newer than 7 days; drop the flag if install succeeds without it):

```bash
bun add -D playwright
```

If the install is blocked by `minimumReleaseAge`, instead run:

```bash
bun add -D playwright --minimum-release-age 0
```

- [ ] **Step 2: Verify it resolved with a caret range**

Run: `grep '"playwright"' package.json`
Expected: a line like `"playwright": "^1.x.x"` under `devDependencies`.

- [ ] **Step 3: Install the Chromium browser locally (for local script runs)**

Run: `bunx playwright install chromium`
Expected: downloads/installs Chromium without error.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add playwright for homepage screenshot script"
```

---

## Task 2: Badge value derivation (pure function, TDD)

**Files:**
- Create: `scripts/sync-readme-badges.ts`
- Create: `scripts/__tests__/sync-readme-badges.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Wire the scripts test glob into the serverless vitest project**

In `vitest.config.ts`, add one entry to the `serverless` project's `include` array. The array currently ends with `'utils/__tests__/routeMetadata.{test,spec}.ts',`. Add after it:

```ts
            'scripts/__tests__/*.{test,spec}.ts',
```

- [ ] **Step 2: Write the failing test for `deriveBadgeValues`**

Create `scripts/__tests__/sync-readme-badges.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyBadgeUpdates, deriveBadgeValues } from '../sync-readme-badges';

describe('deriveBadgeValues', () => {
  it('extracts CalVer, React major, full Tailwind, and TS major.minor + _beta', () => {
    const pkg = {
      version: '2026.05.28',
      dependencies: { react: '19.2.3' },
      devDependencies: {
        tailwindcss: '4.3.0',
        '@typescript/native-preview': '7.0.0-dev.20260421.2',
      },
    };
    expect(deriveBadgeValues(pkg)).toEqual({
      version: '2026.05.28',
      react: '19',
      tailwind: '4.3.0',
      typescript: '7.0_beta',
    });
  });

  it('strips leading ^ and ~ from ranges', () => {
    const pkg = {
      version: '2026.06.03',
      dependencies: { react: '^20.0.1' },
      devDependencies: {
        tailwindcss: '~4.5.0',
        '@typescript/native-preview': '7.1.0-dev.1',
      },
    };
    expect(deriveBadgeValues(pkg)).toEqual({
      version: '2026.06.03',
      react: '20',
      tailwind: '4.5.0',
      typescript: '7.1_beta',
    });
  });
});

describe('applyBadgeUpdates', () => {
  const readme = [
    '![Version](https://img.shields.io/badge/Version-2026.05.28-red)',
    '![React 19](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-7.0_beta-3178C6) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.0-06B6D4)',
  ].join('\n');

  it('rewrites only the four target badge values', () => {
    const out = applyBadgeUpdates(readme, {
      version: '2026.06.03',
      react: '20',
      tailwind: '4.5.0',
      typescript: '7.1_beta',
    });
    expect(out).toContain('badge/Version-2026.06.03-red');
    expect(out).toContain('badge/React-20-61DAFB');
    expect(out).toContain('badge/TypeScript-7.1_beta-3178C6');
    expect(out).toContain('badge/Tailwind-4.5.0-06B6D4');
    expect(out).not.toContain('2026.05.28');
    expect(out).not.toContain('7.0_beta');
  });

  it('is a no-op when values already match', () => {
    const out = applyBadgeUpdates(readme, {
      version: '2026.05.28',
      react: '19',
      tailwind: '4.3.0',
      typescript: '7.0_beta',
    });
    expect(out).toBe(readme);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bunx vitest run --config vitest.config.ts scripts/__tests__/sync-readme-badges.test.ts`
Expected: FAIL — `Failed to resolve import "../sync-readme-badges"` (module not yet created).

- [ ] **Step 4: Implement `scripts/sync-readme-badges.ts`**

Create `scripts/sync-readme-badges.ts`:

```ts
/**
 * Sync hardcoded shields.io version badges in README.md with installed
 * dependency versions. Usage: bun run scripts/sync-readme-badges.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface BadgeValues {
  version: string;
  react: string;
  tailwind: string;
  typescript: string;
}

interface PackageJson {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const stripRange = (v: string): string => v.replace(/^[\^~]/, '');

export function deriveBadgeValues(pkg: PackageJson): BadgeValues {
  const react = stripRange(pkg.dependencies?.react ?? '');
  const tailwind = stripRange(pkg.devDependencies?.tailwindcss ?? '');
  const tsRaw = stripRange(
    pkg.devDependencies?.['@typescript/native-preview'] ?? ''
  );
  // '7.0.0-dev.20260421.2' -> base '7.0.0' -> major.minor '7.0' -> '7.0_beta'
  const [tsMajor, tsMinor] = tsRaw.split('-')[0].split('.');
  return {
    version: pkg.version,
    react: react.split('.')[0],
    tailwind,
    typescript: `${tsMajor}.${tsMinor}_beta`,
  };
}

export function applyBadgeUpdates(readme: string, v: BadgeValues): string {
  // Each badge value segment is `[^-]+` between the label and the trailing
  // color, so it stops at the color separator and never spans badges.
  const replacements: Array<[RegExp, string]> = [
    [/badge\/Version-[^-]+-red/g, `badge/Version-${v.version}-red`],
    [/badge\/React-[^-]+-61DAFB/g, `badge/React-${v.react}-61DAFB`],
    [/badge\/TypeScript-[^-]+-3178C6/g, `badge/TypeScript-${v.typescript}-3178C6`],
    [/badge\/Tailwind-[^-]+-06B6D4/g, `badge/Tailwind-${v.tailwind}-06B6D4`],
  ];
  return replacements.reduce((acc, [re, to]) => acc.replace(re, to), readme);
}

async function main(): Promise<void> {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8')
  ) as PackageJson;
  const readmePath = join(root, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  const updated = applyBadgeUpdates(readme, deriveBadgeValues(pkg));
  if (updated !== readme) {
    await writeFile(readmePath, updated);
    console.log('README badges updated.');
  } else {
    console.log('README badges already in sync.');
  }
}

// Bun sets import.meta.main for the entry module; under Vitest (node) it is
// undefined, so importing this file in tests does not run main().
if (import.meta.main) {
  await main();
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bunx vitest run --config vitest.config.ts scripts/__tests__/sync-readme-badges.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Smoke-test the runner against the real README (should be a no-op today)**

Run: `bun run scripts/sync-readme-badges.ts`
Expected: prints `README badges already in sync.` and `git status` shows no change to `README.md`.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-readme-badges.ts scripts/__tests__/sync-readme-badges.test.ts vitest.config.ts
git commit -m "feat: add README badge sync script"
```

---

## Task 3: Homepage screenshot script

**Files:**
- Create: `scripts/screenshot-homepage.ts`

This script drives a real browser, so it is verified by running it against the live preview rather than by a unit test.

- [ ] **Step 1: Implement `scripts/screenshot-homepage.ts`**

Create `scripts/screenshot-homepage.ts`:

```ts
/**
 * Capture the homepage screenshot used in README.md.
 * Usage: SCREENSHOT_URL=http://localhost:4300/ bun run scripts/screenshot-homepage.ts
 * Requires a running server (vite preview or dev) at SCREENSHOT_URL.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WIDTH = 1280;
const HEIGHT = 918;
const url = process.env.SCREENSHOT_URL ?? 'http://localhost:4300/';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'resources', 'dorkroom-homepage.png');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  console.log(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // Wait for the hero card (stable homepage element) and web fonts.
  await page
    .locator('.hero-card')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outPath }); // viewport-only, not full page
  console.log(`Saved ${outPath}`);
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Build the app so a preview server has something to serve**

Run: `bun run build`
Expected: completes; `apps/dorkroom/dist` now exists.

- [ ] **Step 3: Start the preview server in the background**

Run:
```bash
(cd apps/dorkroom && bunx vite preview) &
```
Then wait until it responds:
```bash
until curl -sf http://localhost:4300/ >/dev/null; do sleep 1; done; echo "up"
```
Expected: prints `up` (server listening on 4300).

- [ ] **Step 4: Run the screenshot script and verify output**

Run: `bun run scripts/screenshot-homepage.ts`
Expected: prints `Saved .../resources/dorkroom-homepage.png`.

Then verify dimensions:
Run: `file resources/dorkroom-homepage.png`
Expected: `PNG image data, 1280 x 918`.

Stop the preview server:
Run: `kill %1` (or `pkill -f 'vite preview'`).

- [ ] **Step 5: Review the regenerated image visually**

Open `resources/dorkroom-homepage.png` and confirm it shows the homepage hero + calculator cards (not a blank/loading state). If it looks wrong, the wait selector or timeout needs adjustment before proceeding.

- [ ] **Step 6: Commit (script + any legitimately refreshed image)**

```bash
git add scripts/screenshot-homepage.ts resources/dorkroom-homepage.png
git commit -m "feat: add homepage screenshot script"
```

If the PNG is byte-identical, just commit the script:
```bash
git add scripts/screenshot-homepage.ts
git commit -m "feat: add homepage screenshot script"
```

---

## Task 4: Homepage screenshot workflow

**Files:**
- Create: `.github/workflows/homepage-screenshot.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/homepage-screenshot.yml`:

```yaml
name: Homepage Screenshot

on:
  push:
    branches: [main]
    paths:
      - apps/dorkroom/src/app/pages/home-page.tsx
      - apps/dorkroom/src/routes/index.tsx
      - packages/ui/**
      - scripts/screenshot-homepage.ts
      - .github/workflows/homepage-screenshot.yml
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
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build app
        run: bun run build

      - name: Install Chromium
        run: bunx playwright install --with-deps chromium

      - name: Start preview server
        run: |
          (cd apps/dorkroom && bunx vite preview) &
          until curl -sf http://localhost:4300/ >/dev/null; do sleep 1; done
          echo "preview up"

      - name: Capture homepage screenshot
        env:
          SCREENSHOT_URL: http://localhost:4300/
        run: bun run scripts/screenshot-homepage.ts

      - name: Commit updated screenshot
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if [ -n "$(git status --porcelain resources/dorkroom-homepage.png)" ]; then
            git add resources/dorkroom-homepage.png
            git commit -m "chore: update homepage screenshot [skip ci]"
            git push
          else
            echo "Screenshot unchanged; nothing to commit."
          fi
```

- [ ] **Step 2: Lint the YAML**

Run: `bunx yaml-lint .github/workflows/homepage-screenshot.yml 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/homepage-screenshot.yml')); print('valid yaml')"`
Expected: prints `valid yaml` (or yaml-lint reports no errors).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/homepage-screenshot.yml
git commit -m "ci: add homepage screenshot workflow"
```

---

## Task 5: Badge sync workflow

**Files:**
- Create: `.github/workflows/sync-readme-badges.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/sync-readme-badges.yml`:

```yaml
name: Sync README Badges

on:
  push:
    branches: [main]
    paths:
      - "**/package.json"
      - scripts/sync-readme-badges.ts
      - .github/workflows/sync-readme-badges.yml
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
      - name: Checkout code
        uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Sync badges
        run: bun run scripts/sync-readme-badges.ts

      - name: Commit updated README
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if [ -n "$(git status --porcelain README.md)" ]; then
            git add README.md
            git commit -m "chore: sync README version badges [skip ci]"
            git push
          else
            echo "Badges unchanged; nothing to commit."
          fi
```

- [ ] **Step 2: Lint the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/sync-readme-badges.yml')); print('valid yaml')"`
Expected: prints `valid yaml`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-readme-badges.yml
git commit -m "ci: add README badge sync workflow"
```

---

## Task 6: Document the automation

**Files:**
- Modify: `CLAUDE.md` (Versioning section)

- [ ] **Step 1: Update the Versioning section note**

In `CLAUDE.md`, the Versioning section currently says badges are updated manually. Find:

```
- When pushing to main, update all `package.json` versions and the README badge to the current date
```

Replace with:

```
- When pushing to main, update all `package.json` versions to the current date. The README version badge (and React/Tailwind/TypeScript badges) are auto-synced from `package.json` by the `Sync README Badges` workflow — do not hand-edit them. The homepage screenshot in the README is auto-regenerated by the `Homepage Screenshot` workflow.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note auto-maintained README badges and screenshot"
```

---

## Post-implementation verification

- [ ] **Run the full quality gate**

Run: `bun run test`
Expected: lint, unit tests (including the new badge tests), build, and typecheck all pass.

- [ ] **Run formatting**

Run: `bun run format`

---

## Notes / risks (read before/after merge)

- **Branch protection on `main`:** both workflows push to `main` using the default
  `GITHUB_TOKEN` with `contents: write`. If `main` requires PRs or status checks for
  all actors, these pushes will be rejected. Mitigations, in order of preference:
  (a) allow the `github-actions[bot]` actor / mark these workflows' commits as exempt,
  or (b) switch the commit step to open a PR instead of pushing. Confirm the push
  works on the first real run; if it 403s, this is why.
- **No-op screenshot commits:** if the PNG renders with non-deterministic anti-aliasing
  and produces noisy commits, switch the screenshot commit gate from exact byte-diff to
  a pixel-diff threshold (e.g. `pixelmatch`) before deciding to commit. Not built now
  (YAGNI) — see the design spec.
- **`vite preview` host:** the app config pins preview to `localhost:4300`; the workflow
  waits on that exact URL. If the preview port ever changes in `vite.config.ts`, update
  both the workflow wait-loop and `SCREENSHOT_URL` (and the script default).
