import { z } from 'zod';

/**
 * Validation schema for Border Calculator Form
 */

const dimensionNumber = z
  .number()
  .min(0, 'Value must be non-negative')
  .max(1000, 'Value is too large');

const aspectRatioOptions = [
  'custom',
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
  customAspectWidth: dimensionNumber.optional().default(4),
  customAspectHeight: dimensionNumber.optional().default(5),
  paperSize: z.enum(paperSizeOptions),
  customPaperWidth: dimensionNumber.optional().default(8),
  customPaperHeight: dimensionNumber.optional().default(10),

  // Borders & Offsets
  minBorder: z
    .number()
    .min(0.125, 'Minimum border must be at least 0.125 inches')
    .max(4, 'Minimum border cannot exceed 4 inches'),

  enableOffset: z.boolean().default(false),
  ignoreMinBorder: z.boolean().default(false),
  horizontalOffset: z
    .number()
    .min(-2, 'Horizontal offset cannot be less than -2')
    .max(2, 'Horizontal offset cannot be more than +2'),

  verticalOffset: z
    .number()
    .min(-2, 'Vertical offset cannot be less than -2')
    .max(2, 'Vertical offset cannot be more than +2'),

  // Blade Visualization
  showBlades: z.boolean().default(false),
  showBladeReadings: z.boolean().default(false),
  isLandscape: z.boolean().default(false),
  isRatioFlipped: z.boolean().default(false),

  // Presets
  selectedPresetId: z.string().optional(),
  presetName: z.string().optional(),
  isEditingPreset: z.boolean().default(false),
});

export type BorderCalculatorFormData = z.infer<typeof borderCalculatorSchema>;
