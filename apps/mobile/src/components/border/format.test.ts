import { describe, expect, it } from 'vitest';
import { formatLength, formatPosition, formatPreviewCaption } from './format';

describe('formatLength', () => {
  it('formats whole and fractional inches without trailing zeros', () => {
    expect(formatLength(7, 'imperial')).toBe('7"');
    expect(formatLength(0.5, 'imperial')).toBe('0.5"');
    expect(formatLength(6.25, 'imperial')).toBe('6.25"');
  });

  it('formats metric as centimetres to the millimetre', () => {
    expect(formatLength(1, 'metric')).toBe('2.5cm');
    expect(formatLength(0.5, 'metric')).toBe('1.3cm');
    expect(formatLength(10, 'metric')).toBe('25.4cm');
    expect(formatLength(7.874, 'metric')).toBe('20cm');
  });

  it('honours an explicit precision and never prints -0', () => {
    expect(formatLength(6.25, 'imperial', 1)).toBe('6.3"');
    expect(formatLength(-0.01, 'metric')).toBe('0cm');
  });
});

describe('formatPreviewCaption', () => {
  it('describes the print size on the paper in inches', () => {
    expect(
      formatPreviewCaption(
        { printWidth: 7, printHeight: 9 },
        '8×10',
        'imperial'
      )
    ).toBe('7" × 9" image on 8×10');
  });

  it('describes the print size in centimetres for metric', () => {
    expect(
      formatPreviewCaption({ printWidth: 7, printHeight: 9 }, '8×10', 'metric')
    ).toBe('17.8cm × 22.9cm image on 8×10');
  });
});

describe('formatPosition', () => {
  it('reports Centered when offsets are disabled', () => {
    expect(formatPosition(false, 1, 2, 'imperial')).toBe('Centered');
  });

  it('reports H/V values to one decimal in the unit when enabled', () => {
    expect(formatPosition(true, 0.2, -0.5, 'imperial')).toBe(
      'H: 0.2"  V: -0.5"'
    );
    expect(formatPosition(true, 0.2, -0.5, 'metric')).toBe(
      'H: 0.5cm  V: -1.3cm'
    );
  });
});
