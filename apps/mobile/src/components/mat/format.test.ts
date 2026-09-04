import { MAT_CALCULATOR_DEFAULTS, makeMatFormatter } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  buildMatWarnings,
  buildMobileMatDimensionRows,
  formatArtworkSummary,
  formatBorderSummary,
  formatMatPair,
  formatSignedMatFraction,
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

  it('preserves negative overlap values when the formatter only supports magnitudes', () => {
    expect(
      buildMatWarnings({
        ...base,
        hasRevealMismatch: true,
        fmt: (value: number) => (value < 0 ? '' : `${value}"`),
        overlapLeft: -0.75,
        overlapTop: -1.75,
      })
    ).toEqual([
      'Window does not match a 0.25" reveal. Actual overlap: -0.75" L/R · -1.75" T/B.',
    ]);
  });
});

describe('buildMobileMatDimensionRows', () => {
  it('replaces only the Actual reveal value with signed fractions', () => {
    const rows: [string, string, string][] = [
      ['Outer mat', '18" × 24"', 'matches frame rabbet'],
      ['Actual reveal', ' L/R ·  T/B', 'mat coverage onto the artwork edge'],
      ['Borders', '3" top', 'distance from outer edge to window edge'],
    ];
    const magnitudeOnly = makeMatFormatter(true);

    expect(
      buildMobileMatDimensionRows(rows, magnitudeOnly, -0.75, -1.75)
    ).toEqual([
      ['Outer mat', '18" × 24"', 'matches frame rabbet'],
      [
        'Actual reveal',
        '-3/4" L/R · -1 3/4" T/B',
        'mat coverage onto the artwork edge',
      ],
      ['Borders', '3" top', 'distance from outer edge to window edge'],
    ]);
  });
});

describe('formatSignedMatFraction', () => {
  it('does not prefix the invalid placeholder with a minus sign', () => {
    expect(formatSignedMatFraction(makeMatFormatter(false), -0.75)).toBe(
      '· · ·'
    );
  });
});
