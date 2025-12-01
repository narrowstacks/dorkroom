import { z } from 'zod';
import { BORDER_CALCULATOR_DEFAULTS } from '../constants/border-calculator-defaults';
import { dimensionValidator } from './validators';

/**
 * Validation schema for Border Calculator Form
 */

const dimensionNumber = dimensionValidator();

const aspectRatioOptions = [
  'custom',
  'even-borders',
  '3:2',
  '65:24',
  '4:3',
  '1:1',
  '7:6',
  '5:4',
  '7:5',
  '16:9',
  '1.37:1',
  '1.85:1',
  '2:1',
  '2.39:1',
  '2.76:1',
] as const;

const paperSizeOptions = [
  'custom',
  '5x7',
  '4x6',
  '8x10',
  '11x14',
  '16x20',
  '20x24',
] as const;

export const borderCalculatorSchema = z.object({
  // Paper Setup
  aspectRatio: z.enum(aspectRatioOptions),
  customAspectWidth: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customAspectWidth),
  customAspectHeight: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customAspectHeight),
  paperSize: z.enum(paperSizeOptions),
  customPaperWidth: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customPaperWidth),
  customPaperHeight: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customPaperHeight),

  // Borders & Offsets
  minBorder: z
    .number()
    .min(0.125, 'Minimum border must be at least 0.125 inches')
    .max(4, 'Minimum border cannot exceed 4 inches'),

  enableOffset: z.boolean().default(BORDER_CALCULATOR_DEFAULTS.enableOffset),
  ignoreMinBorder: z
    .boolean()
    .default(BORDER_CALCULATOR_DEFAULTS.ignoreMinBorder),
  horizontalOffset: z
    .number()
    .min(-2, 'Horizontal offset cannot be less than -2')
    .max(2, 'Horizontal offset cannot be more than +2'),

  verticalOffset: z
    .number()
    .min(-2, 'Vertical offset cannot be less than -2')
    .max(2, 'Vertical offset cannot be more than +2'),

  // Blade Visualization
  showBlades: z.boolean().default(BORDER_CALCULATOR_DEFAULTS.showBlades),
  showBladeReadings: z
    .boolean()
    .default(BORDER_CALCULATOR_DEFAULTS.showBladeReadings),
  isLandscape: z.boolean().default(BORDER_CALCULATOR_DEFAULTS.isLandscape),
  isRatioFlipped: z
    .boolean()
    .default(BORDER_CALCULATOR_DEFAULTS.isRatioFlipped),
  hasManuallyFlippedPaper: z.boolean().default(false),

  // Presets
  selectedPresetId: z.string().optional(),
  presetName: z.string().optional(),
  isEditingPreset: z.boolean().default(false),
});

export type BorderCalculatorFormData = z.infer<typeof borderCalculatorSchema>;

