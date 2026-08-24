import { MAT_CALCULATOR_DEFAULTS } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  buildMatWarnings,
  formatArtworkSummary,
  formatBorderSummary,
  formatMatPair,
} from './format';

describe('mat summaries', () => {
  it('formats dimensions without discarding fractions', () => {
    expect(formatMatPair('11 1/2', '14')).toBe('11 1/2 × 14 in');
    expect(formatMatPair('', '14')).toBe('— × 14 in');
  });

  it('summarizes all four borders', () => {
    expect(formatBorderSummary(MAT_CALCULATOR_DEFAULTS)).toBe(
      '3 T · 3 1/2 B · 2 3/4 L/R in'
    );
  });

  it('summarizes artwork and reveal', () => {
    expect(formatArtworkSummary(MAT_CALCULATOR_DEFAULTS)).toBe(
      '11 × 14 · 1/4 reveal'
    );
    expect(
      formatArtworkSummary({ ...MAT_CALCULATOR_DEFAULTS, artW: '', artH: '' })
    ).toBe('Not configured');
  });
});

describe('buildMatWarnings', () => {
  const base = {
    valid: true,
    hasRevealMismatch: false,
    fmt: (value: number) => `${value}"`,
    revVal: 0.25,
    overlapLeft: 0.5,
    overlapTop: 0.75,
  };

  it('returns no warnings for a valid matching layout', () => {
    expect(buildMatWarnings(base)).toEqual([]);
  });

  it('includes invalid and reveal mismatch warnings independently', () => {
    expect(
      buildMatWarnings({ ...base, valid: false, hasRevealMismatch: true })
    ).toEqual([
      'Check inputs. The outer mat must be positive and the borders must leave a window larger than zero on both axes.',
      'Window does not match a 0.25" reveal. Actual overlap: 0.5" L/R · 0.75" T/B.',
    ]);
  });
});
