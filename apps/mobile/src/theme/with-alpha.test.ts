import { describe, expect, it } from 'vitest';
import { ACCENT } from './accents';
import { parseColor, SAFELIGHT_HUE } from './safelight';
import { hexAlpha, withAlpha } from './with-alpha';

describe('withAlpha', () => {
  it('takes #rrggbb', () => {
    expect(withAlpha('#fb7185', 0.2)).toBe('rgba(251, 113, 133, 0.2)');
  });

  it('takes #rgb', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('takes #rrggbbaa and replaces its alpha', () => {
    expect(withAlpha('#fb718580', 0.2)).toBe('rgba(251, 113, 133, 0.2)');
  });

  it('takes rgb(r, g, b), the safelight hue', () => {
    expect(withAlpha('rgb(255, 0, 0)', 0.2)).toBe('rgba(255, 0, 0, 0.2)');
    expect(withAlpha(SAFELIGHT_HUE, 0.2)).toBe('rgba(255, 0, 0, 0.2)');
  });

  it('takes rgba(...) and replaces its alpha', () => {
    expect(withAlpha('rgba(10, 20, 30, 0.9)', 0.4)).toBe(
      'rgba(10, 20, 30, 0.4)'
    );
  });

  it('rejects what it cannot parse, rather than returning garbage', () => {
    expect(() => withAlpha('transparent', 0.2)).toThrow('unsupported colour');
    expect(() => withAlpha('rgb(255, 0, 0)33', 0.2)).toThrow();
    expect(() => withAlpha('red', 0.2)).toThrow();
  });

  it('rejects an alpha outside 0..1', () => {
    expect(() => withAlpha('#fff', 1.5)).toThrow('outside 0..1');
    expect(() => withAlpha('#fff', Number.NaN)).toThrow();
  });
});

describe('hexAlpha', () => {
  it('maps hex suffixes to alphas', () => {
    expect(hexAlpha('33')).toBeCloseTo(0.2, 10);
    expect(hexAlpha('ff')).toBe(1);
    expect(hexAlpha('00')).toBe(0);
  });

  it('rejects anything but two hex digits', () => {
    expect(() => hexAlpha('3')).toThrow();
    expect(() => hexAlpha('zz')).toThrow();
  });
});

describe('normal mode is pixel-identical to the hex-suffix colours it replaces', () => {
  /** The 8-bit RGBA a colour string paints. */
  const bytes = (colour: string) => {
    const parsed = parseColor(colour);
    if (parsed === null) throw new Error(colour);
    const [r, g, b, a] = parsed;
    return [r, g, b, Math.round(a * 255)];
  };

  // The mat preview's artwork footprint: `${hue}33`, hue being a phase hue
  // (rose in Print) or the neutral white outside a phase.
  it.each([ACCENT.rose, '#ffffff'])(
    '${hue}33 equals withAlpha(hue, 0.2) for %s',
    (hue) => {
      expect(bytes(withAlpha(hue, hexAlpha('33')))).toEqual(bytes(`${hue}33`));
      expect(bytes(withAlpha(hue, 0.2))).toEqual(bytes(`${hue}33`));
    }
  );
});
