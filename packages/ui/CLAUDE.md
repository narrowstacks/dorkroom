# @dorkroom/ui

Shared UI components for Dorkroom.

## Before You Start

1. **Use Context7** for Tailwind CSS docs before making changes
2. **Watch for circular dependencies** between @dorkroom packages

## Structure

```
src/
├── components/   # Reusable UI components
├── contexts/     # React contexts
├── forms/        # Form-specific components
├── hooks/        # Custom React hooks
├── lib/          # Utilities (cn, etc.)
└── index.ts      # Public exports
```

## Key Patterns

### Components

- PascalCase names, kebab-case files
- Props interface: `ComponentNameProps`
- Use `cn()` for conditional Tailwind classes
- Accept optional `className` prop for overrides

### Form Components

Must work with TanStack Form:

- Accept `value` and `onChange` for controlled behavior
- Support optional `error` prop
- Include `label` for accessibility

### Icons

Use `lucide-react` with `className` for sizing:

```tsx
<Camera className="h-5 w-5" />
```

### Exports

All exports through `src/index.ts`. Never import internal paths.

## Accessibility

- Semantic HTML (`<button>`, `<label>`, `<input>`)
- ARIA labels where needed
- Focus states (`:focus-visible`)
- Keyboard navigation
