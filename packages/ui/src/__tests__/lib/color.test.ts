import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock CSS.supports to control feature detection
const mockCSSSupports = vi.fn();

describe('color utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules before each test
    vi.resetModules();
  });

  describe('colorMixOr function', () => {
    it('returns color-mix when CSS supports it', async () => {
      // Mock CSS.supports to return true
      Object.defineProperty(global, 'CSS', {
        value: { supports: mockCSSSupports.mockReturnValue(true) },
        writable: true,
      });

      const { colorMixOr } = await import('../../lib/color');
      const result = colorMixOr('var(--color-primary)', 50, 'white');
      expect(result).toBe(
        'color-mix(in srgb, var(--color-primary) 50%, white)'
      );
    });

    it('uses default transparent for second color', async () => {
      Object.defineProperty(global, 'CSS', {
        value: { supports: mockCSSSupports.mockReturnValue(true) },
        writable: true,
      });

      const { colorMixOr } = await import('../../lib/color');
      const result = colorMixOr('var(--color-primary)', 75);
      expect(result).toBe(
        'color-mix(in srgb, var(--color-primary) 75%, transparent)'
      );
    });

    it('returns fallback when color-mix not supported and fallback provided', async () => {
      Object.defineProperty(global, 'CSS', {
        value: { supports: mockCSSSupports.mockReturnValue(false) },
        writable: true,
      });

      const { colorMixOr } = await import('../../lib/color');
      const result = colorMixOr('var(--color-primary)', 50, 'white', 'red');
      expect(result).toBe('red');
    });

    it('returns base color when color-mix not supported and no fallback', async () => {
      Object.defineProperty(global, 'CSS', {
        value: { supports: mockCSSSupports.mockReturnValue(false) },
        writable: true,
      });

      const { colorMixOr } = await import('../../lib/color');
      const result = colorMixOr('var(--color-primary)', 50, 'white');
      expect(result).toBe('var(--color-primary)');
    });

    it('handles edge cases with percentages', async () => {
      Object.defineProperty(global, 'CSS', {
        value: { supports: mockCSSSupports.mockReturnValue(true) },
        writable: true,
      });

      const { colorMixOr } = await import('../../lib/color');
      expect(colorMixOr('red', 0)).toBe(
        'color-mix(in srgb, red 0%, transparent)'
      );
      expect(colorMixOr('red', 100)).toBe(
        'color-mix(in srgb, red 100%, transparent)'
      );
    });
  });

  describe('supportsColorMix constant', () => {
    it('is true when CSS.supports is available and supports color-mix', async () => {
      Object.defineProperty(global, 'CSS', {
        value: { supports: mockCSSSupports.mockReturnValue(true) },
        writable: true,
      });

      const { supportsColorMix } = await import('../../lib/color');
      expect(supportsColorMix).toBe(true);
    });

    it('is false when CSS.supports is not available', async () => {
      Object.defineProperty(global, 'CSS', {
        value: undefined,
        writable: true,
      });

      const { supportsColorMix } = await import('../../lib/color');
      expect(supportsColorMix).toBe(false);
    });
  });
});
