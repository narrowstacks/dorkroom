# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dorkroom is an Nx workspace containing a React 19 application with TypeScript, Tailwind CSS, and supporting libraries. The monorepo includes a main app and shared packages for UI components and business logic.

### Current Features

- **Photography Calculators**: Exposure, reciprocity, resize, border, and development recipe calculators
- **Infobase**: MDX-based wiki system with dynamic routing (feature flagged via `VITE_FEATURE_INFOBASE`)
- **Settings**: Theme management and user preferences
- **Supabase Integration**: Backend connectivity (optional)

## Required Tool Uses

### MCP Servers

- **Serena**: ALWAYS activate project `dorkroom-nx` before starting work. Use for code exploration, symbol search, and semantic editing.
- **Playwright**: Test pages after UI changes. Get console output and verify functionality.
- **Context7**: Fetch up-to-date library documentation when working with external packages.
- **Clear-thought**: Use for complex problem-solving, debugging, and architectural decisions.
- **IDE**: Access diagnostics and execute code in Jupyter notebooks.

### Claude Code Agents

Custom agents are available in `.claude/agents/`:

- **react-coder**: Creating/modifying React components with simplicity-first philosophy
- **ui-engineer**: Frontend code review and modern best practices
- **backend-typescript-architect**: Backend/API development with Bun runtime
- **ui-ux-playwright-tester**: Live browser testing of UI changes
- **ts-coder**: TypeScript code writing with strict type safety

Use agents proactively when tasks match their expertise areas.

### Development

- `bunx nx dev dorkroom -- --host=0.0.0.0` - Start development server. **Check if dev server is running on port 4200 before doing this!**
- `bunx nx build dorkroom` - Build production bundle
- `bunx nx serve dorkroom` - Alternative dev server (no hotloading of @dorkroom packages!)

### Code Quality (run these after completing tasks)

- `bunx nx lint dorkroom` - Run ESLint
- `bunx nx typecheck dorkroom` - TypeScript type checking
- `bunx prettier --write .` - Format code

### Testing

- `bunx nx test dorkroom` - Run Vitest tests for entire project
- `bunx nx test @dorkroom/[package]` - Run tests for specific package in `/packages/`

### Nx Workspace

- `bunx nx graph` - Visualize dependencies
- `bunx nx show project dorkroom` - Show available targets
- `bunx nx build dorkroom` - Build all packages

## Architecture

### Structure

- `apps/dorkroom/` - Main React application
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic (@dorkroom/logic)
- `packages/api/` - Client side implementation of API provided by Vercel serverless functions (as defined in `[project root]/api/`) (@dorkroom/api)

### Key Technologies

- React 19 with functional components
- TypeScript with strict mode
- Tailwind CSS 4.1.13 for styling
- Vite for bundling
- Vitest for testing

## Code Conventions

### Style

- Single quotes (Prettier configured)
- PascalCase for components (`LabeledSliderInput`)
- kebab-case for files (`labeled-slider-input.tsx`)
- Interface naming: `ComponentNameProps`

### React Patterns (React 19)

- Functional components with TypeScript
- Props destructuring with default values
- **NEVER use `forwardRef`** - pass refs as regular props in React 19
- Controlled components preferred
- Use `cn()` utility for conditional Tailwind classes (from packages/ui)
- Minimize `useEffect` usage - prefer event handlers and derived state
- Document any `useEffect` usage with clear comments explaining why it's necessary

### Component Development

- **Always use `@dorkroom/ui` for UI components** - import from packages/ui
- Check existing components before creating new ones
- Keep components simple and focused - one main export per file
- Avoid premature optimization or unnecessary abstractions
- Reference `apps/dorkroom/src/app/components/` for usage patterns

### Imports/Exports

- Named exports from index files
- ES6 imports/exports
- UI components: `import { Component } from '@dorkroom/ui'`
- Logic utilities: `import { util } from '@dorkroom/logic'`

### MDX Content

- MDX files support frontmatter with metadata
- Use `gray-matter` for parsing
- Rehype plugins: `rehype-highlight` for syntax highlighting
- Remark plugins: `remark-gfm` for GitHub Flavored Markdown

## Quality Checks

### Pre-commit Hook

Quality check hook configured in `.claude/hooks/react-app/`:

- TypeScript type checking (auto-run)
- ESLint with autofix
- Prettier formatting with autofix
- Custom rules for console statements, `as any`, debuggers, TODOs

### Running Checks Manually

After completing tasks, run:

```bash
bunx nx lint dorkroom    # ESLint
bunx nx typecheck dorkroom   # TypeScript
bunx prettier --write .      # Format
```

## Environment & Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `SUPABASE_ENDPOINT`: Supabase project URL
- `SUPABASE_MASTER_API_KEY`: Service role key (server-side only)
- `VITE_FEATURE_INFOBASE`: Enable/disable Infobase feature (default: true in dev)
- `NODE_ENV`: Environment flag

### Feature Flags

Feature flags control optional functionality:

- Check `.env.example` for available flags
- Use `VITE_` prefix for client-side flags

## Package Dependencies

- UI package: clsx, tailwind-merge, React 19
- Logic package: React 19 peer dependencies
- All packages build to TypeScript declarations (.d.ts)
