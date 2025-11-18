# Dorkroom

> Skip the math. Make prints.

**Dorkroom** is a collection of specialized calculators and tools designed for analog photographers and darkroom enthusiasts. Built to keep complex exposure math, border calculations, and chemistry planning out of your way so you can focus on making beautiful prints.

![React 19](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.13-06B6D4)

## What is Dorkroom?

Dorkroom provides essential calculators for film photography and darkroom work:

### **Printing Tools**

- **Border Calculator** - Calculate precise print borders with trim-safe guides
- **Resize Calculator** - Scale prints without endless test strips
- **Stops Calculator** - Translate exposure stops into seconds

### **Shooting Tools**

- **Exposure Calculator** - Balance aperture, shutter, and ISO on location
- **Reciprocity Calculator** - Correct for long exposure failure
- **Development Recipes** - Film + chemistry pairings with proven results

Built for darkroom obsessives who want fast, reliable calculations without the complexity.

## Recent Updates

**November 2025** - Completed major TanStack ecosystem migration:

- ✅ Migrated from custom data fetching to **TanStack Query v5** for server state management
- ✅ Migrated from React Router to **TanStack Router v1** with file-based routing
- ✅ Adopted **TanStack Form v1** with Zod validation for all forms
- ✅ Implemented **TanStack Table v8** for data tables with sorting and filtering
- ✅ Full type safety with TypeScript 5.8.2 and runtime validation with Zod 4.1.12

See [TANSTACK_MIGRATION.md](TANSTACK_MIGRATION.md) for complete migration details.

## Quick Start

### Prerequisites

- **Node.js** 18+ (required)
- **Bun** (required - project uses Bun workspaces)

Install Bun:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via npm)
npm install -g bun
```

### Development

```bash
# Clone the repository
git clone https://github.com/narrowstacks/dorkroom.git
cd dorkroom

# Install dependencies (requires Bun)
bun install

# Set up environment variables (for API testing)
cp .env.example .env
# Edit .env with your Supabase credentials

# Build before starting dev server
bunx nx build dorkroom

# Start development server
bunx nx dev dorkroom -- --host=0.0.0.0

# Open http://localhost:4200
```

### Building

```bash
# Build for production
bunx nx build dorkroom

# Build all packages
bunx nx run-many --target=build

# Visualize project dependencies
bunx nx graph
```

### Testing

```bash
# Run tests
bunx nx test dorkroom

# Run tests with UI
bunx nx test --ui
```

## Technology Stack

- **Frontend**: React 19 with TypeScript 5.8.2
- **Styling**: Tailwind CSS 4.1.13 with custom darkroom theme
- **Build Tool**: Vite 6 with Nx 21.4 workspace
- **Testing**: Vitest 3 with Testing Library
- **State Management**: TanStack Query v5 for server state
- **Routing**: TanStack Router v1 with file-based routing
- **Forms**: TanStack Form v1 with Zod validation
- **Tables**: TanStack Table v8 for data tables
- **Schema Validation**: Zod 4.1.12
- **Monorepo**: Nx with shared packages

## Architecture

Dorkroom is built as an Nx monorepo with clear separation of concerns:

```
apps/
  dorkroom/           # Main React application with TanStack Router file-based routing
    src/routes/       # File-based route definitions
packages/
  ui/                 # Shared UI components (@dorkroom/ui)
  logic/              # Business logic, hooks, queries (@dorkroom/logic)
  api/                # API utilities and TypeScript client (@dorkroom/api)
api/                  # Serverless API endpoints (Vercel functions)
```

### Key Architectural Patterns

- **File-Based Routing**: TanStack Router with automatic route tree generation
- **Type-Safe State**: TanStack Query for server state with query key structure
- **Form Validation**: TanStack Form with Zod schemas for runtime validation
- **Data Tables**: TanStack Table for sorting, filtering, and pagination

## Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Custom darkroom-inspired UI optimized for low light
- **Fast Calculations** - Instant results with real-time validation
- **Type-Safe** - Full TypeScript coverage with strict mode
- **Offline-Ready** - Smart caching with TanStack Query
- **File-Based Routing** - Type-safe navigation with TanStack Router
- **Form Validation** - Runtime schema validation with Zod
- **Development Database** - 800+ film development recipes
- **Open Source** - Community-driven development under AGPL-3.0

## API

Dorkroom provides a comprehensive API for accessing film development data, available both as a TypeScript client package and as REST endpoints for external integrations.

**For detailed API documentation, see [API.md](API.md)**

### Quick Overview

- **TypeScript Client**: `@dorkroom/api` package with fuzzy search and caching
- **REST Endpoints**: `/api/films`, `/api/developers`, `/api/combinations`
- **Features**: Query parameters, fuzzy search, request validation, CORS support
- **Authentication**: Supabase service role key (server-side only)

## Contributing

We welcome contributions from the analog photography community!

- **GitHub**: [https://github.com/narrowstacks/dorkroom](https://github.com/narrowstacks/dorkroom)
- **Issues**: Report bugs or request features
- **Pull Requests**: Submit improvements and new calculators

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-calculator`
3. Make your changes following our code organization guidelines:
   - **Routes**: Add new routes to `apps/dorkroom/src/routes/` using file-based routing
   - **Business Logic**: Add calculations, utilities, types, and hooks to `packages/logic/`
   - **UI Components**: Add reusable components and contexts to `packages/ui/`
   - **API Client**: Add API utilities to `packages/api/`
   - **Validation Schemas**: Define Zod schemas in appropriate package
4. Test your changes thoroughly:
   ```bash
   # Test specific packages
   bunx nx test logic
   bunx nx test ui
   bunx nx test dorkroom
   ```
5. Run quality checks on affected packages:

   ```bash
   # Lint specific packages
   bunx nx lint logic
   bunx nx lint ui
   bunx nx lint dorkroom

   # Type check specific packages
   bunx nx typecheck logic
   bunx nx typecheck ui
   bunx nx typecheck dorkroom

   # Format code (only files you've modified)
   bunx prettier --write .
   ```

6. Submit a pull request

## Code Quality

This project maintains high code quality standards with package-specific tooling and modern development practices.

### Package Organization

- **`packages/logic/`** - Pure TypeScript business logic (calculations, utilities, types, hooks, TanStack Query queries)
- **`packages/ui/`** - Reusable React components, contexts, and form components
- **`packages/api/`** - API utilities, TypeScript client, and data fetching functions
- **`apps/dorkroom/`** - Main application with file-based routes and app-specific components

### Key Development Patterns

**TanStack Ecosystem:**

- All data fetching uses TanStack Query v5 with proper query key structure
- File-based routing with TanStack Router v1 for type-safe navigation
- Form handling with TanStack Form v1 and Zod schema validation
- Data tables with TanStack Table v8 for sorting, filtering, pagination

**Type Safety:**

- Strict TypeScript mode enabled
- Zod schemas for runtime validation
- Type-safe route parameters and search params
- No `any` types (use `unknown` when type cannot be determined)

### Quality Tools by Package

```bash
# Run quality checks on specific packages
bunx nx test logic        # Test business logic
bunx nx test ui          # Test UI components
bunx nx test dorkroom    # Test main application

bunx nx lint logic       # Lint business logic
bunx nx lint ui         # Lint UI components
bunx nx lint dorkroom   # Lint main application

bunx nx typecheck logic     # Type check business logic
bunx nx typecheck ui       # Type check UI components
bunx nx typecheck dorkroom # Type check main application

# Run across all projects
bunx nx run-many --targets=lint,typecheck,test,build

# Format code (Prettier - single quotes, semicolons, trailing commas)
bunx prettier --write .
```

## Project Commands

| Command                                  | Description                    |
| ---------------------------------------- | ------------------------------ |
| `bunx nx dev dorkroom -- --host=0.0.0.0` | Start development server       |
| `bunx nx build dorkroom`                 | Build production bundle        |
| `bunx nx test`                           | Run tests                      |
| `bunx nx test --ui`                      | Run tests with UI              |
| `bunx nx lint dorkroom`                  | Run ESLint                     |
| `bunx nx typecheck dorkroom`             | TypeScript checking            |
| `bunx prettier --write .`                | Format code                    |
| `bunx nx graph`                          | Visualize project dependencies |

## License

AGPL 3.0 License - see the [LICENSE](LICENSE) file for details.

## Support

If you find Dorkroom useful for your darkroom work:

- ⭐ Star the project on GitHub
- 🐛 Report bugs and suggest features
- 🔗 Share with fellow analog photographers
- ☕ Support development on Ko-fi

---

**Made with ❤️ for the analog photography community**
