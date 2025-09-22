# Task Completion Workflow

When completing development tasks in this project, run these commands:

## Code Quality Checks
1. **Lint**: `npx nx lint` - Check for ESLint violations
2. **Type Check**: `npx nx typecheck` - Verify TypeScript types
3. **Format**: `npx prettier --write .` - Format code with Prettier

## Testing
- **Run Tests**: `npx nx test` - Execute Vitest test suite
- **Test Coverage**: Check test coverage as part of validation

## Build Verification
- **Build**: `npx nx build` - Ensure all packages build successfully
- **Build Main App**: `npx nx build dorkroom` - Verify main application builds

## Nx-Specific Considerations
- Use `npx nx affected:lint` and `npx nx affected:test` for large monorepos
- Check module boundaries with ESLint rule `@nx/enforce-module-boundaries`
- Verify dependency graph with `npx nx graph`

## Development Server
- **Local Testing**: `npx nx serve dorkroom` - Test changes locally before completion

Note: This is an Nx workspace, so always use `npx nx` commands rather than npm scripts.