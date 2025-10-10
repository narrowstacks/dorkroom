# Changelog for PR #8: Add MDX-based Infobase Wiki System

**Author**: narrowstacks (aaron f.a)
**Branch**: feature/infobase-mdx-wiki → main
**Status**: OPEN
**Created**: 2025-10-01T00:16:02Z
**Updated**: 2025-10-08T11:31:09Z

## Summary

This PR implements a comprehensive MDX-based wiki system for the Dorkroom infobase page, enabling dynamic content management with live API data integration. The feature is gated behind the `VITE_FEATURE_INFOBASE` flag and provides a structured content management system similar to Obsidian.md with hierarchical organization, searchable navigation, and embedded React components within MDX files.

## Changes

### Features

#### MDX Configuration & Processing

- Configured Vite with `@mdx-js/rollup` plugin for MDX file processing
- Added `remark-gfm` for GitHub Flavored Markdown support
- Added `rehype-highlight` for code syntax highlighting
- TypeScript declarations for MDX modules
- MDX loader utilities with auto-loading via Vite glob imports

#### Content Organization System

- Hierarchical folder structure with category-based organization:
  - `films/` - Film stock information and characteristics
  - `developers/` - Chemical developer specifications
  - `recipes/` - Development recipe documentation
  - `guides/` - Tutorial and reference content
- Index pages for each category
- Boilerplate templates for creating new content pages
- Content tree building with breadcrumb navigation
- Client-side search/filtering utilities

#### Navigation & UI Components

All components are responsive and theme-aware:

- **SidebarNavigation**: Collapsible folder tree with active page highlighting
- **BreadcrumbNav**: Location hierarchy breadcrumbs
- **SearchBar**: Client-side search/filtering
- **InfobaseLayout**: Main layout container with mobile drawer sidebar
- Mobile-responsive navigation patterns

#### API Data Integration Components

Live data components for embedding in MDX:

- **FilmCard**: Displays film specifications from API
- **DeveloperCard**: Shows developer properties and dilutions
- **RecipeTable**: Lists development recipes with filtering
- **ImageGallery**: Displays film sample images
- **LinkButton**: Styled navigation helper
- **DatabaseViewer/List/Detail**: Generic database browsing components

#### Feature Flag System

- Added `FEATURE_FLAGS.md` documentation
- `VITE_FEATURE_INFOBASE` flag for controlling feature visibility
- Feature-flagged routing with "Coming Soon" fallback page
- Environment variable typings and validation

#### Context & State Management

- **InfobaseProvider**: Provides centralized API data access
- **useInfobaseData** hook: Client initialization with timeout handling
- Loading and error state management
- Automatic data loading with configurable timeout

### Improvements

#### Code Quality & Testing

- Unit tests for content tree utilities (`mdx-loader.spec.ts`)
- Unit tests for breadcrumb generation
- Unit tests for search functionality
- Error boundaries for MDX content rendering
- Generic error boundary component

#### Developer Experience

- Claude Code agent configurations:
  - `backend-typescript-architect.md`
  - `gemini-code-reviewer.md`
  - `react-coder.md`
  - `ts-coder.md`
  - `ui-engineer.md`
  - `ui-ux-chrome-devtools-tester.md`
- Quality check hooks and scripts
- PR/workflow templates
- Comprehensive code style rules
- `conventional-commit.md` slash command
- `pr-changelog-gen.md` slash command

#### Documentation

- Updated `AGENT.md` with improved agent documentation
- Updated `CLAUDE.md` with project-specific guidance
- Added `FEATURE_FLAGS.md` documentation
- Added `SUPABASE_DEPLOYMENT.md` updates
- Contributor and development guides within MDX content
- Template files for creating new content

### Documentation

#### Content Pages

- Kodak Tri-X 400 film page with embedded API data
- Kodak D-76 developer page with recipe integration
- Index pages for all content categories
- Contributing guide
- Multiple example pages demonstrating MDX component usage

#### Project Documentation

- `.env.example` updated with feature flag configuration
- README.md updated with Infobase feature information
- VSCode settings and extensions recommendations for MDX

### Chores

#### Build & Tooling

- Vite configuration for MDX processing
- TypeScript configuration for MDX files (`mdx-minimal.tsconfig.json`)
- Package updates (bun.lock)
- `.gitignore` updates for local settings
- VSCode editor configuration updates
- Prettier and ESLint configuration maintenance

#### Dependencies Added

- `@mdx-js/rollup`: MDX processing for Vite
- `gray-matter`: Frontmatter parsing
- `remark-gfm`: GitHub Flavored Markdown
- `rehype-highlight`: Syntax highlighting

#### Cleanup

- Removed `.claude/settings.local.json` (now in .gitignore)
- Removed obsolete BreadcrumbNav component from layout
- Code formatting and consistency improvements

## Modified Files

### Application Core

- `apps/dorkroom/src/app/app.tsx` - Added infobase routing with feature flag
- `apps/dorkroom/vite.config.ts` - MDX plugin configuration
- `apps/dorkroom/src/styles.css` - MDX content and prose typography styles

### Infobase Pages

- `apps/dorkroom/src/app/pages/infobase/infobase-page.tsx` - Main infobase page
- `apps/dorkroom/src/app/pages/infobase/infobase-coming-soon-page.tsx` - Fallback page
- `apps/dorkroom/src/app/pages/infobase/film-data-page.tsx` - Film database page
- `apps/dorkroom/src/app/pages/infobase/developer-data-page.tsx` - Developer database page

### Context & Utilities

- `apps/dorkroom/src/app/contexts/infobase-context.tsx` - API data provider
- `apps/dorkroom/src/app/lib/mdx-loader.ts` - Content tree utilities
- `apps/dorkroom/src/app/lib/mdx-auto-loader.ts` - Vite glob MDX loader
- `apps/dorkroom/src/app/lib/mdx-loader.spec.ts` - Unit tests

### MDX Components

- `apps/dorkroom/src/app/components/mdx-components.tsx` - MDX wrapper components
- `apps/dorkroom/src/app/components/mdx-error-boundary.tsx` - MDX error handling
- `apps/dorkroom/src/app/components/error-boundary.tsx` - Generic error boundary

### UI Package Components

- `packages/ui/src/components/infobase/index.ts` - Barrel exports
- `packages/ui/src/components/infobase/infobase-layout.tsx`
- `packages/ui/src/components/infobase/sidebar-navigation.tsx`
- `packages/ui/src/components/infobase/breadcrumb-nav.tsx`
- `packages/ui/src/components/infobase/search-bar.tsx`
- `packages/ui/src/components/infobase/film-card.tsx`
- `packages/ui/src/components/infobase/developer-card.tsx`
- `packages/ui/src/components/infobase/recipe-table.tsx`
- `packages/ui/src/components/infobase/database-viewer.tsx`
- `packages/ui/src/components/infobase/database-list.tsx`
- `packages/ui/src/components/infobase/database-detail.tsx`

### Logic Package

- `packages/logic/src/constants/feature-flags.ts` - Feature flag constants
- `packages/logic/src/hooks/use-feature-flags.ts` - Feature flag hook
- `packages/logic/src/types/infobase.ts` - Type definitions
- `packages/logic/src/vite-env.d.ts` - Vite environment typings

### Content Files

- `apps/dorkroom/src/content/index.mdx`
- `apps/dorkroom/src/content/_templates/*` - Content templates
- `apps/dorkroom/src/content/films/*` - Film documentation
- `apps/dorkroom/src/content/developers/*` - Developer documentation
- `apps/dorkroom/src/content/recipes/*` - Recipe documentation
- `apps/dorkroom/src/content/guides/*` - Guide documentation

### Configuration & Tooling

- `.claude/agents/*` - 6 new agent configurations
- `.claude/commands/conventional-commit.md` - Git commit helper
- `.claude/commands/pr-changelog-gen.md` - Changelog generator
- `.vscode/settings.json` - MDX editor support
- `.vscode/extensions.json` - Recommended extensions
- `package.json` - New dependencies and scripts
- `.env.example` - Feature flag documentation

## Notable Commits

- `672e329` - docs: improve conventional-commit command with staging workflow (2025-10-08)
- `9ae8109` - chore: add claude code conventional commit slash command (2025-10-08)
- `f3fabf8` - chore: update AGENT.md and bun.lock for improved agent documentation and dependency management (2025-10-07)
- `b8c2f63` - Merge main into feature/infobase-mdx-wiki (2025-10-07)
- `47dea1b` - chore: update dependencies and enhance project scripts (2025-10-07)
- `1f7f9d3` - feat: Enhance Infobase with automated MDX page loading and database integration (2025-10-06)
- `5be19e1` - feat: Introduce feature flags for enhanced feature control (2025-09-30)
- `03e5af1` - Add MDX-based infobase wiki system (2025-09-30)

## Discussion Highlights

- **Vercel Bot**: Deployment preview available at `dorkroom-git-feature-infobase-mdx-wiki-narrowstacks-projects.vercel.app`
- **CodeRabbit AI**: Comprehensive automated review with walkthrough documentation
  - Estimated review effort: 🎯 5 (Critical) | ⏱️ ~120 minutes
  - All pre-merge checks passed (Title Check, Description Check, Docstring Coverage)
  - Suggested label: `codex`

## Breaking Changes

None - this is a new feature that doesn't modify existing functionality. The feature is gated behind the `VITE_FEATURE_INFOBASE` flag.

## Migration Notes

### For Developers

1. **Enable the feature**: Set `VITE_FEATURE_INFOBASE=true` in your `.env` file
2. **Install dependencies**: Run `bun install` to get new MDX-related packages
3. **VSCode users**: Install recommended extensions for MDX syntax highlighting
4. **Content creators**: Use templates in `apps/dorkroom/src/content/_templates/` for new pages

### For Deployment

1. Set environment variable `VITE_FEATURE_INFOBASE=true` to enable the feature
2. Ensure Supabase connection is configured if using API data components
3. Build process includes MDX compilation - no additional build steps needed

### MDX Content Usage

Content creators can now use React components directly in markdown files:

```mdx
# Example Film Page

<FilmCard filmSlug="kodak-tri-x-400" />

## Development Recipes

<RecipeTable film="kodak-tri-x-400" maxRows={8} />

<LinkButton to="/development?film=kodak-tri-x-400">View All Recipes →</LinkButton>
```

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
