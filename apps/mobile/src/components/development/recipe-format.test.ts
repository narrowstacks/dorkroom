import { describe, expect, it } from 'vitest';
import {
  formatAgitationMethod,
  formatRecipeTemp,
  formatRecipeTime,
  officialTagColor,
  officialTagLabel,
  pushPullDisplay,
  resolveDilution,
} from './recipe-format';

describe('formatRecipeTime', () => {
  it('formats whole minutes', () => {
    expect(formatRecipeTime(5)).toBe('5m');
  });
  it('formats minutes and seconds', () => {
    expect(formatRecipeTime(8.5)).toBe('8m 30s');
    expect(formatRecipeTime(1.5)).toBe('1m 30s');
  });
  it('formats sub-minute times as seconds', () => {
    expect(formatRecipeTime(0.75)).toBe('45s');
  });
  it('rounds to the nearest second', () => {
    expect(formatRecipeTime(5.255)).toBe('5m 15s');
  });
  it('returns 0s for zero', () => {
    expect(formatRecipeTime(0)).toBe('0s');
  });
  it('returns an em dash for invalid input', () => {
    expect(formatRecipeTime(Number.NaN)).toBe('—');
    expect(formatRecipeTime(-3)).toBe('—');
  });
});

describe('resolveDilution', () => {
  it('prefers an explicit customDilution', () => {
    expect(resolveDilution({ customDilution: '1+25', dilutionId: 'x' })).toBe(
      '1+25'
    );
  });
  it('looks up the developer dilution by id', () => {
    const developer = {
      dilutions: [
        { id: 'a', name: 'Stock', dilution: 'Stock' },
        { id: 'b', name: 'B', dilution: '1+1' },
      ],
    };
    expect(
      resolveDilution({ customDilution: null, dilutionId: 'b' }, developer)
    ).toBe('1+1');
  });
  it('falls back to Stock when nothing matches', () => {
    expect(resolveDilution({ customDilution: null, dilutionId: null })).toBe(
      'Stock'
    );
    expect(
      resolveDilution(
        { customDilution: '  ', dilutionId: 'missing' },
        {
          dilutions: [{ id: 'a', name: 'A', dilution: '1+1' }],
        }
      )
    ).toBe('Stock');
  });
});

describe('pushPullDisplay', () => {
  it('returns null at box speed', () => {
    expect(pushPullDisplay(0)).toBeNull();
    expect(pushPullDisplay(0.04)).toBeNull();
  });
  it('describes a push', () => {
    expect(pushPullDisplay(1)).toEqual({ label: '+1', direction: 'push' });
  });
  it('describes a pull', () => {
    expect(pushPullDisplay(-2)).toEqual({ label: '-2', direction: 'pull' });
  });
  it('keeps a fractional magnitude', () => {
    expect(pushPullDisplay(0.5)).toEqual({ label: '+0.5', direction: 'push' });
  });
  it('returns null for non-finite input', () => {
    expect(pushPullDisplay(Number.NaN)).toBeNull();
  });
});

describe('formatRecipeTemp', () => {
  it('formats celsius', () => {
    expect(formatRecipeTemp(20, 68, 'C')).toBe('20°C');
  });
  it('formats fahrenheit', () => {
    expect(formatRecipeTemp(20, 68, 'F')).toBe('68°F');
  });
  it('keeps one decimal for fractional values', () => {
    expect(formatRecipeTemp(20.5, 68.9, 'C')).toBe('20.5°C');
  });
  it('returns an em dash for invalid input', () => {
    expect(formatRecipeTemp(Number.NaN, Number.NaN, 'C')).toBe('—');
  });
});

describe('officialTagLabel', () => {
  it('labels a longer brand', () => {
    expect(officialTagLabel('official-kodak')).toBe('Official Kodak Recipe');
  });
  it('labels a longer brand with multiple words', () => {
    expect(officialTagLabel('official-cinestill')).toBe(
      'Official Cinestill Recipe'
    );
  });
  it('uppercases short brand segments', () => {
    expect(officialTagLabel('official-jch')).toBe('Official JCH Recipe');
  });
  it('passes through unprefixed tags unchanged', () => {
    expect(officialTagLabel('custom-tag')).toBe('custom-tag');
  });
});

describe('officialTagColor', () => {
  it('returns the known brand hex', () => {
    expect(officialTagColor('official-cinestill')).toBe('#f87171');
  });
  it('is case-insensitive', () => {
    expect(officialTagColor('OFFICIAL-KODAK')).toBe('#e5ff7d');
  });
  it('falls back to the default hex for unknown tags', () => {
    expect(officialTagColor('custom-tag')).toBe('#a1a1aa');
  });
});

describe('formatAgitationMethod', () => {
  it('returns Standard for null', () => {
    expect(formatAgitationMethod(null)).toBe('Standard');
  });
  it('returns Standard for undefined', () => {
    expect(formatAgitationMethod(undefined)).toBe('Standard');
  });
  it('returns Standard for whitespace-only input', () => {
    expect(formatAgitationMethod('  ')).toBe('Standard');
  });
  it('capitalizes a known method', () => {
    expect(formatAgitationMethod('intermittent')).toBe('Intermittent');
  });
  it('capitalizes stand agitation', () => {
    expect(formatAgitationMethod('stand')).toBe('Stand');
  });
});
