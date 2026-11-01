/*
 * `@dorkroom/logic/calculators`: the calculators' link params, links,
 * defaults, math and display formatting, for code that runs outside React.
 *
 * The serverless functions in `api/` (the crawler metadata in `meta.ts` and
 * the edge-runtime OG cards in `og.tsx`, through `utils/calculatorShare.ts`)
 * import this instead of the root entry, which also carries React hooks and
 * TanStack Query. Everything here is a pure module: no React, no hooks, no
 * browser globals, so it is safe on Node and on the edge runtime.
 *
 * Add exports here only from `constants/`, `schemas/`, `types/` and `utils/`
 * modules that keep to that rule. `src/__tests__/calculators-entry.test.ts`
 * fails if this entry reaches a hook or React.
 */

export {
  ASPECT_RATIO_MAP,
  PAPER_SIZE_MAP,
} from './constants/border-calculator';
export {
  BORDER_CALCULATOR_LINK_PARAMS,
  CAMERA_EXPOSURE_LINK_PARAMS,
  EXPOSURE_CALCULATOR_LINK_PARAMS,
  LENS_CALCULATOR_LINK_PARAMS,
  MAT_CALCULATOR_LINK_PARAMS,
  RECIPROCITY_CALCULATOR_LINK_PARAMS,
  RESIZE_CALCULATOR_LINK_PARAMS,
} from './constants/calculator-link-params';
export { CAMERA_EXPOSURE_DEFAULTS } from './constants/camera-exposure-defaults';
export { LENS_DEFAULTS } from './constants/lens-calculator-defaults';
export {
  calculateMatLayout,
  MAT_CALCULATOR_DEFAULTS,
  type MatLayout,
  toFraction,
} from './constants/mat-calculator';
export { RESIZE_FORM_DEFAULTS } from './constants/resize-calculator';
export {
  borderCalculatorLink,
  borderStateFromLink,
} from './schemas/border-calculator-persistence';
export { cameraExposureLink } from './schemas/camera-exposure-calculator.schema';
export {
  EXPOSURE_FORM_DEFAULTS,
  exposureCalculatorLink,
} from './schemas/exposure-calculator.schema';
export { lensCalculatorLink } from './schemas/lens-calculator.schema';
export { matCalculatorLink } from './schemas/mat-calculator.schema';
export {
  RECIPROCITY_FORM_DEFAULTS,
  reciprocityCalculatorLink,
} from './schemas/reciprocity-calculator.schema';
export { resizeCalculatorLink } from './schemas/resize-calculator.schema';
export { computeBorderLayout } from './utils/border-layout';
export type {
  CalculatorLinkParamMap,
  CalculatorLinkSearch,
} from './utils/calculator-url-params';
export {
  calculateExposureValue,
  formatAperture,
  formatShutterSpeed,
} from './utils/camera-exposure-calculations';
export {
  calculateExposureAdjustment,
  formatExposureTime,
} from './utils/exposure-calculations';
export {
  calculateLensEquivalency,
  formatFocalLength,
} from './utils/lens-calculations';
export {
  calculateReciprocityForForm,
  formatReciprocityTime,
} from './utils/reciprocity-calculations';
export { calculateResizeExposure } from './utils/resize-calculations';
export { formatDimensionPair } from './utils/unit-conversion';
