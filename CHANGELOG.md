# Changelog

All notable changes to Dorkroom are documented here.

This project uses [CalVer](https://calver.org/) date-based versioning: `YYYY.MM.DD`.

## [2026.02.14]

### Added

- Lens Equivalency Calculator for comparing focal lengths across formats
- Right-side sidebar for mobile navigation

### Changed

- Improved responsive layouts across all calculator pages
- Updated postcard paper size to 3 7/8 x 5 7/8 in

### Fixed

- Resize calculator mobile overflow
- Card badge alignment and tooltip accessibility
- Console/debugger stripping restored for production builds

### Removed

- E2E tests, Playwright, and Chromatic (simplified CI pipeline)

## [2026.01.20]

### Fixed

- Resolved 150+ lint warnings across the codebase
- Modern toolchain review feedback addressed

### Changed

- Migrated to modern Rust-based toolchain (oxlint for type-aware linting)
- Concise CLAUDE.md documentation replacing verbose version

## [2025.12.23]

### Added

- Film Database page with search, filtering, and detail panels
- Volume mixer and temperature warnings in recipe details
- Push/pull calculations and display in recipe components
- FilmDev.org import with push/pull detection and source tracking
- URL sync for selected recipes
- Confirmation modal for recipe deletes
- CI optimizations: caching, path filtering, deploy skip for docs-only changes

### Changed

- Migrated from Nx to Turborepo
- Extracted reusable calculator components and split oversized hooks
- Renamed warning components to alert components

## [2025.12.01]

### Added

- Enhanced SEO metadata across all routes
- Navigation tooltips and new links
- Open source collaboration files (Code of Conduct, Security Policy, PR templates)

## [2025.11.30]

### Changed

- Migrated from ESLint/Prettier to Biome for linting and formatting
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

[2026.02.14]: https://github.com/narrowstacks/dorkroom/compare/2026.01.20...HEAD
[2026.01.20]: https://github.com/narrowstacks/dorkroom/compare/2025.12.23...2026.01.20
[2025.12.23]: https://github.com/narrowstacks/dorkroom/compare/2025.12.01...2025.12.23
[2025.12.01]: https://github.com/narrowstacks/dorkroom/compare/2025.11.30...2025.12.01
[2025.11.30]: https://github.com/narrowstacks/dorkroom/compare/2025.11.25...2025.11.30
[2025.11.25]: https://github.com/narrowstacks/dorkroom/compare/2025.11.20...2025.11.25
[2025.11.20]: https://github.com/narrowstacks/dorkroom/compare/2025.11.18...2025.11.20
[2025.11.18]: https://github.com/narrowstacks/dorkroom/compare/2025.11.17...2025.11.18
[2025.11.17]: https://github.com/narrowstacks/dorkroom/compare/2025.11.04...2025.11.17
[2025.11.04]: https://github.com/narrowstacks/dorkroom/compare/2025.10.16...2025.11.04
[2025.10.16]: https://github.com/narrowstacks/dorkroom/compare/2025.09.26...2025.10.16
[2025.09.26]: https://github.com/narrowstacks/dorkroom/compare/2025.09.22...2025.09.26
[2025.09.22]: https://github.com/narrowstacks/dorkroom/releases/tag/2025.09.22
