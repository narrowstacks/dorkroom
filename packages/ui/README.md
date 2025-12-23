# @dorkroom/ui

Shared UI components, contexts, and utilities for Dorkroom.

## Overview

This package provides the presentation layer for Dorkroom, including:

- **Components** - Reusable React components
- **Form Components** - TanStack Form integrated inputs
- **Contexts** - Theme, measurement, and temperature providers
- **Utilities** - Styling helpers and navigation

## Installation

```bash
# Internal monorepo usage only
import { NumberInput, Modal, useTheme } from '@dorkroom/ui';
```

## Structure

```
src/
├── components/
│   ├── border-calculator/     # Border calculator UI components
│   ├── calculator/            # Shared calculator components
│   ├── development-recipes/   # Recipe browser components
│   ├── marketing/             # Landing page components
│   └── ui/                    # Base UI primitives
├── contexts/          # React context providers
├── forms/             # TanStack Form components
├── hooks/             # UI-specific hooks
└── lib/               # Utilities and constants
```

## Core Components

### Input Components

```tsx
import { NumberInput, TextInput, Select, SearchableSelect } from '@dorkroom/ui';

// Number input with validation
<NumberInput
  value={borderSize}
  onChange={setBorderSize}
  min={0}
  max={10}
  step={0.1}
  label="Border Size"
/>

// Text input
<TextInput
  value={name}
  onChange={setName}
  placeholder="Recipe name"
/>

// Select dropdown
<Select
  value={selectedFilm}
  onChange={setSelectedFilm}
  options={filmOptions}
/>

// Searchable select with filtering
<SearchableSelect
  value={selectedDeveloper}
  onChange={setSelectedDeveloper}
  options={developerOptions}
  placeholder="Search developers..."
/>
```

### Layout Components

```tsx
import { Modal, Drawer, CollapsibleSection } from '@dorkroom/ui';

// Modal dialog
<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Settings">
  <SettingsContent />
</Modal>

// Side drawer
<Drawer isOpen={showDrawer} onClose={() => setShowDrawer(false)}>
  <DrawerContent>
    <FilterPanel />
  </DrawerContent>
</Drawer>

// Collapsible section
<CollapsibleSection title="Advanced Options" defaultOpen={false}>
  <AdvancedSettings />
</CollapsibleSection>
```

### Calculator Components

```tsx
import {
  CalculatorCard,
  CalculatorStat,
  CalculatorPageHeader,
  CalculatorNumberField
} from '@dorkroom/ui';

// Card wrapper for calculator sections
<CalculatorCard title="Paper Setup">
  <PaperInputs />
</CalculatorCard>

// Display calculated result
<CalculatorStat
  label="Image Area"
  value="35.5"
  unit="sq in"
/>

// Page header with navigation
<CalculatorPageHeader
  title="Border Calculator"
  description="Calculate precise print borders"
/>
```

### Feedback Components

```tsx
import { Toast, useToast, WarningAlert, Tooltip } from '@dorkroom/ui';

// Toast notifications
function MyComponent() {
  const { showToast } = useToast();

  const handleSave = () => {
    // ... save logic
    showToast({ message: 'Saved successfully', type: 'success' });
  };
}

// Warning alert
<WarningAlert>
  Border size exceeds safe print margin
</WarningAlert>

// Tooltip
<Tooltip content="Click to copy share link">
  <ShareButton />
</Tooltip>
```

## Form Components

TanStack Form integrated components for type-safe forms.

```tsx
import {
  TextField,
  NumberField,
  SelectField,
  CheckboxField,
  TextareaField
} from '@dorkroom/ui';

function RecipeForm() {
  const form = useForm({
    defaultValues: { name: '', temperature: 20 },
  });

  return (
    <form.Provider>
      <form.Field name="name">
        {(field) => <TextField field={field} label="Recipe Name" />}
      </form.Field>

      <form.Field name="temperature">
        {(field) => (
          <NumberField field={field} label="Temperature" unit="°C" />
        )}
      </form.Field>
    </form.Provider>
  );
}
```

## Context Providers

### Theme Context

```tsx
import { ThemeProvider, useTheme } from '@dorkroom/ui';

// Wrap app with provider
<ThemeProvider>
  <App />
</ThemeProvider>

// Use in components
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Current: {resolvedTheme}
    </button>
  );
}
```

Available themes: `light`, `dark`, `darkroom`, `high-contrast`

### Measurement Context

```tsx
import { MeasurementProvider, useMeasurement } from '@dorkroom/ui';

// Wrap with provider
<MeasurementProvider>
  <Calculator />
</MeasurementProvider>

// Use in components
function DimensionDisplay({ inches }: { inches: number }) {
  const { unit, convert, format } = useMeasurement();

  return <span>{format(convert(inches))}</span>;
}
```

### Temperature Context

```tsx
import { TemperatureProvider, useTemperature } from '@dorkroom/ui';

// Wrap with provider
<TemperatureProvider>
  <RecipeBrowser />
</TemperatureProvider>

// Use in components
function TemperatureDisplay({ celsius }: { celsius: number }) {
  const { unit, format } = useTemperature();

  return <span>{format(celsius)}</span>;
}
```

## Utilities

### Class Name Utility

```tsx
import { cn } from '@dorkroom/ui';

// Merge Tailwind classes with conflict resolution
<div className={cn(
  'p-4 bg-white',
  isActive && 'bg-blue-500',
  className
)} />
```

### Navigation

```tsx
import { navItems, ROUTE_TITLES, ROUTE_DESCRIPTIONS } from '@dorkroom/ui';

// Navigation items for menus
navItems.map(item => (
  <Link key={item.path} to={item.path}>
    {item.label}
  </Link>
));

// Route metadata for SEO
const title = ROUTE_TITLES['/border'];
const description = ROUTE_DESCRIPTIONS['/border'];
```

## Component Guidelines

### Props Pattern

```tsx
interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

export function MyComponent({
  value,
  onChange,
  label,
  error,
  className,
}: MyComponentProps) {
  return (
    <div className={cn('base-styles', className)}>
      {label && <label>{label}</label>}
      {/* ... */}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
```

### Accessibility

- Use semantic HTML (`<button>`, `<label>`, `<input>`)
- Include ARIA labels where needed
- Support keyboard navigation
- Use `focus-visible` for focus states

## Development

### Building

```bash
turbo run build --filter=@dorkroom/ui
```

### Testing

```bash
turbo run test --filter=@dorkroom/ui
```

### Type Checking

```bash
turbo run typecheck --filter=@dorkroom/ui
```

## Architecture Notes

- **Depends on @dorkroom/logic** - Uses types and utilities from logic package
- **Tailwind CSS 4** - All styling via Tailwind utility classes
- **TanStack Form** - Form components integrate with TanStack Form
- **lucide-react** - All icons from Lucide icon library
- **No direct API calls** - Data fetching happens in @dorkroom/logic hooks
