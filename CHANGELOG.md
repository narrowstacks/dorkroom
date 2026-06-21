# Changelog

All notable changes to Dorkroom.art are documented here.

This project uses [CalVer](https://calver.org/) date-based versioning: `YYYY.MM.DD`.

## [2026.06.21]

### Added

- `@dorkroom/mobile`: iOS app scaffold (Expo Router, NativeWind v4, iOS 26
  Liquid Glass) with native border, exposure, reciprocity, and resize
  calculators reusing `@dorkroom/logic` and `@dorkroom/api`.

## [2026.06.13]

### Added

- The Fumadocs documentation site is now served at `dorkroom.art/docs` (same origin as the app) via Vercel Microfrontends. The docs project (`dorkroom-docs`) is a child app that owns `/docs/*`, plus its supporting paths `/api/search` (Fumadocs search), `/og/docs/*` (social images), and `/llms-full.txt`; the SPA remains the default app. Routing lives in `apps/dorkroom/microfrontends.json`, and the `@vercel/microfrontends` Vite plugin scopes the default app's assets under the group. The plugin is build-only (skipped under Vitest)

### Changed

- The `Docs` nav entry (desktop dropdown and mobile sidebar) now performs a full-document navigation instead of client-side routing, so the edge can route `/docs` to the docs microfrontend instead of the SPA rendering a not-found page

### Removed

- The placeholder SPA `/docs` route (`apps/dorkroom/src/routes/docs.tsx`) — `/docs` is now served by the docs app at the edge

## [2026.06.12]

### Added

- Fraunces display typeface (`@fontsource-variable/fraunces`) for the "Dorkroom.art" hero wordmark and the nav title, exposed via a new `--font-family-display` theme token
- Two off-center setups in the home-page border-calculator preview (6×6 shifted, 4×5 shifted), demonstrating asymmetric easel-blade positioning via the same `bordersFromGaps`/`bladeReadings` helpers the calculator uses (offsets are 0.125″ multiples, so blade readings stay on the quarter-inch grid). Preview transitions tightened: morph `1000ms → 700ms`, dwell `5000ms → 4000ms`

### Changed

- Dark-theme home backdrop is now a "darkroom safelight": warm red/peach light bleeding from the edges into near-black (`#070708`) with a fine SVG film-grain overlay
- Border-calculator paper/print/blade colors retuned for the dark theme — muted grey paper (`#6a6868`), darker print area (`#353535`), near-black easel blades (`#1b1b1d`)
- Hero "Dorkroom.art" wordmark restyled: white grain fill with a grainy red glow behind the letters, set in Fraunces at a larger scale. Theme-aware — dark grain + soft warm glow on light, solid two-tone (no grain/glow) on darkroom and high-contrast. Nav "Dorkroom" now uses Fraunces as well

### Fixed

- Mobile Safari: opening the floating navigation menu no longer leaves a frozen background-colored block over the bottom (and top) of the page that persisted until reload. The menu's backdrop and drawer now unmount when closed (via a new `usePresence` hook, extracted with the FAB into a `MobileNav` component) so iOS WebKit can't retain a stale composited tile behind the dynamic toolbar. The `theme-color` meta now tracks the active theme, so the status-bar/toolbar bands match the page background instead of a hardcoded near-black
- Darkroom theme: the home hero box renders as plain black (film-grain texture removed), and the stray red stroke framing the border-calculator preview (and its caption) is gone in both darkroom and high-contrast — it came from the `main a[href*="/border"]` button-border rule catching the preview link. The primary "Calculate darkroom easel borders" CTA icon is now black instead of blending into the red button
- Homepage Screenshot CI workflow: the capture script waited on a `.hero-card` element that the home-UX refresh removed, timing out on every run — updated to the current `.hero-grain` hero panel
- Home border-calculator preview no longer shifts vertically as it cycles setups: the caption shared a flex row with the "Border calculator" link, leaving the variable-length `{label} on 8×10 paper · blades at {readout}` text only ~250px, so shorter setups sat on one line while longer ones wrapped to two (a ~16px jump every cycle). The caption now takes its own full-width line with `truncate`, locking its height to a single line for every setup (the longest, 254px, still fits the 263px `md` column without clipping)
- Home stats line no longer orphans "23 developers" onto a second line on mobile: the `1,020 development recipes · 165 film stocks · 23 developers` row now stacks one stat per line (bullets hidden) below `sm`, reverting to the inline bulleted row from `sm` up

## [2026.06.11]

### Added

- Legacy-browser support for the app via `@vitejs/plugin-legacy`, targeted at the Kindle Experimental Browser (WebKit ~2009 / Safari 4–5 era, ES5-only, no native `Promise`). The plugin emits a second `nomodule` bundle fully down-levelled to ES5 with core-js + `regenerator-runtime` polyfills, loaded via SystemJS. Modern browsers are unaffected: they load the same oxc-minified ES-module bundle as before and never request the `nomodule` chunks (the modern `build.minify: 'oxc'` config is preserved; only the separate legacy chunks use terser). The legacy `targets` use an `ie >= 11` floor specifically to force full ES5 transpilation — the original `['defaults', 'not IE 11']` left arrow functions, `const`/`let`, optional chaining, and `Promise` usage in the "legacy" bundle, which the Kindle engine cannot parse
- `bun run verify:legacy` and `scripts/verify-legacy-build.ts`: a headless-Chromium check (Playwright) that builds the app and asserts both paths — the modern context loads only the modern `index-*.js` module bundle and requests no legacy/polyfill chunk (modern-regression guard), and a forced-`nomodule` context boots the ES5 bundle via SystemJS and renders the app with no console/page errors

### Changed

- Coordinated TanStack Store/Form bump: upgraded `@tanstack/react-store` `^0.8.0` → `^0.11.0` and `@tanstack/react-form` `^1.27.7` → `^1.33.0` together so a single `@tanstack/store@0.11.0` resolves across both. The standalone Dependabot bump of `@tanstack/react-store` to 0.11 (PR #89) did not compile: 0.11 ships a newer `@tanstack/store` whose `Store`/`Derived` interface requires a `get()` method, while the older `@tanstack/react-form` pinned an older `@tanstack/store` whose `Derived` (e.g. `form.store`) lacked it — two incompatible `@tanstack/store` interfaces typed `useStore(form.store, selector)` state as `unknown` and produced ~40 build errors in the border-calculator components. `react-form@1.33.0` depends on `react-store@^0.11.0` and `form-core@1.33.0` (`@tanstack/store@^0.11.0`), so the coordinated bump resolves a single compatible store with no `overrides` and no consuming-code changes
- Restored React Doctor health to 100/100 across all projects: replaced barrel-file imports with direct module imports in `film-filters-panel` (`../filters/*`) and `film-detail-panel` (`../detail-panel/detail-panel`) for better tree-shaking, and suppressed the `no-barrel-import` finding in `@dorkroom/api`'s `index.test.ts` (the barrel re-export is that suite's subject under test)
- Bumped the TypeScript 7 native preview (`tsgo`) compiler from `7.0.0-dev.20260421.2` to `7.0.0-dev.20260604.1` (the typecheck/build toolchain). Chose a snapshot ≥7 days old so it clears the `bunfig.toml` `minimumReleaseAge` soak gate; full gate (typecheck + build + test) passes clean. Stable TypeScript 7 has not shipped yet, so the preview pin remains

### Fixed

- Print Resize Calculator (`/resize`) crashed on load with `useMeasurementConverter is not defined`: the hook was imported as `type`-only but called at runtime, so the import was erased from the compiled page. Made it a value import

## [2026.05.28]

### Added

- Mat Cut Calculator (`/mat`): plan single-window mats with independent borders, get exact window openings, best-fit borders for artwork, and mat cutter guide-bar settings
- Fraction-aware inputs that accept decimals or fractions and step by 1/16" via arrow keys or tap steppers (mobile-friendly)
- To-scale mat layout diagram with dimensioned borders, window, and artwork footprint
- Tests for the mat calculator logic, the fraction input field, and the page

### Changed

- Upgraded the build/test toolchain to latest stable (>7-day-old) releases: Vite 8.0.14 (Rolldown/Oxc bundler), Vitest 4.1.7 (with `@vitest/ui` and `@vitest/coverage-v8`), jsdom 29.1.1, `@vitejs/plugin-react` 6.0.2, Tailwind CSS 4.3.0, `@babel/core` 7.29.0, `turbo-ignore` 2.9.14, and `@types/jsdom` 28.0.3
- Adopted the TypeScript 7 beta (`@typescript/native-preview`, the native `tsgo` compiler) for package typecheck and build — ~3.5× faster full-repo typecheck. TS 7 removed `baseUrl`, so `tsconfig.base.json` now uses relative path mappings; the `typescript` package is retained for editor/Vite/Vitest type services
- Switched the test DOM environment from jsdom to happy-dom 20.9.0 — ~30% faster full suite (jsdom 29 environment init was the bottleneck; pool/isolation tuning had no effect). jsdom is retained for two logic tests that construct `JSDOM` directly
- Migrated console/debugger stripping from the removed `esbuild.drop` option to Rolldown's `build.rollupOptions.output.minify.compress` options (Vite 8)
- Moved `pool`/`reporters` to the root Vitest config (now root-only in Vitest 4) and renamed the deprecated `TanStackRouterVite` plugin import to `tanstackRouter`

### Fixed

- Film database page (and any page with a text input) failing to load in the dev server after the Vite 7.3.2 bump — a dev-only regression in Vite's bundled `postcss-modules` loader; converted the lone CSS module to Tailwind classes to remove the affected code path
- "Failed to fetch dynamically imported module" errors after a deploy — added a `vite:preloadError` handler that reloads once to pick up the current chunk hashes, plus `Cache-Control` headers in `vercel.json` (immutable for hashed `/assets/*`, revalidate-always for the HTML shell) so returning visitors get current chunk references

### Security

- Bumped Vite to 7.3.2 to resolve three dev-server advisories (GHSA-p9ff-h696-f583, GHSA-v2wj-q39q-566r, GHSA-4w7w-66w2-5vf9); added a `vite` override to dedupe the transitive test-only copy (subsequently bumped to Vite 8.0.14, see Changed)
- Added a `bunfig.toml` `install.minimumReleaseAge` gate (7 days) so Bun refuses npm versions published in the last week, reducing exposure to freshly-published malicious releases

## [2026.03.27]

### Added

- Film alias resolver for mapping legacy slugs to current films with O(1) lookups
- Rebrand tracking: films now display their base/OEM film in the detail panel
- Stats API endpoint for database counts (films, developers, combinations)
- Input sanitization (`sanitizeSlug`, `sanitizeQuery`) on Vercel edge functions
- Planning doc for server-side recipe filtering (`docs/planning/server-side-recipe-filtering.md`)

### Changed

- Film search now normalizes punctuation and tightens matching for better results
- Removed dead `fuzzy` parameter branches from edge functions
- Overrode Supabase default 1000-row limit on combinations endpoint
- Development recipe hook uses alias-aware slug resolution for film lookups

### Fixed

- Removed fragile slug-to-title formatting from film cards (rebrand info shown only in detail panel where proper film data is available)
- Added dev-mode warning for alias conflicts in `buildFilmSlugIndex`
- Removed redundant `fetchStats` export from API client

## [2026.02.27]

### Added

- Dynamic OG images for shared border calculator presets showing preset name, paper size, and print area
- Border preset sharing URLs now use query params (`?preset=`) instead of URL hash for bot/crawler visibility
- Per-route accent colors for OG social preview images (green, cyan, coral, lime, purple)
- Developer-only OG card variant showing developer name and dilution pills
- Film + developer search OG card variant (clean title + subtitle, no recipe details)
- Specific recipe OG card with full detail pills (time, temp, ISO, push/pull)
- Dynamic metadata for developer-only URLs (`/development?developer=slug`)
- Public API docs endpoint at `api.dorkroom.art/` via `api/docs.ts`
- Shared API utilities: `utils/withHandler.ts` and `utils/timeoutSignal.ts`
- Unkey integration for API key verification (`X-API-Key`) and anonymous rate limiting
- New environment variables for Unkey (`UNKEY_ROOT_KEY`, `UNKEY_API_ID`)
- Programmatic Unkey key tier management CLI (`bun run keys:create`, `bun run keys:tier`)
- Programmatic anonymous namespace bootstrap/check CLI (`bun run keys:anon-bootstrap`) using `UNKEY_ROOT_KEY`

### Changed

- Redesigned OG image layout: accent-colored icon circles with glow, colored category labels with divider bars, tinted detail pills, subtler site name
- OG dilution display now uses `name` field with `ratio` fallback (fixes blank pills for developers with null ratios)
- Refactored API handlers (`films`, `developers`, `combinations`, `filmdev`) to use shared wrapper logic
- Updated CORS allow headers to include `X-API-Key`
- Added host-based Vercel route to serve docs on `api.dorkroom.art`
- Bumped CalVer package versions to `2026.02.27`
- Anonymous rate-limit handling now degrades gracefully if namespace auto-create permission is missing
- Hardened host detection for auth mode selection and added required key permission verification (`UNKEY_API_KEY_PERMISSION`)
- Hardened API wrapper security: exact host allowlisting, safer client IP extraction, production fail-closed on Unkey anonymous rate-limit permission misconfiguration, and removed internal/upstream error detail leakage in responses
- Added `Vary: Host, X-API-Key` and disabled caching for keyed public API responses to prevent cross-request cache replay on `api.dorkroom.art`
- Unkey key-creation CLI now defaults key prefixes by tier (`free -> dk_f_`, `standard -> dk_s_`, `partner -> dk_e_`)

## [2026.02.14]

### Added

- Camera Exposure Calculator with EV calculation, equivalent exposures, and exposure comparison
- Lens Equivalency Calculator for comparing focal lengths across formats
- Right-side sidebar for mobile navigation

### Changed

- Improved responsive layouts across all calculator pages
- Updated postcard paper size to 3 7/8 x 5 7/8 in
- Concise CLAUDE.md documentation replacing verbose version

### Fixed

- Resize calculator mobile overflow
- Resize calculator now properly switches modes and allows for input number changes
- Card badge alignment and tooltip accessibility
- Console/debugger stripping restored for production builds
- Resolved 150+ lint warnings across the codebase

### Removed

- E2E tests, Playwright, and Chromatic (simplified CI pipeline)

## [2025.12.23]

### Added

- Film Database page with search, filtering, and detail panels
- Volume mixer and temperature warnings in recipe details
- Push/pull calculations and display in recipe components
- FilmDev.org import with push/pull detection and source tracking
- URL sync for selected recipes
- Confirmation modal for recipe deletes
- CI optimizations: caching, path filtering, deploy skip for docs-only changes
- Enhanced SEO metadata across all routes
- Navigation tooltips and new links
- Open source collaboration files (Code of Conduct, Security Policy, PR templates)

### Changed

- Migrated from Nx to Turborepo
- Migrated from ESLint/Prettier to Biome for linting and formatting
- Extracted reusable calculator components and split oversized hooks
- Renamed warning components to alert components
- Enhanced Dorkroom API client and documentation

## [2025.11.25]

### Added

- Split-grade printing calculator with filter factor compensation toggle

### Changed

- Upgraded React to 19.2.0

## [2025.11.20]

### Added

- Virtual scrolling for development recipes (TanStack Virtual v3)
- Persistent sidebar for recipe filtering

### Changed

- Modularized development recipes page into smaller components
- Extracted reusable hooks (useRecipeActions, useIsMobile)
- Lazy-loaded React Query Devtools in development

## [2025.11.18]

### Added

- "Even borders" aspect ratio option in border calculator
- Quarter-inch rounding in border calculator
- Redesigned homepage layout with stat cards

### Changed

- Migrated theme context and border calculator components to @dorkroom/ui
- Split documentation into package-specific CLAUDE.md files

## [2025.11.17]

### Added

- TanStack Router v1 with file-based routing
- TanStack Form v1 integration across all calculators
- Form state persistence and hydration via localStorage
- Animation settings in theme/settings
- Favorites animation in development recipes
- Vercel Analytics integration
- Comprehensive test suites for border calculator

### Changed

- Complete migration to TanStack ecosystem (Query v5, Router v1, Form v1, Table v8)

## [2025.11.04]

### Added

- Imperial/metric measurement conversion system
- Unit switching for all calculator inputs including enlarger height

### Fixed

- Floating point precision in metric conversions
- Input handling during decimal entry

## [2025.10.16]

### Added

- Interactive reciprocity chart with hover tooltips and wide view
- Time formatting utilities
- Auto-scroll and performance optimizations for chart

## [2025.09.26]

### Added

- AGPL-3.0 license
- Multiple themes: dark, light, darkroom (red), high contrast (black/white)
- Favorites functionality for development recipes
- Toast notifications
- Accessibility improvements with ARIA attributes
- CI/CD pipeline with GitHub Actions

### Changed

- Code splitting and performance optimizations

## [2025.09.22]

### Added

- Initial release of Dorkroom
- Border Calculator with blade readings and animated preview
- Reciprocity Calculator for long exposure correction
- Resize Calculator for scaling prints
- Stops Calculator for exposure stop conversion
- Development Recipes page with Supabase API integration
- FilmDev.org recipe import
- Mobile navigation with drawer component
- Responsive design for all calculators
- @dorkroom/api TypeScript client package
- REST API endpoints: `/api/films`, `/api/developers`, `/api/combinations`
- Monorepo architecture with shared packages (ui, logic, api)

### Technical

- React 19 with TypeScript
- Tailwind CSS with custom darkroom theme
- Vite build tooling
- Supabase backend
- Vercel deployment

---

[2026.02.27]: https://github.com/narrowstacks/dorkroom/compare/8eaf60c...HEAD
[2026.02.14]: https://github.com/narrowstacks/dorkroom/compare/c7b30ce...8eaf60c
[2025.12.23]: https://github.com/narrowstacks/dorkroom/compare/c7b30ce...8eaf60c
[2025.11.25]: https://github.com/narrowstacks/dorkroom/compare/668cb15...c7b30ce
[2025.11.20]: https://github.com/narrowstacks/dorkroom/compare/373246c...668cb15
[2025.11.18]: https://github.com/narrowstacks/dorkroom/compare/4369ceb...373246c
[2025.11.17]: https://github.com/narrowstacks/dorkroom/compare/dab2258...4369ceb
[2025.11.04]: https://github.com/narrowstacks/dorkroom/compare/4cea721...dab2258
[2025.10.16]: https://github.com/narrowstacks/dorkroom/compare/e21f61d...4cea721
[2025.09.26]: https://github.com/narrowstacks/dorkroom/compare/458cb60...e21f61d
[2025.09.22]: https://github.com/narrowstacks/dorkroom/compare/e824485...458cb60
