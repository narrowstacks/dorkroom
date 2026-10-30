import { describe, expect, it } from 'vitest';
import { formatPaperSizeWarning } from '../../utils/border-calculations';
import {
  convertDisplayToInches,
  convertInchesToInputValue,
  METRIC_INPUT_DECIMALS,
} from '../../utils/unit-conversion';

/** Every one-decimal centimetre value from 0.1 to 60.0. */
const ONE_DECIMAL_CM = Array.from({ length: 600 }, (_, i) =>
  Number(((i + 1) / 10).toFixed(1))
);

describe('convertInchesToInputValue', () => {
  // #343: typing 25 in a cm field stored 9.843in, which read back as 25.001
  it('round-trips every one-decimal cm value a user can type', () => {
    const drifted = ONE_DECIMAL_CM.filter(
      (cm) =>
        convertInchesToInputValue(
          convertDisplayToInches(cm, 'metric'),
          'metric'
        ) !== cm
    );

    expect(drifted).toEqual([]);
  });

  it('round-trips two-decimal cm values too', () => {
    const typed = [0.05, 1.27, 12.34, 25.4, 40.64, 59.99];
    for (const cm of typed) {
      expect(
        convertInchesToInputValue(
          convertDisplayToInches(cm, 'metric'),
          'metric'
        )
      ).toBe(cm);
    }
  });

  it('shows 25 for the 25cm example from the issue', () => {
    expect(convertDisplayToInches(25, 'metric')).toBe(9.843);
    expect(convertInchesToInputValue(9.843, 'metric')).toBe(25);
  });

  it(`keeps at most ${METRIC_INPUT_DECIMALS} decimals in metric`, () => {
    expect(convertInchesToInputValue(1 / 3, 'metric')).toBe(0.85);
  });

  it('passes inches through unchanged in imperial', () => {
    expect(convertInchesToInputValue(9.843, 'imperial')).toBe(9.843);
    expect(convertInchesToInputValue(8.125, 'imperial')).toBe(8.125);
  });
});

describe('formatPaperSizeWarning', () => {
  it('prints a metric warning in centimetres', () => {
    const w = convertDisplayToInches(60, 'metric');
    const h = convertDisplayToInches(80, 'metric');

    expect(formatPaperSizeWarning(w, h, 'metric')).toBe(
      'Custom paper (60×80cm) exceeds largest standard easel (50.8×60.96cm).'
    );
  });

  it('prints an imperial warning with inch marks on both sizes', () => {
    expect(formatPaperSizeWarning(21, 25.5, 'imperial')).toBe(
      'Custom paper (21×25.5") exceeds largest standard easel (20×24").'
    );
  });
});
