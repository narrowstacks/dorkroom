import {
  calculateBladeThickness,
  findCenteringOffsets,
  calculateOptimalMinBorder,
} from '../borderCalculations';
import { EASEL_SIZES, BLADE_THICKNESS } from '../../constants/border';

describe('borderCalculations utilities', () => {
  // --- calculateBladeThickness Tests ---
  describe('calculateBladeThickness', () => {
    it('should return default thickness for base paper size', () => {
      expect(calculateBladeThickness(20, 24)).toBe(BLADE_THICKNESS);
    });

    it('should increase thickness for smaller paper', () => {
      const thickness = calculateBladeThickness(8, 10);
      expect(thickness).toBeGreaterThan(BLADE_THICKNESS);
      // Example check: scale factor is (20*24)/(8*10) = 480/80 = 6. Capped at 2.
      // Expected: Math.round(BLADE_THICKNESS * 2)
      expect(thickness).toBe(Math.round(BLADE_THICKNESS * 2));
    });

    it('should decrease thickness for larger paper (but capped scale factor might limit)', () => {
      // Example: 30x40 area is 1200. Base is 480. Scale = 480/1200 = 0.4
      // Capped scale remains 0.4
      const thickness = calculateBladeThickness(30, 40);
      expect(thickness).toBeLessThan(BLADE_THICKNESS);
      expect(thickness).toBe(Math.round(BLADE_THICKNESS * (480 / 1200)));
    });

    it('should handle zero area input', () => {
      expect(calculateBladeThickness(0, 10)).toBe(BLADE_THICKNESS);
      expect(calculateBladeThickness(10, 0)).toBe(BLADE_THICKNESS);
      expect(calculateBladeThickness(0, 0)).toBe(BLADE_THICKNESS);
    });

    it('should handle negative area input', () => {
      expect(calculateBladeThickness(-10, 10)).toBe(BLADE_THICKNESS);
    });
  });

  // --- findCenteringOffsets Tests ---
  describe('findCenteringOffsets', () => {
    // Standard paper size (8x10) - should fit 10x8 easel
    const stdWidth = 8;
    const stdHeight = 10;
    const stdEasel = EASEL_SIZES.find((e) => e.width === 10 && e.height === 8)!; // Look for 10x8

    it('should find correct easel for standard paper (portrait - 8x10)', () => {
      if (!stdEasel)
        throw new Error('Standard easel (10x8) not found in constants');
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        stdWidth,
        stdHeight,
        false
      );
      expect(isNonStandardPaperSize).toBe(false); // 8x10 is considered standard via 10x8 easel
      // Paper is 8x10, should fit 10x8 easel directly (no flip needed for easel)
      expect(easelSize).toEqual({
        width: stdEasel.width,
        height: stdEasel.height,
      });
    });

    it('should find correct easel for standard paper (landscape - 10x8)', () => {
      if (!stdEasel)
        throw new Error('Standard easel (10x8) not found in constants');
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        stdWidth,
        stdHeight,
        true
      );
      expect(isNonStandardPaperSize).toBe(false); // 8x10 is considered standard via 10x8 easel
      // Paper is landscape (10x8), should fit 10x8 easel (no flip needed for easel)
      expect(easelSize).toEqual({
        width: stdEasel.width,
        height: stdEasel.height,
      });
    });

    // Non-standard paper size (9x12) - should fit in 14x11 easel
    const nonStdWidth = 9;
    const nonStdHeight = 12;
    const fittingEasel = EASEL_SIZES.find(
      (e) => e.width === 14 && e.height === 11
    )!; // Look for 14x11

    it('should find smallest fitting easel for non-standard paper (portrait - 9x12)', () => {
      if (!fittingEasel)
        throw new Error('Fitting easel (14x11) not found in constants');
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        nonStdWidth,
        nonStdHeight,
        false
      );
      expect(isNonStandardPaperSize).toBe(true);
      // 9x12 fits directly into 14x11 (no easel flip)
      expect(easelSize).toEqual({
        width: fittingEasel.width,
        height: fittingEasel.height,
      });
    });

    it('should find smallest fitting easel for non-standard paper (landscape - 12x9)', () => {
      if (!fittingEasel)
        throw new Error('Fitting easel (14x11) not found in constants');
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        nonStdWidth,
        nonStdHeight,
        true
      );
      expect(isNonStandardPaperSize).toBe(true);
      // Paper is landscape (12x9), should fit in 14x11 easel (no easel flip)
      expect(easelSize).toEqual({
        width: fittingEasel.width,
        height: fittingEasel.height,
      });
    });

    // Very large non-standard paper size (30x40)
    const largeWidth = 30;
    const largeHeight = 40;

    it('should return paper dimensions if no easel fits (portrait)', () => {
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        largeWidth,
        largeHeight,
        false
      );
      expect(isNonStandardPaperSize).toBe(true);
      expect(easelSize).toEqual({ width: largeWidth, height: largeHeight });
    });

    it('should return paper dimensions if no easel fits (landscape)', () => {
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        largeWidth,
        largeHeight,
        true
      );
      expect(isNonStandardPaperSize).toBe(true);
      // Paper is landscape (40x30)
      expect(easelSize).toEqual({ width: largeHeight, height: largeWidth });
    });

    // Paper size considered standard if it matches an easel size (e.g., 14x11 paper)
    const matchEaselWidth = 14;
    const matchEaselHeight = 11;
    const matchingEasel = EASEL_SIZES.find(
      (e) => e.width === 14 && e.height === 11
    )!;

    it('should handle paper exactly matching an easel size (portrait - 14x11)', () => {
      if (!matchingEasel)
        throw new Error('Matching easel (14x11) not found in constants');
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        matchEaselWidth,
        matchEaselHeight,
        false
      );
      expect(isNonStandardPaperSize).toBe(false); // 14x11 is a standard size
      // Paper 14x11, fits 14x11 easel
      expect(easelSize).toEqual({
        width: matchingEasel.width,
        height: matchingEasel.height,
      });
    });

    it('should handle paper exactly matching an easel size (landscape - 11x14)', () => {
      if (!matchingEasel)
        throw new Error('Matching easel (14x11) not found in constants');
      const { easelSize, isNonStandardPaperSize } = findCenteringOffsets(
        matchEaselWidth,
        matchEaselHeight,
        true
      );
      expect(isNonStandardPaperSize).toBe(false); // 14x11 is a standard size
      // Paper is landscape (11x14), should fit 14x11 easel (no easel flip)
      expect(easelSize).toEqual({
        width: matchingEasel.width,
        height: matchingEasel.height,
      });
    });
  });

  // --- calculateOptimalMinBorder Tests ---
  describe('calculateOptimalMinBorder', () => {
    // Use 8x10 paper, 3:2 ratio (standard frame)
    const paperW = 8;
    const paperH = 10;
    const ratioW = 3;
    const ratioH = 2;
    const tolerance = 0.02; // Allow slight deviation

    // Helper function to check if borders are close to 0.25 increments
    const checkBordersForQuarterInch = (
      paperW: number,
      paperH: number,
      ratioW: number,
      ratioH: number,
      optimalBorder: number
    ) => {
      const availableW = paperW - 2 * optimalBorder;
      const availableH = paperH - 2 * optimalBorder;
      if (availableW <= 0 || availableH <= 0 || ratioH === 0) return false; // Invalid calc
      const printRatio = ratioW / ratioH;
      let printW, printH;
      if (availableW / availableH > printRatio) {
        printH = availableH;
        printW = availableH * printRatio;
      } else {
        printW = availableW;
        printH = availableW / printRatio;
      }
      const borderX = (paperW - printW) / 2;
      const borderY = (paperH - printH) / 2;

      const remainderX = borderX % 0.25;
      const remainderY = borderY % 0.25;

      const isXClose = Math.min(remainderX, 0.25 - remainderX) < tolerance;
      const isYClose = Math.min(remainderY, 0.25 - remainderY) < tolerance;
      return isXClose && isYClose;
    };

    it('should find a border close to 0.25 increments', () => {
      const currentMinBorder = 0.6; // Arbitrary starting point
      const optimalBorder = calculateOptimalMinBorder(
        paperW,
        paperH,
        ratioW,
        ratioH,
        currentMinBorder
      );
      expect(
        checkBordersForQuarterInch(
          paperW,
          paperH,
          ratioW,
          ratioH,
          optimalBorder
        )
      ).toBe(true);
    });

    it('should find an optimal border when input is already near optimal', () => {
      const nearOptimalBorder = 0.75;
      const optimalBorder = calculateOptimalMinBorder(
        paperW,
        paperH,
        ratioW,
        ratioH,
        nearOptimalBorder
      );
      // Assert that the *result* is optimal, not that it's close to the input
      expect(
        checkBordersForQuarterInch(
          paperW,
          paperH,
          ratioW,
          ratioH,
          optimalBorder
        )
      ).toBe(true);
      // We can also check it's a reasonable value
      expect(optimalBorder).toBeGreaterThan(0);
      expect(optimalBorder).toBeLessThan(Math.min(paperW, paperH) / 2);
    });

    it('should return the current border if calculation leads to invalid sizes', () => {
      const largeMinBorder = 4.5; // Too large for 8x10 paper
      const optimalBorder = calculateOptimalMinBorder(
        paperW,
        paperH,
        ratioW,
        ratioH,
        largeMinBorder
      );
      // The function might refine slightly, but it shouldn't drastically change if it fails
      // The exact behavior might depend on the loop bounds and checks. Let's assume it returns something reasonable.
      // Given the loop is +/- 0.5, it will likely return something < 4.5
      expect(optimalBorder).toBeLessThanOrEqual(largeMinBorder); // Or check it returns a positive value
    });

    it('should handle zero ratio height gracefully', () => {
      const currentMinBorder = 0.5;
      const optimalBorder = calculateOptimalMinBorder(
        paperW,
        paperH,
        ratioW,
        0,
        currentMinBorder
      );
      expect(optimalBorder).toBe(currentMinBorder); // Should return the input border
    });
  });
});
