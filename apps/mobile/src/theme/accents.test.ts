import { describe, expect, it } from 'vitest';
import {
  ACCENT,
  type AccentColor,
  commitColors,
  PHASE_ACCENT,
  selectionTint,
} from './accents';

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (start: number) => {
    const c = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('commitColors', () => {
  const accents: AccentColor[] = ['yellow', 'teal', 'rose'];

  it.each(accents)(
    '%s fill with its ink reads at 4.5:1 or better',
    (accent) => {
      const { fill, ink } = commitColors(accent);
      expect(fill).toBe(ACCENT[accent]);
      expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it('would fail with white ink on the phase hues, which is why the ink is dark', () => {
    for (const accent of accents) {
      expect(contrastRatio(ACCENT[accent], '#ffffff')).toBeLessThan(4.5);
    }
  });

  it('is the brand rose with white ink outside a phase, at 4.5:1 or better', () => {
    const { fill, ink } = commitColors(null);
    expect(ink).toBe('#ffffff');
    expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives each phase a distinct hue', () => {
    expect(new Set(Object.values(PHASE_ACCENT)).size).toBe(3);
  });
});

describe('selectionTint', () => {
  it('is a neutral white tint with no accent', () => {
    const tint = selectionTint(null);
    expect(tint.color).toBe('#ffffff');
    expect(tint.backgroundColor).toMatch(/^rgba\(255,255,255,/);
  });

  it('tints with the hue otherwise', () => {
    expect(selectionTint('teal').color).toBe(ACCENT.teal);
  });
});
