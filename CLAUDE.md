# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dorkroom is an Nx workspace containing a React 19 application with TypeScript, Tailwind CSS, and supporting libraries. The monorepo includes a main app and shared packages for UI components and business logic.

## Essential Commands

### Development

- `bunx nx dev dorkroom -- --host=0.0.0.0` - Start development server. **Check if dev server is running on port 4200 before doing this!**
- `bunx nx build dorkroom` - Build production bundle
- `bunx nx serve dorkroom` - Alternative dev server (no hotloading of @dorkroom packages!)

### Code Quality (run these after completing tasks)

- `bunx nx lint dorkroom` - Run ESLint
- `bunx nx typecheck dorkroom` - TypeScript type checking
- `bunx prettier --write .` - Format code

### Testing

- `bunx nx test` - Run Vitest tests
- `bunx nx test --ui` - Run tests with UI

### Nx Workspace

- `bunx nx graph` - Visualize dependencies
- `bunx nx show project dorkroom` - Show available targets
- `bunx nx build` - Build all packages

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

### TypeScript Typing

- **Never use `any` type** - always use specific types or `unknown` where the type cannot be determined
- Use `unknown` instead of `any` for values whose type is truly unknown at compile time
- Define proper interfaces for API responses, especially raw/transformed data structures
- Use discriminated unions instead of generic object types where possible
- Leverage TypeScript's type narrowing (type guards, `instanceof`, `typeof` checks)
- For generic utilities (like throttle/debounce), use generic constraints: `<T extends (...args: any[]) => any>` is acceptable only for variadic function types where the specific signature cannot be known at definition time
- When handling API data with both camelCase and snake_case fields, create dedicated `Raw*` types that enumerate all possible field variations
- Use `null` or `undefined` explicitly in types rather than leaving fields untyped
- Avoid casting with `as any` - use specific types or type guards instead
- For Chrome/browser APIs with incomplete type definitions, create local interface definitions (e.g., `PerformanceWithMemory`)

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
- Keep commit messages short. Use conventional commit standards.