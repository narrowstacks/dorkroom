import { describe, expect, it } from 'vitest';
import {
  formatBladeReadings,
  formatBorders,
  formatLength,
  formatPreviewCaption,
  formatSpokenCaption,
} from './format';

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

describe('formatSpokenCaption', () => {
  it('says "by", not the multiplication sign', () => {
    expect(
      formatSpokenCaption({ printWidth: 7, printHeight: 9 }, '8×10', 'imperial')
    ).toBe('7" by 9" image on 8 by 10');
  });
});

describe('formatBorders and formatBladeReadings', () => {
  const c = {
    leftBorder: 1,
    rightBorder: 1.5,
    topBorder: 0.5,
    bottomBorder: 2,
    leftBladeReading: 1.25,
    rightBladeReading: 6,
    topBladeReading: 0.5,
    bottomBladeReading: 7.5,
  };

  it('names each border with its side', () => {
    expect(formatBorders(c, 'imperial')).toBe(
      'Borders left 1", right 1.5", top 0.5", bottom 2"'
    );
  });

  it('names each blade with its side, in the unit', () => {
    expect(formatBladeReadings(c, 'imperial')).toBe(
      'Blades left 1.25", right 6", top 0.5", bottom 7.5"'
    );
    expect(formatBladeReadings(c, 'metric')).toContain('left 3.2cm');
  });
});
