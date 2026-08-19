import {
  bladeReadings,
  bordersFromGaps,
  calculateBladeThickness,
  calculateOptimalMinBorder,
  calculateQuarterInchMinBorder,
  clampOffsets,
  computePrintSize,
  findCenteringOffsets,
  validatePrintFits,
} from '../../utils/border-calculations';

describe('border calculations', () => {
  describe('findCenteringOffsets', () => {
    it('should find exact match for standard paper sizes', () => {
      const result = findCenteringOffsets(8, 10, false);
      expect(result.easelSize).toEqual({ width: 10, height: 8 });
      expect(result.effectiveSlot).toEqual({ width: 10, height: 8 });
      expect(result.isNonStandardPaperSize).toBe(false);
    });

    it('should handle landscape orientation', () => {
      const result = findCenteringOffsets(8, 10, true);
      // For landscape, it finds the easel that can fit the rotated paper (10x8)
      // and returns the easel in its standard orientation
      expect(result.easelSize).toEqual({ width: 10, height: 8 });
      expect(result.effectiveSlot).toEqual({ width: 10, height: 8 });
      expect(result.isNonStandardPaperSize).toBe(false);
    });

    it('should find best fit for non-standard sizes', () => {
      const result = findCenteringOffsets(6, 8, false);
      expect(result.isNonStandardPaperSize).toBe(true);
      expect(result.easelSize.width).toBeGreaterThanOrEqual(6);
      expect(result.easelSize.height).toBeGreaterThanOrEqual(8);
    });

    it('should handle paper larger than available easels', () => {
      const result = findCenteringOffsets(30, 40, false);
      expect(result.isNonStandardPaperSize).toBe(true);
      expect(result.easelSize).toEqual({ width: 30, height: 40 });
      expect(result.effectiveSlot).toEqual({ width: 30, height: 40 });
    });

    it('should cache results for repeated calls', () => {
      const result1 = findCenteringOffsets(8, 10, false);
      const result2 = findCenteringOffsets(8, 10, false);
      expect(result1).toEqual(result2);
    });

    it('should reject square paper that cannot fit on rectangular easel', () => {
      // Test case: 8x8 square paper on 10x6 easel should not fit
      // This was previously incorrectly allowed by fitsSquare logic
      const result = findCenteringOffsets(8, 8, false);

      // The paper should either find a larger easel or return as non-standard
      // It should NOT use the 10x8 easel with rotated slot (6x10) as that's geometrically impossible
      if (result.easelSize.width === 10 && result.easelSize.height === 8) {
        // If using 10x8 easel, the slot must be the standard orientation (10x8)
        // NOT rotated (8x10) since 8 < 8 would fail
        expect(result.effectiveSlot).toEqual({ width: 10, height: 8 });
      }

      // Verify the slot can actually accommodate the paper
      expect(result.effectiveSlot.width).toBeGreaterThanOrEqual(8);
      expect(result.effectiveSlot.height).toBeGreaterThanOrEqual(8);
    });

    it('should correctly handle near-square paper', () => {
      // Test near-square paper (within 0.01 inch tolerance)
      const result = findCenteringOffsets(8, 8.005, false);

      // Should still require both dimensions to fit
      expect(result.effectiveSlot.width).toBeGreaterThanOrEqual(8);
      expect(result.effectiveSlot.height).toBeGreaterThanOrEqual(8.005);
    });
  });

  describe('calculateBladeThickness', () => {
    it('should return default thickness for zero dimensions', () => {
      expect(calculateBladeThickness(0, 10)).toBe(15);
      expect(calculateBladeThickness(10, 0)).toBe(15);
      expect(calculateBladeThickness(0, 0)).toBe(15);
    });

    it('should scale thickness based on paper area', () => {
      const thickness1 = calculateBladeThickness(20, 24); // standard area
      const thickness2 = calculateBladeThickness(10, 12); // quarter area

      expect(thickness1).toBeLessThanOrEqual(thickness2);
      expect(thickness2).toBeGreaterThan(thickness1);
    });

    it('should cap scaling at maximum factor', () => {
      const tinyPaper = calculateBladeThickness(1, 1);
      expect(tinyPaper).toBeLessThanOrEqual(15 * 2); // max scale factor is 2
    });

    it('should handle negative dimensions gracefully', () => {
      expect(calculateBladeThickness(-5, 10)).toBe(15);
      expect(calculateBladeThickness(5, -10)).toBe(15);
    });
  });

  describe('calculateOptimalMinBorder', () => {
    it('should return start value when ratio height is zero', () => {
      expect(calculateOptimalMinBorder(10, 10, 2, 0, 1)).toBe(1);
    });

    it('should find border that snaps to quarter increments', () => {
      const result = calculateOptimalMinBorder(8, 10, 3, 2, 0.6);
      // Should prefer values that divide evenly by 0.25
      expect(result % 0.25).toBeCloseTo(0, 2);
    });

    it('should stay within search span', () => {
      const start = 1;
      const result = calculateOptimalMinBorder(8, 10, 3, 2, start);
      expect(result).toBeGreaterThanOrEqual(start - 0.5);
      expect(result).toBeLessThanOrEqual(start + 0.5);
    });

    it('should handle edge cases', () => {
      expect(calculateOptimalMinBorder(1, 1, 1, 1, 0.5)).toBeGreaterThanOrEqual(
        0.01
      );
    });
  });

  describe('computePrintSize', () => {
    it('should compute correct print size within borders', () => {
      const result = computePrintSize(10, 8, 3, 2, 0.5);
      expect(result.printW).toBeLessThanOrEqual(9); // 10 - 2*0.5
      expect(result.printH).toBeLessThanOrEqual(7); // 8 - 2*0.5
      expect(result.printW / result.printH).toBeCloseTo(3 / 2, 2);
    });

    it('should return zero for invalid inputs', () => {
      expect(computePrintSize(0, 8, 3, 2, 0.5)).toEqual({
        printW: 0,
        printH: 0,
      });
      expect(computePrintSize(10, 0, 3, 2, 0.5)).toEqual({
        printW: 0,
        printH: 0,
      });
      expect(computePrintSize(10, 8, 3, 0, 0.5)).toEqual({
        printW: 0,
        printH: 0,
      });
      expect(computePrintSize(10, 8, 3, 2, -1)).toEqual({
        printW: 0,
        printH: 0,
      });
    });

    it('should return zero when border is too large', () => {
      const result = computePrintSize(10, 8, 3, 2, 5); // border larger than half paper
      expect(result).toEqual({ printW: 0, printH: 0 });
    });

    it('should constrain by width when paper is wider', () => {
      const result = computePrintSize(20, 8, 3, 2, 1); // very wide paper
      expect(result.printH).toBe(6); // constrained by height (8 - 2*1)
      expect(result.printW).toBe(9); // 6 * 3/2
    });

    it('should constrain by height when paper is taller', () => {
      const result = computePrintSize(8, 20, 3, 2, 1); // very tall paper
      expect(result.printW).toBe(6); // constrained by width (8 - 2*1)
      expect(result.printH).toBe(4); // 6 / (3/2)
    });
  });

  describe('clampOffsets', () => {
    it('should not clamp valid offsets', () => {
      const result = clampOffsets(10, 8, 6, 4, 1, 0.5, 0.5, false);
      expect(result.h).toBe(0.5);
      expect(result.v).toBe(0.5);
      expect(result.warning).toBeNull();
    });

    it('should clamp offsets that violate min border', () => {
      const result = clampOffsets(10, 8, 6, 4, 1, 2, 1.5, false);
      expect(result.h).toBeLessThan(2);
      expect(result.v).toBeLessThan(1.5);
      expect(result.warning).toContain('min-border');
    });

    it('should clamp offsets that exceed paper bounds when ignoring min border', () => {
      const result = clampOffsets(10, 8, 6, 4, 1, 3, 3, true);
      expect(result.h).toBeLessThan(3);
      expect(result.v).toBeLessThan(3);
      expect(result.warning).toContain('print on paper');
    });

    it('should handle negative offsets', () => {
      const result = clampOffsets(10, 8, 6, 4, 1, -0.5, -0.5, false);
      expect(result.h).toBe(-0.5);
      expect(result.v).toBe(-0.5);
      expect(result.warning).toBeNull();
    });

    it('should calculate correct half values', () => {
      const result = clampOffsets(10, 8, 6, 4, 1, 0, 0, false);
      expect(result.halfW).toBe(2); // (10 - 6) / 2
      expect(result.halfH).toBe(2); // (8 - 4) / 2
    });

    it('should not warn when both offsets are 0 and the allowed range is negative (half < minBorder)', () => {
      // halfW = (10 - 8) / 2 = 1, halfW - minBorder = 1 - 2 = -1 (negative range)
      // halfH = (8 - 6) / 2 = 1, halfH - minBorder = 1 - 2 = -1 (negative range)
      const result = clampOffsets(10, 8, 8, 6, 2, 0, 0, false);
      expect(result.h).toBe(0);
      expect(result.v).toBe(0);
      expect(result.warning).toBeNull();
    });
  });

  describe('bordersFromGaps', () => {
    it('should calculate borders correctly from gaps and offsets', () => {
      const result = bordersFromGaps(2, 1.5, 0.5, 0.25);
      expect(result.left).toBe(1.5); // 2 - 0.5
      expect(result.right).toBe(2.5); // 2 + 0.5
      expect(result.bottom).toBe(1.25); // 1.5 - 0.25
      expect(result.top).toBe(1.75); // 1.5 + 0.25
    });

    it('should handle zero offsets', () => {
      const result = bordersFromGaps(2, 1.5, 0, 0);
      expect(result.left).toBe(2);
      expect(result.right).toBe(2);
      expect(result.bottom).toBe(1.5);
      expect(result.top).toBe(1.5);
    });

    it('should handle negative offsets', () => {
      const result = bordersFromGaps(2, 1.5, -0.5, -0.25);
      expect(result.left).toBe(2.5); // 2 - (-0.5)
      expect(result.right).toBe(1.5); // 2 + (-0.5)
      expect(result.bottom).toBe(1.75); // 1.5 - (-0.25)
      expect(result.top).toBe(1.25); // 1.5 + (-0.25)
    });
  });

  describe('bladeReadings', () => {
    it('should calculate blade readings correctly', () => {
      const result = bladeReadings(6, 4, 0.25, 0.125);
      expect(result.left).toBe(5.5); // 6 - 2*0.25
      expect(result.right).toBe(6.5); // 6 + 2*0.25
      expect(result.top).toBe(3.75); // 4 - 2*0.125
      expect(result.bottom).toBe(4.25); // 4 + 2*0.125
    });

    it('should handle zero shifts', () => {
      const result = bladeReadings(6, 4, 0, 0);
      expect(result.left).toBe(6);
      expect(result.right).toBe(6);
      expect(result.top).toBe(4);
      expect(result.bottom).toBe(4);
    });

    it('should handle negative shifts', () => {
      const result = bladeReadings(6, 4, -0.25, -0.125);
      expect(result.left).toBe(6.5); // 6 - 2*(-0.25)
      expect(result.right).toBe(5.5); // 6 + 2*(-0.25)
      expect(result.top).toBe(4.25); // 4 - 2*(-0.125)
      expect(result.bottom).toBe(3.75); // 4 + 2*(-0.125)
    });
  });

  describe('validatePrintFits', () => {
    it('should return true when print fits on paper', () => {
      expect(validatePrintFits(10, 8, 6, 4, 0, 0)).toBe(true);
      expect(validatePrintFits(10, 8, 6, 4, 1, 1)).toBe(true);
    });

    it('should return false when print extends beyond paper', () => {
      expect(validatePrintFits(10, 8, 12, 4, 0, 0)).toBe(false); // too wide
      expect(validatePrintFits(10, 8, 6, 10, 0, 0)).toBe(false); // too tall
      expect(validatePrintFits(10, 8, 6, 4, 3, 0)).toBe(false); // offset too large
      expect(validatePrintFits(10, 8, 6, 4, 0, 3)).toBe(false); // offset too large
    });

    it('should handle edge cases', () => {
      expect(validatePrintFits(10, 8, 10, 8, 0, 0)).toBe(true); // exact fit
      expect(validatePrintFits(10, 8, 10, 8, 0.1, 0)).toBe(false); // barely over
    });

    it('should handle negative offsets', () => {
      expect(validatePrintFits(10, 8, 6, 4, -1, -1)).toBe(true);
      expect(validatePrintFits(10, 8, 6, 4, -3, 0)).toBe(false); // negative offset too large
    });
  });

  describe('calculateQuarterInchMinBorder', () => {
    it('should return a border that makes the print size land exactly on quarter-inch increments', () => {
      // /border defaults: oriented paper 10x8, aspect ratio 3:2, min border 0.6
      // computePrintSize(10, 8, 3, 2, 0.6) -> 8.8 x 5.8666... (the observed blade readings)
      const result = calculateQuarterInchMinBorder({
        paperWidth: 10,
        paperHeight: 8,
        ratioWidth: 3,
        ratioHeight: 2,
        currentMinBorder: 0.6,
        printWidth: 8.8,
        printHeight: 5.866666666666667,
      });

      // The correct candidate is 0.875: print becomes exactly 8.25 x 5.5
      expect(result).toBeCloseTo(0.875, 6);

      const { printW, printH } = computePrintSize(10, 8, 3, 2, 0.875);
      expect(printW).toBeCloseTo(8.25, 6);
      expect(printH).toBeCloseTo(5.5, 6);
    });

    it('should return null when the print size is already quarter-aligned', () => {
      const result = calculateQuarterInchMinBorder({
        paperWidth: 10,
        paperHeight: 8,
        ratioWidth: 3,
        ratioHeight: 2,
        currentMinBorder: 0.875,
        printWidth: 8.25,
        printHeight: 5.5,
      });

      expect(result).toBeNull();
    });

    it('should return null for non-positive inputs', () => {
      expect(
        calculateQuarterInchMinBorder({
          paperWidth: 0,
          paperHeight: 8,
          ratioWidth: 3,
          ratioHeight: 2,
          currentMinBorder: 0.6,
          printWidth: 8.8,
          printHeight: 5.866666666666667,
        })
      ).toBeNull();
    });

    it('should respect the current border as a floor', () => {
      const currentMinBorder = 0.6;
      const result = calculateQuarterInchMinBorder({
        paperWidth: 10,
        paperHeight: 8,
        ratioWidth: 3,
        ratioHeight: 2,
        currentMinBorder,
        printWidth: 8.8,
        printHeight: 5.866666666666667,
      });

      expect(result).toBeGreaterThanOrEqual(currentMinBorder - 0.0001);
    });

    it('should return null for an already quarter-aligned second scenario (paper 8x10, ratio 4:5, border 0.5)', () => {
      // computePrintSize(8, 10, 4, 5, 0.5) -> 7 x 8.75, already quarter-aligned
      const { printW, printH } = computePrintSize(8, 10, 4, 5, 0.5);
      const result = calculateQuarterInchMinBorder({
        paperWidth: 8,
        paperHeight: 10,
        ratioWidth: 4,
        ratioHeight: 5,
        currentMinBorder: 0.5,
        printWidth: printW,
        printHeight: printH,
      });

      expect(result).toBeNull();
    });

    it('should find a quarter-aligned border for a non-aligned 4:5 scenario (paper 8x10, ratio 4:5, border 0.6)', () => {
      // computePrintSize(8, 10, 4, 5, 0.6) -> 6.8 x 8.5; 6.8 is not a multiple
      // of 0.25, so (unlike the border-0.5 case above) this is NOT aligned.
      const { printW, printH } = computePrintSize(8, 10, 4, 5, 0.6);
      const result = calculateQuarterInchMinBorder({
        paperWidth: 8,
        paperHeight: 10,
        ratioWidth: 4,
        ratioHeight: 5,
        currentMinBorder: 0.6,
        printWidth: printW,
        printHeight: printH,
      });

      expect(result).toBeCloseTo(1, 6);
      const recomputed = computePrintSize(8, 10, 4, 5, 1);
      expect(recomputed.printW % 0.25).toBeCloseTo(0, 6);
      expect(recomputed.printH % 0.25).toBeCloseTo(0, 6);
    });

    it('should find a quarter-aligned border for a non-aligned square-ish ratio (paper 8x10, ratio 1:1, border 0.6)', () => {
      // computePrintSize(8, 10, 1, 1, 0.6) -> 6.8 x 6.8, not quarter-aligned
      const { printW, printH } = computePrintSize(8, 10, 1, 1, 0.6);
      const result = calculateQuarterInchMinBorder({
        paperWidth: 8,
        paperHeight: 10,
        ratioWidth: 1,
        ratioHeight: 1,
        currentMinBorder: 0.6,
        printWidth: printW,
        printHeight: printH,
      });

      expect(result).toBeCloseTo(0.625, 6);
      const recomputed = computePrintSize(8, 10, 1, 1, 0.625);
      expect(recomputed.printW % 0.25).toBeCloseTo(0, 6);
      expect(recomputed.printH % 0.25).toBeCloseTo(0, 6);
    });
  });
});
