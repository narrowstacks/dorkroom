import { describe, expect, it } from 'vitest';
import {
  ASPECT_RATIO_MAP,
  ASPECT_RATIOS,
  DEFAULT_BORDER_PRESETS,
  PAPER_SIZE_MAP,
  PAPER_SIZES,
} from '../../constants/border-calculator';

describe('Border Calculator Constants', () => {
  describe('uniqueness', () => {
    it('has unique values for all aspect ratios', () => {
      const values = ASPECT_RATIOS.map((r) => r.value);
      expect(new Set(values).size).toBe(values.length);
    });

    it('has unique values for all paper sizes', () => {
      const values = PAPER_SIZES.map((p) => p.value);
      expect(new Set(values).size).toBe(values.length);
    });

    it('has default presets with unique IDs', () => {
      const ids = DEFAULT_BORDER_PRESETS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('preset keys exist', () => {
    it('only references paper sizes that exist', () => {
      DEFAULT_BORDER_PRESETS.forEach((preset) => {
        if (preset.settings.paperSize !== 'custom') {
          expect(PAPER_SIZE_MAP.has(preset.settings.paperSize)).toBe(true);
        }
      });
    });

    it('only references aspect ratios that exist', () => {
      DEFAULT_BORDER_PRESETS.forEach((preset) => {
        if (preset.settings.aspectRatio !== 'custom') {
          expect(ASPECT_RATIO_MAP.has(preset.settings.aspectRatio)).toBe(true);
        }
      });
    });
  });

  it('includes the real film format aspect ratios', () => {
    const filmRatios = [
      3 / 2, // 35mm
      4 / 3, // 6x4.5
      1 / 1, // 6x6
      7 / 6, // 6x7
      5 / 4, // 4x5
      65 / 24, // XPan
    ];

    const calculatedRatios = ASPECT_RATIOS.reduce<number[]>((acc, r) => {
      if (r.value !== 'custom' && r.width && r.height) {
        acc.push(r.width / r.height);
      }
      return acc;
    }, []);

    filmRatios.forEach((filmRatio) => {
      const hasMatch = calculatedRatios.some(
        (calcRatio) => Math.abs(calcRatio - filmRatio) < 0.01
      );
      expect(hasMatch).toBe(true);
    });
  });
});
