# @dorkroom/ui

Shared UI components for the Dorkroom web app. Web only: the iOS app has its own
components and shares `@dorkroom/logic` instead.

## Before You Start

1. **Use Context7** for Tailwind CSS docs before making changes
2. **Watch for circular dependencies** between @dorkroom packages

## Structure

```
src/
├── components/            # Reusable UI components, grouped by feature
│   ├── border-calculator/ calculator/ detail-panel/ development-recipes/
│   ├── films/ filters/ marketing/ resize/
│   └── *.tsx              # Cross-cutting primitives (modal, select, number-input, …)
├── contexts/              # Theme + unit contexts (measurement, temperature, volume)
├── forms/                 # Form-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (cn, themes, color, select-options, …)
├── types/                 # Ambient declarations (assets, tanstack-table)
├── index.ts               # Root entry point
└── calculator.ts, border-calculator.ts,
    development-recipes.ts, films.ts    # Additional entry points
```

## Entry points

`package.json` `exports` publishes six entry points, and all six are fair game
from apps:

| Import | Contents |
| --- | --- |
| `@dorkroom/ui` | Shared primitives and cross-cutting components |
| `@dorkroom/ui/forms` | Form field components |
| `@dorkroom/ui/calculator` | Calculator shell and layout pieces |
| `@dorkroom/ui/border-calculator` | Border-calculator-specific components |
| `@dorkroom/ui/development-recipes` | Recipe table, filters, detail views |
| `@dorkroom/ui/films` | Film cards, detail panel, skeletons |

The split keeps route-specific bundles out of the root barrel. A component used
by exactly one feature belongs on that feature's entry point, not in
`index.ts`. Anything **not** listed above is an internal path: never import
`@dorkroom/ui/src/...` or `@dorkroom/ui/components/...`.

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

## Design conventions

New components must follow these scales. When an existing component
disagrees, prefer the scale for new code; don't mass-refactor.

### Color

- ONLY theme variables: `var(--color-*)` (and accent variants `var(--accent-*)`).
- Never raw Tailwind palette classes (`text-indigo-400`). The four themes
  (dark / light / high-contrast / darkroom) restyle variables, not classes.
- Tailwind usage: `text-[color:var(--color-text-primary)]` for classes;
  inline `style` only where a class can't express it (dynamic var names).
- Theme tokens are defined in `apps/dorkroom/src/styles/theme.css`, one block
  per `[data-theme]`. Adding a token means adding it to every theme.

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

`shadow-lg` = hover lift, `shadow-xl` = overlays. Resting surfaces get a border
(`border-[color:var(--color-border-secondary)]`), not a shadow.

Note on `shadow-subtle`: several existing components carry this class, but no
`--shadow-subtle` token exists, so Tailwind emits no shadow rule for it. It
survives only as a selector hook for one darkroom-theme rule in `theme.css`.
Don't reach for it in new code expecting a visible shadow.

### Motion and focus

- Transitions only (`transition-colors` / `transition-all`, default duration).
- The high-contrast and darkroom themes, plus the user's
  `data-animations-disabled="true"` setting, kill every animation and transition
  globally with `!important` (`styles/utilities.css`). Never rely on motion to
  convey state.
- Interactive elements: `focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-[color:var(--color-focus-ring)]`. Never bare
  `focus:` rings; never remove an outline without adding a ring.
  `--color-focus-ring` is a dedicated token (not `--color-border-primary`) so
  the ring stays at 3:1 or better against the surface in every theme. The
  dark/light border tokens are translucent and fail contrast for focus
  indicators.

## Accessibility

- Semantic HTML (`<button>`, `<label>`, `<input>`)
- ARIA labels where needed
- Focus states (`:focus-visible`)
- Keyboard navigation
- `bun run doctor` blocks on accessibility warnings, so a missing label fails
  the build rather than the review
- Dialog dismissal on Escape goes through the shared `useEscapeKey` hook
  (`hooks/use-escape-key.ts`). Don't add a component-local `document` keydown
  listener for it: the hook owns a single listener plus a LIFO stack so only
  one layer is dismissed per keypress. Three pre-existing ad-hoc listeners
  (`theme-toggle.tsx`, `navigation-dropdown.tsx`,
  `apps/dorkroom/src/components/mobile-nav.tsx`) predate this and aren't
  covered yet
