import { describe, expect, it } from 'vitest';
import {
  bestFitBorders,
  bottomWeightFor,
  MAT_CALCULATOR_DEFAULTS,
  MAT_PRESETS,
  makeMatFormatter,
  parseMatInput,
  toFraction,
  toFractionInput,
} from '../../constants/mat-calculator';

describe('mat calculator logic', () => {
  describe('parseMatInput', () => {
    it('parses decimals', () => {
      expect(parseMatInput('1.5')).toBe(1.5);
      expect(parseMatInput('16')).toBe(16);
      expect(parseMatInput('0')).toBe(0);
    });

    it('parses simple fractions', () => {
      expect(parseMatInput('1/4')).toBe(0.25);
      expect(parseMatInput('3/4')).toBe(0.75);
      expect(parseMatInput('1/16')).toBeCloseTo(0.0625, 10);
    });

    it('parses mixed numbers', () => {
      expect(parseMatInput('1 1/2')).toBe(1.5);
      expect(parseMatInput('3 3/4')).toBe(3.75);
      expect(parseMatInput('2 15/16')).toBeCloseTo(2.9375, 10);
    });

    it('passes through numeric input unchanged', () => {
      expect(parseMatInput(2.5)).toBe(2.5);
    });

    it('returns NaN for empty, nullish, or unparseable input', () => {
      expect(parseMatInput('')).toBeNaN();
      expect(parseMatInput('   ')).toBeNaN();
      expect(parseMatInput('abc')).toBeNaN();
      // @ts-expect-error — exercising the null guard
      expect(parseMatInput(null)).toBeNaN();
    });
  });

  describe('toFraction', () => {
    it('reduces to the simplest sixteenth', () => {
      expect(toFraction(3.5)).toBe('3 1/2"');
      expect(toFraction(0.25)).toBe('1/4"');
      expect(toFraction(0.75)).toBe('3/4"');
      expect(toFraction(3.0625)).toBe('3 1/16"');
    });

    it('formats whole numbers and zero', () => {
      expect(toFraction(16)).toBe('16"');
      expect(toFraction(0)).toBe('0"');
    });

    it('rounds to the nearest sixteenth, carrying to the next whole', () => {
      expect(toFraction(0.1)).toBe('1/8"'); // 0.1 → nearest 1/16 is 2/16
      expect(toFraction(3.97)).toBe('4"'); // rounds up past 15/16
    });

    it('honors a custom denominator', () => {
      expect(toFraction(0.5, 8)).toBe('1/2"');
    });

    it('returns empty string for NaN or negative values', () => {
      expect(toFraction(NaN)).toBe('');
      expect(toFraction(-1)).toBe('');
    });
  });

  describe('toFractionInput', () => {
    it('drops the trailing inch mark', () => {
      expect(toFractionInput(3.5)).toBe('3 1/2');
      expect(toFractionInput(0.25)).toBe('1/4');
      expect(toFractionInput(16)).toBe('16');
    });

    it('round-trips through parseMatInput', () => {
      expect(parseMatInput(toFractionInput(2.75))).toBeCloseTo(2.75, 10);
    });
  });

  describe('makeMatFormatter', () => {
    it('formats values as fractions when valid', () => {
      expect(makeMatFormatter(true)(3.5)).toBe('3 1/2"');
    });

    it('returns the placeholder when invalid or NaN', () => {
      expect(makeMatFormatter(false)(3.5)).toBe('· · ·');
      expect(makeMatFormatter(true)(NaN)).toBe('· · ·');
    });
  });

  describe('bottomWeightFor', () => {
    it('scales the extra bottom weight with the total vertical border', () => {
      expect(bottomWeightFor(13)).toBe(1);
      expect(bottomWeightFor(12)).toBe(0.75);
      expect(bottomWeightFor(9)).toBe(0.75);
      expect(bottomWeightFor(8)).toBe(0.5);
      expect(bottomWeightFor(5)).toBe(0.5);
      expect(bottomWeightFor(4)).toBe(0.25);
      expect(bottomWeightFor(1)).toBe(0.25);
    });
  });

  describe('bestFitBorders', () => {
    it('centers and bottom-weights the artwork', () => {
      // 11×14 art at 1/4" reveal inside a 16×20 board.
      const fit = bestFitBorders(16, 20, 11, 14, 0.25, true);
      expect(fit).toEqual({
        top: 3,
        bottom: 3.5,
        left: 2.75,
        right: 2.75,
      });
    });

    it('splits evenly when bottom-weight is off', () => {
      const fit = bestFitBorders(16, 20, 11, 14, 0.25, false);
      expect(fit).toEqual({
        top: 3.25,
        bottom: 3.25,
        left: 2.75,
        right: 2.75,
      });
    });

    it('keeps borders consistent with the available space', () => {
      const fit = bestFitBorders(20, 24, 16, 20, 0.125, true);
      expect(fit).not.toBeNull();
      if (!fit) return;
      // Left and right are always equal; opposing borders sum to the gap.
      expect(fit.left).toBe(fit.right);
      const winW = 16 - 2 * 0.125;
      const winH = 20 - 2 * 0.125;
      expect(fit.left + fit.right).toBeCloseTo(20 - winW, 10);
      expect(fit.top + fit.bottom).toBeCloseTo(24 - winH, 10);
    });

    it('returns null when the artwork plus reveal cannot fit', () => {
      expect(bestFitBorders(10, 12, 11, 14, 0, true)).toBeNull();
      expect(bestFitBorders(16, 20, 0.3, 0.3, 0.25, true)).toBeNull();
    });
  });

  describe('constants', () => {
    it('exposes positive, labeled presets', () => {
      expect(MAT_PRESETS.length).toBeGreaterThan(0);
      for (const preset of MAT_PRESETS) {
        expect(preset.label).toBeTruthy();
        expect(preset.w).toBeGreaterThan(0);
        expect(preset.h).toBeGreaterThan(0);
      }
    });

    it('has defaults that parse to a valid window', () => {
      const d = MAT_CALCULATOR_DEFAULTS;
      const ow = parseMatInput(d.outerW);
      const oh = parseMatInput(d.outerH);
      const windowW =
        ow - parseMatInput(d.borderLeft) - parseMatInput(d.borderRight);
      const windowH =
        oh - parseMatInput(d.borderTop) - parseMatInput(d.borderBottom);
      expect(windowW).toBeGreaterThan(0);
      expect(windowH).toBeGreaterThan(0);
      expect(typeof d.bottomWeight).toBe('boolean');
    });
  });
});
