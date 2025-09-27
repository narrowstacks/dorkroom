# Task Completion Workflow

When completing development tasks in this project, run these commands:

## Code Quality Checks

1. **Lint**: `bunx nx lint` - Check for ESLint violations
2. **Type Check**: `bunx nx typecheck` - Verify TypeScript types
3. **Format**: `bunx prettier --write .` - Format code with Prettier

## Testing

- **Run Tests**: `bunx nx test` - Execute Vitest test suite
- **Test Coverage**: Check test coverage as part of validation

## Build Verification

- **Build**: `bunx nx build` - Ensure all packages build successfully
- **Build Main App**: `bunx nx build dorkroom` - Verify main application builds

## Nx-Specific Considerations

- Use `bunx nx affected:lint` and `bunx nx affected:test` for large monorepos
- Check module boundaries with ESLint rule `@nx/enforce-module-boundaries`
- Verify dependency graph with `bunx nx graph`

## Development Server

- **Local Testing**: `bunx nx serve dorkroom` - Test changes locally before completion

Note: This is an Nx workspace, so always use `bunx nx` commands rather than npm scripts.
