import { describe, it, expect, vi } from 'vitest';
import {
  findCenteringOffsets,
  calculateBladeThickness,
  calculateOptimalMinBorder,
  computePrintSize,
  clampOffsets,
  bordersFromGaps,
  bladeReadings,
  validatePrintFits,
} from '../../utils/border-calculations';

/**
 * Additional edge case and boundary tests for border-calculations utilities.
 * Extends the existing border-calculations.test.ts with:
 * - Extreme aspect ratios (ultra-wide panoramas, ultra-tall verticals)
 * - All preset paper size combinations
 * - Physical constraint validation
 * - Precision and rounding edge cases
 * - Invalid input handling
 */

// Mock the constants
vi.mock('../../constants/border-calculator', () => ({
  EASEL_SIZES: [
    { width: 10, height: 8, label: '8x10', value: '10x8' },
    { width: 14, height: 11, label: '11x14', value: '14x11' },
    { width: 20, height: 16, label: '16x20', value: '20x16' },
    { width: 24, height: 20, label: '20x24', value: '24x20' },
  ],
  BLADE_THICKNESS: 15,
}));

vi.mock('../../constants/calculations', () => ({
  CALCULATION_CONSTANTS: {
    BORDER_OPTIMIZATION: {
      SEARCH_SPAN: 0.5,
      STEP: 0.01,
      SNAP: 0.25,
      EPSILON: 1e-9,
      ADAPTIVE_STEP_DIVISOR: 100,
    },
    CACHE: {
      MAX_MEMO_SIZE: 50,
    },
    PAPER: {
      MAX_SCALE_FACTOR: 2,
    },
    PRECISION: {
      DECIMAL_PLACES: 2,
      ROUNDING_MULTIPLIER: 100,
    },
  },
  DERIVED_CONSTANTS: {
    BASE_PAPER_AREA: 480, // 20 * 24
  },
}));

describe('border-calculations: Edge Cases and Boundary Tests', () => {
  describe('Extreme Aspect Ratios', () => {
    // Tests for ultra-wide and ultra-tall ratios used in panoramic photography

    it('should handle ultra-wide panoramic ratio (XPan 65:24)', () => {
      const result = computePrintSize(24, 20, 65, 24, 1);

      // Should fit ultra-wide print on large landscape paper
      expect(result.printW).toBeGreaterThan(0);
      expect(result.printH).toBeGreaterThan(0);

      // Aspect ratio should be maintained
      const ratio = result.printW / result.printH;
      expect(ratio).toBeCloseTo(65 / 24, 2);
    });

    it('should handle CinemaScope ultra-wide (2.76:1)', () => {
      const result = computePrintSize(20, 16, 2.76, 1, 1.5);

      expect(result.printW).toBeGreaterThan(0);
      expect(result.printH).toBeGreaterThan(0);

      const ratio = result.printW / result.printH;
      expect(ratio).toBeCloseTo(2.76, 2);
    });

    it('should handle vertical panorama (1:3 - ultra-tall)', () => {
      const result = computePrintSize(11, 14, 1, 3, 0.5);

      expect(result.printW).toBeGreaterThan(0);
      expect(result.printH).toBeGreaterThan(0);

      // Should be constrained by available space
      expect(result.printW).toBeLessThanOrEqual(10); // 11 - 2*0.5
      expect(result.printH).toBeLessThanOrEqual(13); // 14 - 2*0.5
    });

    it('should handle extreme aspect ratio (10:1 - very wide)', () => {
      const result = computePrintSize(24, 20, 10, 1, 1);

      // On 24x20 with 1" borders: 22x18 available
      // 10:1 ratio should be width-constrained (not enough width for 10:1 at full height)
      expect(result.printW).toBeCloseTo(22, 1);
      expect(result.printH).toBeCloseTo(2.2, 1); // 22 / 10

      // Verify aspect ratio is maintained
      const ratio = result.printW / result.printH;
      expect(ratio).toBeCloseTo(10, 1);
    });

    it('should handle extreme vertical ratio (1:10 - very tall)', () => {
      const result = computePrintSize(20, 24, 1, 10, 1);

      // On 20x24 with 1" borders: 18x22 available
      // 1:10 ratio (height is 10x width)
      // If we use full height: height = 22, width = 22/10 = 2.2
      // If we use full width: width = 18, height = 180 (impossible!)
      // So it becomes height-constrained
      expect(result.printH).toBeCloseTo(22, 1);
      expect(result.printW).toBeCloseTo(2.2, 1);

      // Verify aspect ratio is maintained
      const ratio = result.printW / result.printH;
      expect(ratio).toBeCloseTo(0.1, 2); // 1:10 = 0.1
    });

    it('should handle square ratio (1:1) on all paper sizes', () => {
      const paperSizes = [
        { w: 5, h: 7 },
        { w: 8, h: 10 },
        { w: 11, h: 14 },
        { w: 16, h: 20 },
        { w: 20, h: 24 },
      ];

      paperSizes.forEach(({ w, h }) => {
        const result = computePrintSize(w, h, 1, 1, 0.5);

        // Square should be constrained by smaller dimension
        const smaller = Math.min(w, h) - 1; // minus 2*0.5 border
        expect(result.printW).toBeCloseTo(smaller, 1);
        expect(result.printH).toBeCloseTo(smaller, 1);
      });
    });
  });

  describe('All Preset Paper Sizes with Common Ratios', () => {
    // Tests that all standard paper sizes work correctly with common photo ratios

    it('should calculate correctly for 35mm (3:2) on all preset sizes', () => {
      const paperSizes = [
        { label: '5x7', w: 5, h: 7 },
        { label: '8x10', w: 8, h: 10 },
        { label: '11x14', w: 11, h: 14 },
        { label: '16x20', w: 16, h: 20 },
        { label: '20x24', w: 20, h: 24 },
      ];

      paperSizes.forEach(({ w, h }) => {
        const result = computePrintSize(w, h, 3, 2, 0.5);

        expect(result.printW).toBeGreaterThan(0);
        expect(result.printH).toBeGreaterThan(0);

        // Should maintain 3:2 aspect ratio
        const ratio = result.printW / result.printH;
        expect(ratio).toBeCloseTo(1.5, 2);

        // Should fit within paper with borders
        expect(result.printW).toBeLessThanOrEqual(w - 1);
        expect(result.printH).toBeLessThanOrEqual(h - 1);
      });
    });

    it('should calculate correctly for 6x6 (1:1) on all preset sizes', () => {
      const paperSizes = [
        { w: 8, h: 10 },
        { w: 11, h: 14 },
        { w: 16, h: 20 },
        { w: 20, h: 24 },
      ];

      paperSizes.forEach(({ w, h }) => {
        const result = computePrintSize(w, h, 1, 1, 1);

        expect(result.printW).toBeCloseTo(result.printH, 1);

        // Square should fit with 1" borders
        const expectedSize = Math.min(w, h) - 2;
        expect(result.printW).toBeCloseTo(expectedSize, 1);
      });
    });

    it('should handle 4x5 format on appropriate paper sizes', () => {
      // 4x5 large format aspect ratio on papers that can accommodate it
      const paperSizes = [
        { w: 8, h: 10 },
        { w: 11, h: 14 },
        { w: 16, h: 20 },
      ];

      paperSizes.forEach(({ w, h }) => {
        const result = computePrintSize(w, h, 5, 4, 0.5);

        const ratio = result.printW / result.printH;
        expect(ratio).toBeCloseTo(1.25, 2); // 5:4 = 1.25
      });
    });
  });

  describe('Minimum Border Physical Constraints', () => {
    // Tests for borders at the physical limits of darkroom practice

    it('should handle zero border (print fills entire paper)', () => {
      const result = computePrintSize(8, 10, 3, 2, 0);

      // With zero border, print should use full available space
      expect(result.printW).toBeGreaterThan(0);
      expect(result.printH).toBeGreaterThan(0);
    });

    it('should handle 0.125 inch border (minimum blade thickness)', () => {
      const result = computePrintSize(8, 10, 3, 2, 0.125);

      // Available: 7.75 x 9.75
      expect(result.printW).toBeLessThanOrEqual(7.75);
      expect(result.printH).toBeLessThanOrEqual(9.75);
      expect(result.printW).toBeGreaterThan(0);
    });

    it('should handle border equal to half paper dimension (no space)', () => {
      const result = computePrintSize(8, 10, 3, 2, 4);

      // With 4" borders on 8" wide paper: 0" available width
      expect(result.printW).toBe(0);
      expect(result.printH).toBe(0);
    });

    it('should handle border slightly larger than half paper', () => {
      const result = computePrintSize(8, 10, 3, 2, 4.5);

      // Impossible configuration
      expect(result.printW).toBe(0);
      expect(result.printH).toBe(0);
    });

    it('should handle maximum practical border (6 inches)', () => {
      const result = computePrintSize(20, 24, 3, 2, 6);

      // Available: 8 x 12 inches
      expect(result.printW).toBeLessThanOrEqual(8);
      expect(result.printH).toBeLessThanOrEqual(12);
      expect(result.printW).toBeGreaterThan(0);
    });

    it('should optimize border to snap to quarter-inch increments', () => {
      const optimal = calculateOptimalMinBorder(8, 10, 3, 2, 0.6);

      // Should prefer values divisible by 0.25
      const remainder = optimal % 0.25;
      expect(remainder).toBeCloseTo(0, 2);
    });
  });

  describe('Offset Clamping Edge Cases', () => {
    // Tests for offset handling at physical limits

    it('should clamp offset that would push print off paper (no minBorder)', () => {
      // 8x10 paper, 6x8 print, 1" min border, 3" offset (too much)
      const result = clampOffsets(8, 10, 6, 8, 1, 3, 0, true); // ignore min border

      expect(result.h).toBeLessThan(3);
      expect(result.warning).not.toBeNull();
    });

    it('should allow maximum valid offset within minBorder constraint', () => {
      // Paper 10x10, print 6x6, minBorder 1, max offset should be 1
      const result = clampOffsets(10, 10, 6, 6, 1, 1, 1, false);

      expect(result.h).toBe(1);
      expect(result.v).toBe(1);
      expect(result.warning).toBeNull();
    });

    it('should handle offset that exactly reaches paper edge (ignoring minBorder)', () => {
      // Paper 10x10, print 6x6, offset 2 reaches edge
      const result = clampOffsets(10, 10, 6, 6, 1, 2, 2, true);

      expect(result.h).toBe(2);
      expect(result.v).toBe(2);
    });

    it('should handle negative offset equal to maximum valid range', () => {
      const result = clampOffsets(10, 10, 6, 6, 1, -1, -1, false);

      expect(result.h).toBe(-1);
      expect(result.v).toBe(-1);
      expect(result.warning).toBeNull();
    });

    it('should clamp asymmetric offsets independently', () => {
      // Large horizontal offset, small vertical
      const result = clampOffsets(10, 8, 6, 4, 0.5, 5, 0.25, false);

      expect(result.h).toBeLessThan(5); // should be clamped
      expect(result.v).toBe(0.25); // should be valid
      expect(result.warning).not.toBeNull();
    });

    it('should calculate correct half-widths for border distribution', () => {
      const result = clampOffsets(12, 10, 8, 6, 1, 0, 0, false);

      expect(result.halfW).toBeCloseTo(2, 2); // (12 - 8) / 2
      expect(result.halfH).toBeCloseTo(2, 2); // (10 - 6) / 2
    });
  });

  describe('Blade Reading Edge Cases', () => {
    // Tests for blade positioning calculations used in trimming

    it('should calculate blade readings for centered print', () => {
      const result = bladeReadings(6, 8, 0, 0);

      expect(result.left).toBe(6);
      expect(result.right).toBe(6);
      expect(result.top).toBe(8);
      expect(result.bottom).toBe(8);
    });

    it('should calculate blade readings with maximum positive shift', () => {
      // Print 6x8, shift 1" right and down
      const result = bladeReadings(6, 8, 1, 1);

      expect(result.left).toBe(4); // 6 - 2*1
      expect(result.right).toBe(8); // 6 + 2*1
      expect(result.top).toBe(6); // 8 - 2*1
      expect(result.bottom).toBe(10); // 8 + 2*1
    });

    it('should calculate blade readings with maximum negative shift', () => {
      const result = bladeReadings(6, 8, -1, -1);

      expect(result.left).toBe(8); // 6 - 2*(-1)
      expect(result.right).toBe(4); // 6 + 2*(-1)
      expect(result.top).toBe(10); // 8 - 2*(-1)
      expect(result.bottom).toBe(6); // 8 + 2*(-1)
    });

    it('should handle fractional blade positions (realistic trimming)', () => {
      // Print 6.5 x 8.75 with 0.125" shift
      const result = bladeReadings(6.5, 8.75, 0.125, 0.25);

      expect(result.left).toBeCloseTo(6.25, 2); // 6.5 - 2*0.125
      expect(result.right).toBeCloseTo(6.75, 2); // 6.5 + 2*0.125
      expect(result.top).toBeCloseTo(8.25, 2); // 8.75 - 2*0.25
      expect(result.bottom).toBeCloseTo(9.25, 2); // 8.75 + 2*0.25
    });

    it('should produce symmetric readings with zero shift', () => {
      const result = bladeReadings(10, 12, 0, 0);

      expect(result.left).toBe(result.right);
      expect(result.top).toBe(result.bottom);
    });
  });

  describe('Border Distribution from Gaps', () => {
    it('should calculate symmetric borders with zero offset', () => {
      const result = bordersFromGaps(2, 1.5, 0, 0);

      expect(result.left).toBe(2);
      expect(result.right).toBe(2);
      expect(result.bottom).toBe(1.5);
      expect(result.top).toBe(1.5);
    });

    it('should calculate asymmetric borders with positive offsets', () => {
      const result = bordersFromGaps(3, 2, 0.5, 0.25);

      expect(result.left).toBe(2.5); // 3 - 0.5
      expect(result.right).toBe(3.5); // 3 + 0.5
      expect(result.bottom).toBe(1.75); // 2 - 0.25
      expect(result.top).toBe(2.25); // 2 + 0.25
    });

    it('should handle large offsets that create unequal borders', () => {
      const result = bordersFromGaps(4, 3, 2, 1.5);

      expect(result.left).toBe(2); // 4 - 2
      expect(result.right).toBe(6); // 4 + 2
      expect(result.bottom).toBe(1.5); // 3 - 1.5
      expect(result.top).toBe(4.5); // 3 + 1.5
    });

    it('should handle fractional gaps and offsets', () => {
      const result = bordersFromGaps(1.375, 0.875, 0.125, 0.0625);

      expect(result.left).toBeCloseTo(1.25, 4);
      expect(result.right).toBeCloseTo(1.5, 4);
      expect(result.bottom).toBeCloseTo(0.8125, 4);
      expect(result.top).toBeCloseTo(0.9375, 4);
    });
  });

  describe('Print Fit Validation', () => {
    it('should validate print fits exactly on paper', () => {
      expect(validatePrintFits(10, 10, 10, 10, 0, 0)).toBe(true);
    });

    it('should validate print fits with borders', () => {
      expect(validatePrintFits(10, 10, 8, 8, 0, 0)).toBe(true);
    });

    it('should reject print too wide for paper', () => {
      expect(validatePrintFits(10, 10, 12, 8, 0, 0)).toBe(false);
    });

    it('should reject print too tall for paper', () => {
      expect(validatePrintFits(10, 10, 8, 12, 0, 0)).toBe(false);
    });

    it('should reject print with offset extending beyond left edge', () => {
      expect(validatePrintFits(10, 10, 8, 8, -2, 0)).toBe(false);
    });

    it('should reject print with offset extending beyond right edge', () => {
      expect(validatePrintFits(10, 10, 8, 8, 2, 0)).toBe(false);
    });

    it('should reject print with offset extending beyond top edge', () => {
      expect(validatePrintFits(10, 10, 8, 8, 0, -2)).toBe(false);
    });

    it('should reject print with offset extending beyond bottom edge', () => {
      expect(validatePrintFits(10, 10, 8, 8, 0, 2)).toBe(false);
    });

    it('should validate print at maximum valid offset (positive)', () => {
      // Paper 10x10, print 8x8, max offset 1" each way
      expect(validatePrintFits(10, 10, 8, 8, 1, 1)).toBe(true);
    });

    it('should validate print at maximum valid offset (negative)', () => {
      expect(validatePrintFits(10, 10, 8, 8, -1, -1)).toBe(true);
    });

    it('should handle fractional dimensions and offsets', () => {
      expect(validatePrintFits(10.5, 12.75, 8.25, 9.5, 0.125, 0.25)).toBe(true);
    });

    it('should reject barely-over-limit offset', () => {
      // Paper 10x10, print 8x8, offset 1.01 just over limit
      expect(validatePrintFits(10, 10, 8, 8, 1.01, 0)).toBe(false);
    });
  });

  describe('Easel Size Finding Edge Cases', () => {
    it('should find exact match for all standard paper sizes', () => {
      const standardSizes = [
        { w: 8, h: 10 },
        { w: 11, h: 14 },
        { w: 16, h: 20 },
        { w: 20, h: 24 },
      ];

      standardSizes.forEach(({ w, h }) => {
        const result = findCenteringOffsets(w, h, false);
        expect(result.isNonStandardPaperSize).toBe(false);
        expect(result.easelSize.width).toBe(h); // Note: easel sizes are rotated
        expect(result.easelSize.height).toBe(w);
      });
    });

    it('should handle paper between standard sizes', () => {
      const result = findCenteringOffsets(9, 12, false);

      expect(result.isNonStandardPaperSize).toBe(true);
      // Should find an easel that can accommodate 9x12 paper
      // The easel dimensions might be swapped depending on orientation logic
      expect(
        (result.easelSize.width >= 9 && result.easelSize.height >= 12) ||
        (result.easelSize.width >= 12 && result.easelSize.height >= 9)
      ).toBe(true);
    });

    it('should handle extremely small paper (< 4 inches)', () => {
      const result = findCenteringOffsets(3, 4, false);

      expect(result.isNonStandardPaperSize).toBe(true);
      // Should still find a valid easel
      expect(result.easelSize.width).toBeGreaterThanOrEqual(3);
      expect(result.easelSize.height).toBeGreaterThanOrEqual(4);
    });

    it('should handle extremely large paper (> 24 inches)', () => {
      const result = findCenteringOffsets(30, 40, false);

      expect(result.isNonStandardPaperSize).toBe(true);
      // Should return custom size matching paper
      expect(result.easelSize.width).toBe(30);
      expect(result.easelSize.height).toBe(40);
    });

    it('should handle landscape orientation correctly', () => {
      const portrait = findCenteringOffsets(8, 10, false);
      const landscape = findCenteringOffsets(8, 10, true);

      // Both should find valid easels but orientations differ
      expect(portrait.isNonStandardPaperSize).toBe(false);
      expect(landscape.isNonStandardPaperSize).toBe(false);
    });

    it('should cache results for repeated calls', () => {
      const result1 = findCenteringOffsets(8, 10, false);
      const result2 = findCenteringOffsets(8, 10, false);

      // Should return identical objects (cached)
      expect(result1).toBe(result2);
    });
  });

  describe('Blade Thickness Scaling', () => {
    it('should return default thickness for standard 20x24 paper', () => {
      const thickness = calculateBladeThickness(20, 24);
      expect(thickness).toBe(15); // base thickness
    });

    it('should scale thickness for smaller paper', () => {
      const thickness = calculateBladeThickness(8, 10);

      // Smaller paper should have thicker blade (visually)
      expect(thickness).toBeGreaterThan(15);
    });

    it('should scale thickness for larger paper', () => {
      const thickness = calculateBladeThickness(30, 40);

      // Larger paper should have thinner blade (visually)
      expect(thickness).toBeLessThan(15);
    });

    it('should cap thickness at maximum scale factor', () => {
      const thickness = calculateBladeThickness(1, 1); // very tiny paper

      // Should not exceed max scale (2x)
      expect(thickness).toBeLessThanOrEqual(30); // 15 * 2
    });

    it('should handle zero dimensions gracefully', () => {
      expect(calculateBladeThickness(0, 10)).toBe(15);
      expect(calculateBladeThickness(10, 0)).toBe(15);
      expect(calculateBladeThickness(0, 0)).toBe(15);
    });

    it('should handle negative dimensions gracefully', () => {
      expect(calculateBladeThickness(-5, 10)).toBe(15);
      expect(calculateBladeThickness(5, -10)).toBe(15);
      expect(calculateBladeThickness(-5, -10)).toBe(15);
    });
  });

  describe('Optimal Border Calculation Edge Cases', () => {
    it('should return start value when ratio height is zero', () => {
      const result = calculateOptimalMinBorder(10, 10, 2, 0, 1);
      expect(result).toBe(1);
    });

    it('should optimize border for common 3:2 ratio', () => {
      const result = calculateOptimalMinBorder(8, 10, 3, 2, 0.6);

      // Should snap to quarter-inch increment
      expect(result % 0.25).toBeCloseTo(0, 2);
    });

    it('should handle very small start value', () => {
      const result = calculateOptimalMinBorder(8, 10, 3, 2, 0.1);

      expect(result).toBeGreaterThanOrEqual(0.01); // minimum allowed
      expect(result).toBeLessThanOrEqual(0.6); // within search span
    });

    it('should handle large start value', () => {
      const result = calculateOptimalMinBorder(20, 24, 3, 2, 5);

      expect(result).toBeGreaterThanOrEqual(4.5);
      expect(result).toBeLessThanOrEqual(5.5);
    });

    it('should handle square format (1:1)', () => {
      const result = calculateOptimalMinBorder(10, 10, 1, 1, 1);

      expect(result % 0.25).toBeCloseTo(0, 2);
    });

    it('should handle panoramic format (65:24)', () => {
      const result = calculateOptimalMinBorder(24, 20, 65, 24, 1.5);

      expect(result).toBeGreaterThan(1);
      expect(result).toBeLessThan(2);
    });
  });

  describe('Physical Constraint Validation', () => {
    it('should ensure print never exceeds paper dimensions', () => {
      const testCases = [
        { paper: [8, 10], ratio: [3, 2], border: 0.5 },
        { paper: [11, 14], ratio: [4, 3], border: 1 },
        { paper: [20, 24], ratio: [16, 9], border: 2 },
      ] as const;

      testCases.forEach(({ paper, ratio, border }) => {
        const result = computePrintSize(
          paper[0],
          paper[1],
          ratio[0],
          ratio[1],
          border
        );

        expect(result.printW).toBeLessThanOrEqual(paper[0] - 2 * border);
        expect(result.printH).toBeLessThanOrEqual(paper[1] - 2 * border);
      });
    });

    it('should ensure borders sum to paper dimensions with print', () => {
      const printSize = computePrintSize(10, 12, 3, 2, 1);
      const offset = clampOffsets(10, 12, printSize.printW, printSize.printH, 1, 0, 0, false);
      const borders = bordersFromGaps(offset.halfW, offset.halfH, offset.h, offset.v);

      const totalW = printSize.printW + borders.left + borders.right;
      const totalH = printSize.printH + borders.top + borders.bottom;

      expect(totalW).toBeCloseTo(10, 1);
      expect(totalH).toBeCloseTo(12, 1);
    });

    it('should ensure blade readings are achievable (positive)', () => {
      const readings = bladeReadings(8, 10, 0.5, 0.25);

      expect(readings.left).toBeGreaterThan(0);
      expect(readings.right).toBeGreaterThan(0);
      expect(readings.top).toBeGreaterThan(0);
      expect(readings.bottom).toBeGreaterThan(0);
    });

    it('should validate offset constraints for all paper sizes', () => {
      const papers = [
        [5, 7],
        [8, 10],
        [11, 14],
        [16, 20],
        [20, 24],
      ] as const;

      papers.forEach(([w, h]) => {
        const printSize = computePrintSize(w, h, 3, 2, 0.5);

        // Calculate max offset that keeps print on paper
        const maxOffset = (w - printSize.printW) / 2;

        // Offset at maximum should still fit
        const fitsAtMax = validatePrintFits(w, h, printSize.printW, printSize.printH, maxOffset, 0);
        expect(fitsAtMax).toBe(true);

        // Offset slightly over should fail (if maxOffset > 0)
        if (maxOffset > 0.01) {
          expect(
            validatePrintFits(
              w,
              h,
              printSize.printW,
              printSize.printH,
              maxOffset + 0.1,
              0
            )
          ).toBe(false);
        }
      });
    });
  });

  describe('Precision and Rounding', () => {
    it('should handle fractional border values precisely', () => {
      const result = computePrintSize(8.125, 10.25, 3, 2, 0.375);

      expect(result.printW).toBeGreaterThan(0);
      expect(result.printH).toBeGreaterThan(0);
    });

    it('should handle very small increments (1/16 inch)', () => {
      const borders1 = bordersFromGaps(1, 1, 0.0625, 0.0625);
      const borders2 = bordersFromGaps(1, 1, 0.125, 0.125);

      expect(borders1.left).not.toBe(borders2.left);
      expect(Math.abs(borders1.left - borders2.left)).toBeCloseTo(0.0625, 4);
    });

    it('should maintain precision through calculation chain', () => {
      const printSize = computePrintSize(8.5, 11, 1.414, 1, 0.625); // A4-ish
      const offset = clampOffsets(8.5, 11, printSize.printW, printSize.printH, 0.625, 0.125, 0.25, false);
      const borders = bordersFromGaps(offset.halfW, offset.halfH, offset.h, offset.v);

      // Total should still equal paper size
      const totalW = printSize.printW + borders.left + borders.right;
      const totalH = printSize.printH + borders.top + borders.bottom;

      expect(totalW).toBeCloseTo(8.5, 2);
      expect(totalH).toBeCloseTo(11, 2);
    });
  });
});
