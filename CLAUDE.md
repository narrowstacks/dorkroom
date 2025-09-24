# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dorkroom is an Nx workspace containing a React 19 application with TypeScript, Tailwind CSS, and supporting libraries. The monorepo includes a main app and shared packages for UI components and business logic.

## Essential Commands

### Development

- `npx nx dev dorkroom -- --host=0.0.0.0` - Start development server. **Check if dev server is running on port 4200 before doing this!**
- `npx nx build dorkroom` - Build production bundle
- `npx nx serve dorkroom` - Alternative dev server (no hotloading of @dorkroom packages!)

### Code Quality (run these after completing tasks)

- `npx nx lint` - Run ESLint
- `npx nx typecheck` - TypeScript type checking
- `npx prettier --write .` - Format code

### Testing

- `npx nx test` - Run Vitest tests
- `npx nx test --ui` - Run tests with UI

### Nx Workspace

- `npx nx graph` - Visualize dependencies
- `npx nx show project dorkroom` - Show available targets
- `npx nx build` - Build all packages

## Architecture

### Structure

- `apps/dorkroom/` - Main React application
- `packages/ui/` - Shared UI components (@dorkroom/ui)
- `packages/logic/` - Business logic (@dorkroom/logic)
- `original-*/` - Legacy code being migrated

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

### React Patterns

- Functional components with TypeScript
- Props destructuring with default values
- Controlled components
- Use `cn()` utility for conditional Tailwind classes

### Imports/Exports

- Named exports from index files
- ES6 imports/exports
- Components exported from `packages/ui/src/index.ts`

## Package Dependencies

- UI package uses clsx and tailwind-merge
- Logic package has React peer dependencies
- All packages build to TypeScript declarations
