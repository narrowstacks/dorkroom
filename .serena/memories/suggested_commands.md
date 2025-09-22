# Development Commands

## Primary Development Commands
- `npx nx serve dorkroom` - Start development server for main app
- `npx nx build dorkroom` - Build production bundle for main app
- `npx nx dev dorkroom` - Alternative dev command (from Nx React router plugin)

## Testing Commands
- `npx nx test` - Run tests with Vitest
- `npx nx test --ui` - Run tests with Vitest UI

## Code Quality Commands
- `npx nx lint` - Run ESLint on all projects
- `npx nx lint dorkroom` - Lint specific project
- `npx nx typecheck` - Run TypeScript type checking
- `npx nx typecheck dorkroom` - Type check specific project

## Build and Package Commands
- `npx nx build` - Build all projects
- `npx nx build ui` - Build UI package
- `npx nx build logic` - Build logic package

## Nx Workspace Commands
- `npx nx graph` - Visualize project dependencies
- `npx nx show project dorkroom` - Show available targets for dorkroom
- `npx nx list` - List installed plugins
- `npx nx g @nx/react:app <name>` - Generate new React app
- `npx nx g @nx/react:lib <name>` - Generate new React library

## Formatting
- `npx prettier --write .` - Format all files with Prettier