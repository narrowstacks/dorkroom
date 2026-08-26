import { z } from 'zod';
import {
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  PAPER_SIZE_MAP,
  SLIDER_MIN_BORDER,
} from '../constants/border-calculator';
import { BORDER_CALCULATOR_DEFAULTS } from '../constants/border-calculator-defaults';
import { computeMaxAllowedMinBorder } from '../utils/border-calculations';
import { dimensionValidator } from './validators';

/**
 * Validation schema for Border Calculator Form
 */

const dimensionNumber = dimensionValidator();

export const aspectRatioOptions = [
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

export const paperSizeOptions = [
  'custom',
  '5x7',
  '3.875x5.875',
  '8x10',
  '11x14',
  '16x20',
  '20x24',
] as const;

/** Runtime contract for `AspectRatioValue`. */
export const aspectRatioValueSchema = z.enum(aspectRatioOptions);

/** Runtime contract for `PaperSizeValue`. */
export const paperSizeValueSchema = z.enum(paperSizeOptions);

const borderCalculatorObjectSchema = z.object({
  // Paper Setup
  aspectRatio: aspectRatioValueSchema,
  customAspectWidth: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customAspectWidth),
  customAspectHeight: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customAspectHeight),
  paperSize: paperSizeValueSchema,
  customPaperWidth: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customPaperWidth),
  customPaperHeight: dimensionNumber
    .optional()
    .default(BORDER_CALCULATOR_DEFAULTS.customPaperHeight),

  // Borders & Offsets
  // The static bound only enforces the slider floor; the paper-dependent
  // ceiling is enforced by the superRefine below.
  minBorder: z
    .number()
    .min(
      SLIDER_MIN_BORDER,
      `Minimum border cannot be less than ${SLIDER_MIN_BORDER} inches`
    ),

  enableOffset: z.boolean().default(BORDER_CALCULATOR_DEFAULTS.enableOffset),
  ignoreMinBorder: z
    .boolean()
    .default(BORDER_CALCULATOR_DEFAULTS.ignoreMinBorder),
  horizontalOffset: z
    .number()
    .min(
      OFFSET_SLIDER_MIN,
      `Horizontal offset cannot be less than ${OFFSET_SLIDER_MIN}`
    )
    .max(
      OFFSET_SLIDER_MAX,
      `Horizontal offset cannot be more than +${OFFSET_SLIDER_MAX}`
    ),

  verticalOffset: z
    .number()
    .min(
      OFFSET_SLIDER_MIN,
      `Vertical offset cannot be less than ${OFFSET_SLIDER_MIN}`
    )
    .max(
      OFFSET_SLIDER_MAX,
      `Vertical offset cannot be more than +${OFFSET_SLIDER_MAX}`
    ),

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

export const borderCalculatorSchema = borderCalculatorObjectSchema.superRefine(
  (values, ctx) => {
    const paper =
      values.paperSize === 'custom'
        ? { width: values.customPaperWidth, height: values.customPaperHeight }
        : PAPER_SIZE_MAP.get(values.paperSize);
    if (!paper) return;

    const maxAllowed = computeMaxAllowedMinBorder(paper.width, paper.height);
    // maxAllowed is 0 when the paper dimensions are degenerate (e.g. a custom
    // size still being typed); the paper fields report that error themselves.
    if (maxAllowed > 0 && values.minBorder > maxAllowed) {
      const displayMax = Math.round(maxAllowed * 1000) / 1000;
      ctx.addIssue({
        code: 'custom',
        path: ['minBorder'],
        message: `Minimum border cannot exceed ${displayMax} inches for this paper size`,
      });
    }
  }
);

export type BorderCalculatorFormData = z.infer<typeof borderCalculatorSchema>;
