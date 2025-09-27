# Development Commands

## Primary Development Commands

- `bunx nx serve dorkroom` - Start development server for main app
- `bunx nx build dorkroom` - Build production bundle for main app
- `bunx nx dev dorkroom` - Alternative dev command (from Nx React router plugin)

## Testing Commands

- `bunx nx test` - Run tests with Vitest
- `bunx nx test --ui` - Run tests with Vitest UI

## Code Quality Commands

- `bunx nx lint` - Run ESLint on all projects
- `bunx nx lint dorkroom` - Lint specific project
- `bunx nx typecheck` - Run TypeScript type checking
- `bunx nx typecheck dorkroom` - Type check specific project

## Build and Package Commands

- `bunx nx build` - Build all projects
- `bunx nx build ui` - Build UI package
- `bunx nx build logic` - Build logic package

## Nx Workspace Commands

- `bunx nx graph` - Visualize project dependencies
- `bunx nx show project dorkroom` - Show available targets for dorkroom
- `bunx nx list` - List installed plugins
- `bunx nx g @nx/react:app <name>` - Generate new React app
- `bunx nx g @nx/react:lib <name>` - Generate new React library

## Formatting

- `bunx prettier --write .` - Format all files with Prettier
