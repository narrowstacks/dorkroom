import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
  PAPER_SIZE_MAP,
  SLIDER_MIN_BORDER,
} from '../../constants/border-calculator';
import {
  borderCalculatorSchema,
  paperSizeOptions,
} from '../../schemas/border-calculator.schema';
import { computeMaxAllowedMinBorder } from '../../utils/border-calculations';

/**
 * The schema is the onBlur form validator for the border calculator. Its
 * bounds must accept every value the sliders can produce (issue #240):
 * - offsets range over OFFSET_SLIDER_MIN..OFFSET_SLIDER_MAX
 * - minBorder ranges from SLIDER_MIN_BORDER up to the paper-dependent
 *   computeMaxAllowedMinBorder(paperW, paperH)
 */

type FormInput = z.input<typeof borderCalculatorSchema>;

const baseValues: FormInput = {
  aspectRatio: '3:2',
  paperSize: '8x10',
  customAspectWidth: 3,
  customAspectHeight: 2,
  customPaperWidth: 10,
  customPaperHeight: 13,
  minBorder: 0.5,
  enableOffset: false,
  ignoreMinBorder: false,
  horizontalOffset: 0,
  verticalOffset: 0,
  showBlades: false,
  showBladeReadings: false,
  isLandscape: true,
  isRatioFlipped: false,
  hasManuallyFlippedPaper: false,
  isEditingPreset: false,
};

const parse = (overrides: Partial<FormInput>) =>
  borderCalculatorSchema.safeParse({ ...baseValues, ...overrides });

const fieldErrors = (result: ReturnType<typeof parse>): string[] =>
  result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'));

describe('borderCalculatorSchema slider-range agreement', () => {
  describe('offsets', () => {
    it('accepts both offsets at the slider extremes', () => {
      const result = parse({
        horizontalOffset: OFFSET_SLIDER_MAX,
        verticalOffset: OFFSET_SLIDER_MIN,
      });
      expect(result.success).toBe(true);
    });

    it('accepts every step the offset sliders can produce', () => {
      for (
        let value = OFFSET_SLIDER_MIN;
        value <= OFFSET_SLIDER_MAX;
        value += OFFSET_SLIDER_STEP
      ) {
        const result = parse({
          horizontalOffset: value,
          verticalOffset: value,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects offsets beyond the slider range', () => {
      const tooHigh = parse({ horizontalOffset: OFFSET_SLIDER_MAX + 0.125 });
      expect(tooHigh.success).toBe(false);
      expect(fieldErrors(tooHigh)).toContain('horizontalOffset');

      const tooLow = parse({ verticalOffset: OFFSET_SLIDER_MIN - 0.125 });
      expect(tooLow.success).toBe(false);
      expect(fieldErrors(tooLow)).toContain('verticalOffset');
    });
  });

  describe('minBorder', () => {
    it('accepts the slider floor', () => {
      expect(parse({ minBorder: SLIDER_MIN_BORDER }).success).toBe(true);
    });

    it('rejects values below the slider floor', () => {
      const result = parse({ minBorder: SLIDER_MIN_BORDER - 0.125 });
      expect(result.success).toBe(false);
      expect(fieldErrors(result)).toContain('minBorder');
    });

    it('accepts the dynamic maximum for every standard paper size', () => {
      for (const paperSize of paperSizeOptions) {
        if (paperSize === 'custom') continue;
        const paper = PAPER_SIZE_MAP.get(paperSize);
        if (!paper) throw new Error(`Missing paper size entry: ${paperSize}`);
        const maxAllowed = computeMaxAllowedMinBorder(
          paper.width,
          paper.height
        );
        const result = parse({ paperSize, minBorder: maxAllowed });
        expect(result.success).toBe(true);
      }
    });

    it('accepts values above the old hardcoded cap of 4 on large paper', () => {
      // 20x24 paper allows up to 9.875; 4.5 was spuriously rejected before
      expect(parse({ paperSize: '20x24', minBorder: 4.5 }).success).toBe(true);
      expect(parse({ paperSize: '16x20', minBorder: 7.875 }).success).toBe(
        true
      );
    });

    it('rejects values above the dynamic maximum for the selected paper', () => {
      // 8x10 paper allows at most 3.875
      const result = parse({ paperSize: '8x10', minBorder: 4 });
      expect(result.success).toBe(false);
      expect(fieldErrors(result)).toContain('minBorder');
    });

    it('derives the maximum from custom paper dimensions', () => {
      const withinCustom = parse({
        paperSize: 'custom',
        customPaperWidth: 30,
        customPaperHeight: 40,
        minBorder: 14,
      });
      expect(withinCustom.success).toBe(true);

      const beyondCustom = parse({
        paperSize: 'custom',
        customPaperWidth: 30,
        customPaperHeight: 40,
        minBorder: 15,
      });
      expect(beyondCustom.success).toBe(false);
      expect(fieldErrors(beyondCustom)).toContain('minBorder');
    });

    it('skips the dynamic check while custom paper dimensions are degenerate', () => {
      const result = parse({
        paperSize: 'custom',
        customPaperWidth: 0,
        customPaperHeight: 0,
        minBorder: 2,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('unchanged in-range behavior', () => {
    it('accepts a typical in-range baseline', () => {
      expect(parse({}).success).toBe(true);
    });

    it('still rejects non-numeric values', () => {
      const result = borderCalculatorSchema.safeParse({
        ...baseValues,
        minBorder: 'wide',
      });
      expect(result.success).toBe(false);
    });
  });
});
