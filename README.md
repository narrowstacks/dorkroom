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

## Quick Start

### Prerequisites

- Node.js 18+
- bun, npm, or yarn (bun preferred)

### Development

```bash
# Clone the repository
git clone https://github.com/narrowstacks/dorkroom-nx.git
cd dorkroom-nx

# Install dependencies
bun install

# Start development server
bunx nx dev dorkroom -- --host=0.0.0.0

# Open http://localhost:4200
```

### Building

```bash
# Build for production
bunx nx build dorkroom

# Build all packages
bunx nx build
```

### Testing

```bash
# Run tests
bunx nx test dorkroom

# Run tests with UI
bunx nx test --ui
```

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4.1.13 with custom darkroom theme
- **Build Tool**: Vite with Nx workspace
- **Testing**: Vitest with Testing Library
- **Monorepo**: Nx with shared packages

## Architecture

```
apps/
  dorkroom/           # Main React application
packages/
  ui/                 # Shared UI components (@dorkroom/ui)
  logic/              # Business logic (@dorkroom/logic)
  api/                # API utilities (@dorkroom/api)
api/                  # Serverless API endpoints (Vercel functions)
```

## Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Custom darkroom-inspired UI optimized for low light
- **Fast Calculations** - Instant results without page reloads
- **Open Source** - Community-driven development

## API

Dorkroom includes both a client-side API package (`@dorkroom/api`) for data access and serverless API endpoints for external integrations.

### Client API Package

The `@dorkroom/api` package provides a TypeScript client for accessing film development data:

```typescript
import { DorkroomClient } from '@dorkroom/api';

const client = new DorkroomClient({
  baseUrl: 'https://dorkroom.art/api', // Optional, defaults to production API
  timeout: 10000,                     // Optional, defaults to 10 seconds
  cacheExpiryMs: 300000              // Optional, defaults to 5 minutes
});

// Load all data
await client.loadAll();

// Get films, developers, and development combinations
const films = client.getAllFilms();
const developers = client.getAllDevelopers();
const combinations = client.getAllCombinations();
```

### Serverless API Endpoints

Vercel serverless functions provide external API access to film development data:

- `GET /api/films` - Film stock information
- `GET /api/developers` - Developer chemistry information
- `GET /api/combinations` - Film + developer combinations with development recipes

#### Environment Variables

The API endpoints require the following environment variables:

```bash
SUPABASE_ENDPOINT=your_supabase_project_url
SUPABASE_MASTER_API_KEY=your_supabase_service_role_key
```

#### Database Access

- **Public Access**: Read-only access to film, developer, and combination data
- **Admin Access**: Full database access is restricted to administrators only
- **Authentication**: Uses Supabase service role key for secure database operations
- **Rate Limiting**: Master API key provides high rate limits for production use

## Contributing

We welcome contributions from the analog photography community!

- **GitHub**: [https://github.com/narrowstacks/dorkroom-nx](https://github.com/narrowstacks/dorkroom-nx)
- **Issues**: Report bugs or request features
- **Pull Requests**: Submit improvements and new calculators

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-calculator`
3. Make your changes following our code organization guidelines:
   - **Business Logic**: Add calculations, utilities, types, and hooks to `packages/logic/`
   - **UI Components**: Add reusable components and contexts to `packages/ui/`
   - **Application Code**: Add pages and app-specific components to `apps/dorkroom/`
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
   
   # Format code
   bunx prettier --write .
   ```
6. Submit a pull request

## Code Quality

This project maintains high code quality standards with package-specific tooling:

### Package Organization

- **`packages/logic/`** - Pure TypeScript business logic (calculations, utilities, types, hooks)
- **`packages/ui/`** - Reusable React components and contexts  
- **`packages/api/`** - API utilities and client code
- **`apps/dorkroom/`** - Main application with pages and app-specific components

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
bunx prettier --write . # Format all code
```

## Project Commands

| Command                                  | Description                    |
| ---------------------------------------- | ------------------------------ |
| `bunx nx dev dorkroom -- --host=0.0.0.0` | Start development server       |
| `bunx nx build dorkroom`                 | Build production bundle        |
| `bunx nx test`                           | Run tests                      |
| `bunx nx lint dorkrooom`                 | Run ESLint                     |
| `bunx nx typecheck dorkrooom`            | TypeScript checking            |
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
