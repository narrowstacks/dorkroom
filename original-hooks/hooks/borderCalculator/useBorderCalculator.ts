/* ------------------------------------------------------------------ *\
   useBorderCalculator.ts
   -------------------------------------------------------------
   [DEPRECATED] Legacy monolithic hook - use modular version instead
   -------------------------------------------------------------
   This file now re-exports the modular implementation from 
   hooks/borderCalculator/index.ts
   
   The original monolithic implementation has been split into:
   - useBorderCalculatorState: Core state management and persistence
   - useDimensionCalculations: Paper size, aspect ratio calculations
   - useGeometryCalculations: Print size, borders, blade readings
   - useWarningSystem: Debounced warning management
   - useImageHandling: Image-related state and operations
   - useInputHandlers: Input validation and setter functions
   
   For new development, import from:
   import { useBorderCalculator } from '@/hooks/borderCalculator';
\* ------------------------------------------------------------------ */

// Re-export the modular implementation
export { useBorderCalculator, default } from './index';
