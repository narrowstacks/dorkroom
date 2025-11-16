import { z } from 'zod';

/**
 * Validation schema for Border Calculator Form
 */

const dimensionNumber = z
  .number()
  .min(0, 'Value must be non-negative')
  .max(1000, 'Value is too large');

const aspectRatioOptions = ['3:2', '4:3', '5:4', '1:1', '16:9', 'custom'] as const;
const paperSizeOptions = [
  '8x10',
  '11x14',
  '16x20',
  '20x24',
  '24x30',
  'custom',
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
