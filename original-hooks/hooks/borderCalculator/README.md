# Border Calculator Hooks

This directory contains the modular implementation of the border calculator functionality, split from the original monolithic `useBorderCalculator.ts` file.

## Structure

### Core Hook

- **`index.ts`** - Main orchestrating hook that composes all sub-hooks
- **`types.ts`** - Shared types and interfaces

### Specialized Hooks

- **`useBorderCalculatorState.ts`** - Core state management and persistence
- **`useDimensionCalculations.ts`** - Paper size, aspect ratio, and orientation calculations
- **`useGeometryCalculations.ts`** - Print size, borders, blade readings, and easel fitting
- **`useWarningSystem.ts`** - Debounced warning management to prevent flashing
- **`useImageHandling.ts`** - Image-related state and operations
- **`useInputHandlers.ts`** - Input validation and debounced field handlers

### Utilities

- **`../utils/inputValidation.ts`** - Shared input parsing and validation utilities

## Usage

### Standard Usage

```typescript
import { useBorderCalculator } from "@/hooks/borderCalculator";

function MyComponent() {
  const {
    aspectRatio,
    setAspectRatio,
    calculation,
    // ... all other properties
  } = useBorderCalculator();

  // Use as before - the API is identical
}
```

### Advanced Usage (Individual Hooks)

```typescript
import {
  useBorderCalculatorState,
  useDimensionCalculations,
  useGeometryCalculations,
} from "@/hooks/borderCalculator";

function MyComponent() {
  const { state, dispatch } = useBorderCalculatorState();
  const { orientedDimensions } = useDimensionCalculations(state);
  const { calculation } = useGeometryCalculations(
    state,
    orientedDimensions /* ... */,
  );
}
```

## Benefits

1. **Maintainability** - Each hook has a single responsibility
2. **Testability** - Individual hooks can be tested in isolation
3. **Performance** - Better memoization and dependency tracking
4. **Reusability** - Specialized hooks can be used independently
5. **Type Safety** - Stronger typing with dedicated interfaces

## Migration

The original `useBorderCalculator.ts` file now re-exports this modular implementation, so existing code continues to work without changes. For new development, prefer importing from `@/hooks/borderCalculator`.

## Debugging

Each hook handles its own console warnings and errors. Look for prefixes in console messages to identify which hook is reporting issues:

- State persistence errors: `"Failed to load/save calculator state"`
- Dimension calculation warnings: `"Unknown paper size/aspect ratio"`
- Geometry calculation issues: Check for negative blade readings or easel fitting warnings
