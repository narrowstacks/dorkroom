import { describe, expect, it } from 'vitest';
import { formatInches, formatPosition, formatPreviewCaption } from './format';

describe('formatInches', () => {
  it('formats whole and fractional inches without trailing zeros', () => {
    expect(formatInches(7)).toBe('7"');
    expect(formatInches(0.5)).toBe('0.5"');
    expect(formatInches(6.25)).toBe('6.25"');
  });
});

describe('formatPreviewCaption', () => {
  it('describes the print size on the paper', () => {
    expect(
      formatPreviewCaption({ printWidth: 7, printHeight: 9 }, '8×10')
    ).toBe('7" × 9" image on 8×10');
  });
});

describe('formatPosition', () => {
  it('reports Centered when offsets are disabled', () => {
    expect(formatPosition(false, 1, 2)).toBe('Centered');
  });

  it('reports H/V values to one decimal when enabled', () => {
    expect(formatPosition(true, 0.2, -0.5)).toBe('H: 0.2  V: -0.5');
  });
});
