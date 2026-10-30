import {
  bladeReadings,
  bordersFromGaps,
  calculateBladeThickness,
  calculateQuarterInchMinBorder,
  clampOffsets,
  computePrintSize,
  findCenteringOffsets,
  formatPaperSizeWarning,
} from '../../utils/border-calculations';
import { convertDisplayToInches } from '../../utils/unit-conversion';

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
      expect(calculateBladeThickness(-5, -10)).toBe(15);
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

describe('formatPaperSizeWarning', () => {
  it('prints a metric warning in centimetres at label precision', () => {
    const w = convertDisplayToInches(60, 'metric');
    const h = convertDisplayToInches(80, 'metric');

    expect(formatPaperSizeWarning(w, h, 'metric')).toBe(
      'Custom paper (60×80cm) exceeds largest standard easel (50.8×61cm).'
    );
  });

  it('prints an imperial warning with inch marks on both sizes', () => {
    expect(formatPaperSizeWarning(21, 25.5, 'imperial')).toBe(
      'Custom paper (21×25.5") exceeds largest standard easel (20×24").'
    );
  });
});

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

    it('should return a zero print for a non-positive ratio width', () => {
      expect(computePrintSize(8, 10, -5, 3, 0.5)).toEqual({
        printW: 0,
        printH: 0,
      });
      expect(computePrintSize(8, 10, 0, 3, 0.5)).toEqual({
        printW: 0,
        printH: 0,
      });
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

      // Available 10 x 13; a 1:3 print is height-constrained: 13 tall,
      // 13 / 3 wide.
      expect(result.printH).toBeCloseTo(13, 6);
      expect(result.printW).toBeCloseTo(13 / 3, 6);
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

      // With zero border the full 8 x 10 is available; 3:2 is
      // width-constrained: 8 wide, 8 / 1.5 tall.
      expect(result.printW).toBeCloseTo(8, 6);
      expect(result.printH).toBeCloseTo(8 / 1.5, 6);
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
  });

  describe('Border Distribution from Gaps', () => {
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
  });

  describe('Precision and Rounding', () => {
    it('should handle fractional border values precisely', () => {
      const result = computePrintSize(8.125, 10.25, 3, 2, 0.375);

      // Available 7.375 x 9.5; 3:2 is width-constrained.
      expect(result.printW).toBeCloseTo(7.375, 6);
      expect(result.printH).toBeCloseTo(7.375 / 1.5, 6);
    });

    it('should handle very small increments (1/16 inch)', () => {
      const borders1 = bordersFromGaps(1, 1, 0.0625, 0.0625);
      const borders2 = bordersFromGaps(1, 1, 0.125, 0.125);

      expect(borders1.left).not.toBe(borders2.left);
      expect(Math.abs(borders1.left - borders2.left)).toBeCloseTo(0.0625, 4);
    });
  });
});
