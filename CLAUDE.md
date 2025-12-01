# CLAUDE.md | AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) and other AI coding agents when working with code in this repository.

## Project Overview

Dorkroom is an analog photography calculator app built with React 19, TypeScript, and Tailwind CSS. It's an Nx monorepo with specialized calculator tools (border, exposure, reciprocity, resize, stops) and a development recipes database. The project recently completed a major TanStack ecosystem migration (v5 Query, v1 Router, v1 Form, v8 Table).

## Essential Commands

### Development

- `bunx nx build dorkroom` - Build production bundle. **Always run before starting a server.**
- `bunx nx dev dorkroom -- --host=0.0.0.0` - Start development server. **Check if dev server is running on port 4200 before doing this!**
- `bunx nx serve dorkroom` - Alternative dev server (no hotloading of @dorkroom packages! Always rebuild dorkroom before serving.)

### Code Quality (run these after completing tasks)

- `bunx nx lint dorkroom` - Run Biome linting
- `bunx nx typecheck dorkroom` - TypeScript type checking
- `bun run format` - Format code with Biome (formats the entire codebase)
- `bun run lint:fix` - Lint and auto-fix issues with Biome

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

### Key Technologies

- React 19.0.0 with functional components
- TypeScript 5.8.2 with strict mode
- Tailwind CSS 4.1.13 for styling
- Vite 6 for bundling
- Vitest 3 for testing
- Nx 22 for monorepo management
- Biome for linting and formatting
- TanStack Query v5 for server state management
- TanStack Router v1 for file-based routing
- TanStack Form v1 for form state management with Zod validation
- TanStack Table v8 for data tables
- Zod v4.1.12 for schema validation

## Code Conventions

### Style

**Biome Configuration (biome.json):**

- Single quotes for strings
- Semicolons at end of statements
- Trailing commas in ES5-valid syntax (objects, arrays)
- Bracket spacing in object literals: `{ foo }` not `{foo}`
- Always include parentheses in arrow functions: `(x) =>` not `x =>`
- Double quotes for JSX attributes
- 2-space indentation
- 80-character line width

**Naming Conventions:**

- PascalCase for components (`LabeledSliderInput`)
- kebab-case for files (`labeled-slider-input.tsx`)
- Interface naming: `ComponentNameProps`

### TypeScript Typing

- **Never use `any` type** - always use specific types or `unknown` where the type cannot be determined, unless otherwise specified by a package we're using (such as some instances in TanStack)
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

### TanStack Ecosystem Patterns

This project uses the TanStack ecosystem extensively:

- **TanStack Router v1** - File-based routing in `apps/dorkroom/src/routes/`
- **TanStack Form v1** - Form state with Zod validation
- **TanStack Query v5** - Server state management and caching
- **TanStack Table v8** - Data tables with sorting/filtering

**For detailed patterns and code examples, see:**

- `packages/logic/CLAUDE.md` - TanStack Query, Form, Table patterns with full examples
- `packages/ui/CLAUDE.md` - Component patterns and form integration
- `packages/api/CLAUDE.md` - API types and transformation patterns

**Key Principles:**

- Always use Zod schemas for form validation
- Always use optimistic updates for mutations
- Always invalidate queries after mutations
- Follow hierarchical query key structure
- Keep business logic in `@dorkroom/logic` package
- Keep UI components in `@dorkroom/ui` package

### Imports/Exports

- Named exports from index files
- ES6 imports/exports
- Never import internal package paths (always use package name)

## Package-Specific Documentation

Each package has detailed conventions and code examples in its own CLAUDE.md:

- **`packages/ui/CLAUDE.md`** - UI component patterns, Tailwind usage, form components, accessibility
- **`packages/logic/CLAUDE.md`** - TanStack Query/Form/Table patterns, business logic, schemas
- **`packages/api/CLAUDE.md`** - API type definitions, raw/transformed types, error handling

**Always reference package-specific documentation for detailed implementation patterns.**

## Search Strategy Guide

Optimize search efficiency by choosing the right tool for each task.

If any of the tools are not available on the system, prompt user to install them.

### Finding Files

**Use `Glob` first** (fastest, integrated):

- Pattern: `**/*.tsx`, `src/**/*.test.ts`, `apps/dorkroom/**/*`
- Best for: File discovery, checking if patterns exist
- Example: `Glob` with pattern `**/*border*.tsx`

**Use `fd` for complex file filters:**

- Filters by size, type, modification time, or regex names
- Example: `fd --type f --size +100k` (files over 100KB)

### Finding Text/Strings

**Use `Grep` for simple text searches** (optimized for my use):

- Pattern: "useQuery", "borderCalculator", "const name"
- Supports regex, type filtering (--type js, --type ts)
- Example: `Grep` with pattern `useQuery` and type `typescript`

**Use `rg` directly for complex patterns or context:**

- Superior context handling with `-A`/`-B`/`-C` flags
- Example: `rg "function.*border" -A 5` (function + 5 lines after)
- Better for: chains with `fzf`, when building complex patterns

### Finding Code Structure

**Use `ast-grep` for syntax-aware searches** (essential for TypeScript):

- Structural patterns: function definitions, imports, exports, component props
- Examples for usage can be found by activating the Claude skill `ast-grep`
- Best for: Understanding code patterns, finding hook implementations, tracking prop usage

### Interactive Result Selection

**Use `fzf` to filter large result sets:**

- Chain any tool with `| fzf` to pick from many results
- Example: `rg "TODO" | fzf` (pick which TODO to handle)
- Example: `fd "*.test.ts" | fzf` (pick which test to review)
- Best for: Multiple matches where you need to decide which one matters

### Parsing JSON/YAML Configuration

**Use `jq` for JSON extraction:**

- Example: `cat package.json | jq '.dependencies | keys'` (all dependency names)
- Example: `jq '.scripts | to_entries[] | .key' < package.json`
- Best for: Configuration analysis, extracting specific fields from configs

**Use `yq` for YAML extraction:**

- Example: `yq '.scripts' .github/workflows/ci.yml` (get scripts section)
- Example: `yq -r '.jobs | keys[]' < workflow.yml` (all job names)
- Best for: GitHub Actions config, deployment configs

### When to Use the Task Tool Instead

**Don't manually chain tools for complex analysis.** Use `Task` agent with `subagent_type=Explore`:

- Question: "How does authentication flow through this codebase?"
- Question: "What components use the border calculator hook?"
- Question: "Where are all form validations defined?"
- This handles multi-file analysis, cross-referencing, and pattern synthesis better than manual command chains

### Decision Tree

```text
Is it finding FILES?
  → Glob (simple patterns)
  → fd (complex filters)

Is it finding TEXT in files?
  → Grep (quick, simple text)
  → rg (when you need context/complex patterns)
  → rg | fzf (when there are many results)

Is it finding CODE STRUCTURE?
  → ast-grep (TypeScript patterns)
  → rg with regex (plain text structure)

Is it PICKING from many results?
  → Pipe to fzf (interactive selection)

Is it parsing JSON/YAML config?
  → jq (JSON files)
  → yq (YAML files)

Is it complex multi-file analysis?
  → Task agent with Explore (better than manual chains)
```

## Git rules

- Keep commit messages short. Use conventional commit standards.
- Confirm with user that they want to commit before committing, share commit message in your confirmation.
- **Only commit, never push without user prompting you to do so.**
