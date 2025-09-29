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

// Mock the constants to avoid importing complex dependencies
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
});
