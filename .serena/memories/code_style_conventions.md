# Code Style and Conventions

## TypeScript Configuration

- Strict TypeScript enabled with comprehensive type checking
- ES2022 target with ESNext modules
- Isolated modules and declaration maps enabled
- No unused locals allowed

## Code Style

- **Quotes**: Single quotes (Prettier configured)
- **Imports**: ES6 imports/exports
- **Components**: React functional components with TypeScript
- **Props**: Interface definitions for component props (e.g., `LabeledSliderInputProps`)

## File Structure Conventions

- Components exported from index files with explicit exports
- UI components in `packages/ui/src/components/`
- Utilities in dedicated `lib/` directories
- Named exports preferred over default exports for components

## Naming Conventions

- **Components**: PascalCase (e.g., `LabeledSliderInput`)
- **Props Interfaces**: ComponentNameProps pattern
- **Files**: kebab-case for component files (e.g., `labeled-slider-input.tsx`)
- **CSS Classes**: Tailwind utility classes with `cn()` utility for conditional classes

## React Patterns

- Props destructuring in component parameters
- Optional props with default values
- Event handlers with proper TypeScript typing
- Controlled components pattern

## Styling Approach

- Tailwind CSS for styling
- `cn()` utility function (clsx + tailwind-merge) for conditional classes
- Dark theme with white/opacity color scheme
- Responsive design considerations
