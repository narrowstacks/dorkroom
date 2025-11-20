# @dorkroom/ui Package

This package contains all shared UI components for the Dorkroom application.

## Important

- **Always use Context7 before interacting with dependencies such as Tailwind CSS**, so you have the most up-to-date information on said dependency.
- **Always watch out for circular dependencies between the dorkroom packages, avoid it at all costs.**

## Package Structure

```
packages/ui/src/
├── components/      # Reusable UI components
├── contexts/        # React contexts for shared state
├── forms/           # Form-specific components and utilities
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── types/           # TypeScript type definitions
└── index.ts         # Public exports
```

## Component Conventions

### Naming and File Structure

- **PascalCase** for component names (`LabeledSliderInput`, `BorderCalculator`)
- **kebab-case** for file names (`labeled-slider-input.tsx`, `border-calculator.tsx`)
- **Interface naming**: `ComponentNameProps` for props interfaces

Example:

```typescript
// labeled-slider-input.tsx
export interface LabeledSliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function LabeledSliderInput({ label, value, onChange, min = 0, max = 100 }: LabeledSliderInputProps) {
  // Component implementation
}
```

### Component Patterns

**Functional components with TypeScript:**

```typescript
import { cn } from '../lib/utils';

export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', size = 'md', children, onClick }: ButtonProps) {
  return (
    <button className={cn('rounded-md font-medium transition-colors', variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700', variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300', size === 'sm' && 'px-2 py-1 text-sm', size === 'md' && 'px-4 py-2', size === 'lg' && 'px-6 py-3 text-lg')} onClick={onClick}>
      {children}
    </button>
  );
}
```

**Key Patterns:**

- Props destructuring with default values
- Use `cn()` utility for conditional Tailwind classes
- Always type props with dedicated interface
- Controlled components (state managed by parent)

### Tailwind CSS Usage

**Using the `cn()` utility:**

The `cn()` utility (from `lib/utils.ts`) combines `clsx` and `tailwind-merge` to handle conditional classes:

```typescript
import { cn } from '../lib/utils';

// Conditional classes
<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class',
  customClassName
)} />

// Override Tailwind classes (tailwind-merge handles conflicts)
<div className={cn('p-4 text-red-500', className)} />
```

**Best Practices:**

- Always use `cn()` when combining conditional classes
- Let `tailwind-merge` handle class conflicts
- Keep base classes first, conditions after
- Accept optional `className` prop for consumer overrides

### Form Components

**TanStack Form Integration:**

UI components should work seamlessly with TanStack Form:

```typescript
import { useForm, FieldApi } from '@tanstack/react-form';
import { LabeledSliderInput } from '@dorkroom/ui';

export function MyForm() {
  const form = useForm({
    defaultValues: { borderSize: 10 },
  });

  return <form.Field name="borderSize">{(field: FieldApi<any, any, any, any, number>) => <LabeledSliderInput label="Border Size" value={field.state.value} onChange={(value) => field.handleChange(value)} min={0} max={100} />}</form.Field>;
}
```

**Form Component Patterns:**

- Accept `value` and `onChange` props for controlled behavior
- Support optional `error` prop for validation messages
- Include `label` prop for accessibility
- Use semantic HTML (`<label>`, `<input>`, etc.)

### Icons

**Using lucide-react:**

```typescript
import { Camera, Aperture, Clock } from 'lucide-react';

export function ToolIcon() {
  return (
    <div className="flex items-center gap-2">
      <Camera className="h-5 w-5" />
      <Aperture className="h-5 w-5 text-blue-600" />
      <Clock className="h-5 w-5" strokeWidth={1.5} />
    </div>
  );
}
```

**Icon Conventions:**

- Import named exports from `lucide-react`
- Use `className` for sizing and colors
- Default size: `h-5 w-5` or `h-6 w-6`
- Adjust `strokeWidth` for visual weight (default: 2)

## Exports and Imports

**Public API:**

All exports go through `src/index.ts`:

```typescript
// src/index.ts
export { Button } from './components/button';
export type { ButtonProps } from './components/button';
export { LabeledSliderInput } from './forms/labeled-slider-input';
export type { LabeledSliderInputProps } from './forms/labeled-slider-input';
export { cn } from './lib/utils';
```

**Importing in apps:**

```typescript
// In apps/dorkroom/
import { Button, LabeledSliderInput, cn } from '@dorkroom/ui';
import type { ButtonProps } from '@dorkroom/ui';
```

**Never import internal paths:**

```typescript
// ❌ Don't do this
import { Button } from '@dorkroom/ui/components/button';

// ✅ Do this
import { Button } from '@dorkroom/ui';
```

## Dependencies

**Core Dependencies:**

- `react` 19.0.0 (peer dependency)
- `clsx` - className utilities
- `tailwind-merge` - Tailwind class merging
- `lucide-react` - Icon library
- `@tailwindcss/postcss` 4.1.13

**Build Output:**

- TypeScript declarations (`.d.ts`) for all exports
- Tree-shakeable ES modules
- No CSS bundling (consumers handle Tailwind)

## Testing UI Components

**Vitest + React Testing Library:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Testing Best Practices:**

- Test user interactions, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`)
- Mock external dependencies
- Test accessibility attributes

## Accessibility Guidelines

**Always include:**

- Semantic HTML elements (`<button>`, `<label>`, `<input>`)
- ARIA labels where needed (`aria-label`, `aria-describedby`)
- Keyboard navigation support
- Focus states (`:focus-visible`)
- Color contrast (WCAG AA minimum)

**Example:**

```typescript
export function IconButton({ icon: Icon, label, onClick }: IconButtonProps) {
  return (
    <button onClick={onClick} aria-label={label} className="p-2 rounded-md hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500">
      <Icon className="h-5 w-5" />
    </button>
  );
}
```
