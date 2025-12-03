# Contributing to Dorkroom

Thank you for your interest in contributing to Dorkroom! This guide will help you get started.

## Ways to Contribute

- **Report Bugs** - Found something broken? [Open a bug report](https://github.com/narrowstacks/dorkroom/issues/new?template=bug_report.yml)
- **Suggest Features** - Have an idea? [Request a feature](https://github.com/narrowstacks/dorkroom/issues/new?template=feature_request.yml)
- **Add Film Data** - Know development times? [Submit a recipe](https://github.com/narrowstacks/dorkroom/issues/new?template=recipe_entry.yml)
- **Improve Documentation** - [Request doc improvements](https://github.com/narrowstacks/dorkroom/issues/new?template=documentation.yml)
- **Submit Code** - Fix bugs, add features, improve performance

## Development Setup

### Prerequisites

- **Node.js** 18+
- **Bun** (required for workspaces)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
```

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/dorkroom.git
cd dorkroom

# Install dependencies
bun install

# Set up environment (optional, for API testing)
cp .env.example .env

# Build packages
bunx nx build dorkroom

# Start development server
bunx nx dev dorkroom -- --host=0.0.0.0
```

## Code Guidelines

### Project Structure

```
apps/dorkroom/       # Main React application (routes, pages)
packages/logic/      # Business logic, hooks, queries, schemas
packages/ui/         # Reusable UI components
packages/api/        # API client and types
```

### Code Style

- **TypeScript** - All code must be typed. Never use `any`; prefer `unknown` when type is uncertain
- **Formatting** - Single quotes, semicolons, ES5 trailing commas (run `bun run format`)
- **Imports** - Always use package aliases (`@dorkroom/ui`, `@dorkroom/logic`, `@dorkroom/api`)
- **Components** - PascalCase names, kebab-case files, use `cn()` for Tailwind classes

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(border): add metric unit support
fix(reciprocity): correct Ilford calculation formula
docs: update API examples in README
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code guidelines above

3. **Run quality checks** (all must pass):
   ```bash
   bunx nx run-many --targets=lint,typecheck,test,build
   ```

4. **Format your code**:
   ```bash
   bun run format
   ```

### Submitting

1. Push your branch to your fork
2. Open a pull request against `main`
3. Fill out the PR template completely
4. Wait for CI checks to pass
5. Address any review feedback

### What We Look For

- **Does it work?** - Code should function as described
- **Is it tested?** - New features should include tests
- **Is it typed?** - No `any` types, proper TypeScript usage
- **Is it documented?** - Complex logic should have comments
- **Does it follow patterns?** - Consistent with existing code

## Testing

```bash
# Run all tests
bunx nx run-many -t test

# Test specific package
bunx nx test logic
bunx nx test ui
bunx nx test dorkroom

# Run tests with UI
bunx nx test --ui
```

### Writing Tests

- Use Vitest and Testing Library
- Wrap query hook tests with `QueryClientProvider` using `retry: false`
- Test both success and error cases
- Mock external dependencies

## Package-Specific Guidelines

Each package has its own documentation:

- **@dorkroom/logic** - See `packages/logic/CLAUDE.md` for query patterns, mutations, schemas
- **@dorkroom/ui** - See `packages/ui/CLAUDE.md` for component patterns, accessibility
- **@dorkroom/api** - See `packages/api/CLAUDE.md` for API types, error handling

## Getting Help

- **Questions?** - Open a [Discussion](https://github.com/narrowstacks/dorkroom/discussions)
- **Stuck?** - Comment on the issue you're working on
- **Found a security issue?** - See [SECURITY.md](SECURITY.md)

## Recognition

Contributors are recognized in several ways:
- Listed in GitHub's contributors graph
- Mentioned in release notes for significant contributions
- Special thanks in README for major features

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
