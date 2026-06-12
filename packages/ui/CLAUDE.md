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

## Design conventions

New components must follow these scales. When an existing component
disagrees, prefer the scale for new code; don't mass-refactor.

### Color
- ONLY theme variables: `var(--color-*)` (and accent variants `var(--accent-*)`).
- Never raw Tailwind palette classes (`text-indigo-400`) — the four themes
  (dark / light / high-contrast / darkroom) restyle variables, not classes.
- Tailwind usage: `text-[color:var(--color-text-primary)]` for classes;
  inline `style` only where a class can't express it (dynamic var names).

### Radius
| Element | Class |
|---|---|
| Cards (ToolCard, StatCard, CalculatorCard) | `rounded-2xl` |
| Buttons, inputs, icon tiles | `rounded-xl` |
| Badges, tags, small controls | `rounded-lg` |
| Modals, dialogs | `rounded-2xl` |
| Large hero/preview panels (border calculator) | `rounded-3xl` |
| Pills, avatars, FABs | `rounded-full` |

### Type
| Role | Classes |
|---|---|
| Page title | `text-3xl md:text-4xl font-semibold tracking-tight` |
| Section heading | `text-xl font-semibold` |
| Card title | `font-semibold` (base size) |
| Body / descriptions | `text-sm` |
| Captions, labels, eyebrows | `text-xs` (never `text-[10px]`) |

Weights: `font-medium` = emphasis, `font-semibold` = headings,
`font-bold` = stat values only.

### Spacing
- Card padding: `p-4` (default) / `p-5` (roomy) / `p-3.5 sm:p-4` (compact).
- Grid gaps: `gap-4` (page sections: `gap-4 lg:gap-6`).
- Icon-to-text: `gap-3` or `gap-4`.

### Elevation
`shadow-subtle` = resting, `shadow-lg` = hover lift, `shadow-xl` = overlays.

### Motion & focus
- Transitions only (`transition-colors` / `transition-all`, default
  duration). High-contrast and darkroom themes disable ALL animation
  globally — never rely on motion to convey state.
- Interactive elements: `focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-[color:var(--color-border-primary)]`. Never bare
  `focus:` rings; never remove an outline without adding a ring.

## Accessibility

- Semantic HTML (`<button>`, `<label>`, `<input>`)
- ARIA labels where needed
- Focus states (`:focus-visible`)
- Keyboard navigation
