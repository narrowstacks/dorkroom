# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CONTRIBUTING.md with comprehensive contribution guidelines
- CODE_OF_CONDUCT.md (Contributor Covenant 2.1)
- SECURITY.md with vulnerability reporting process
- Pull request template for standardized submissions
- CODEOWNERS for automatic review assignment

### Changed

- Expanded package documentation for @dorkroom/logic and @dorkroom/ui

## [0.9.0] - 2024

### Added

- **Border Calculator** - Calculate precise print borders with trim-safe guides
- **Resize Calculator** - Scale prints without endless test strips
- **Stops Calculator** - Translate exposure stops into seconds
- **Reciprocity Calculator** - Calculate exposure time correction for long exposure failure
- **Development Recipes** - Film + chemistry pairings with manufacturer-approved times
- **@dorkroom/api** - TypeScript client package with fuzzy search and caching
- **REST API** - `/api/films`, `/api/developers`, `/api/combinations` endpoints
- Multiple theme support (dark, light, high contrast, darkroom)
- TanStack ecosystem integration (Query v5, Router v1, Form v1, Table v8)
- Nx monorepo architecture with shared packages
- Comprehensive CI/CD pipeline with quality gates
- Issue templates for bugs, features, recipes, and documentation

### Technical

- React 19 with TypeScript 5.8
- Tailwind CSS 4.1 with custom theme
- Vite 6 build tooling
- Vitest 3 for testing
- Biome for linting and formatting
- Supabase for backend services
- Vercel deployment

---

## Version History Note

This changelog was introduced at version 0.9.0. Earlier development history is available in the [git log](https://github.com/narrowstacks/dorkroom/commits/main).

[Unreleased]: https://github.com/narrowstacks/dorkroom/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/narrowstacks/dorkroom/releases/tag/v0.9.0
