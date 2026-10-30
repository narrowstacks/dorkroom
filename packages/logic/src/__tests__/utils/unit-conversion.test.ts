import { describe, expect, it } from 'vitest';
import {
  convertDisplayToInches,
  convertInchesToInputValue,
  METRIC_INPUT_MAX_DECIMALS,
} from '../../utils/unit-conversion';

/** Every n-decimal value from `step` to `max`, e.g. 0.1..60.0. */
function sweep(max: number, decimals: number): number[] {
  const scale = 10 ** decimals;
  return Array.from({ length: Math.round(max * scale) }, (_, i) =>
    Number(((i + 1) / scale).toFixed(decimals))
  );
}

/** Stored inches -> shown in a metric field -> that text committed again. */
const recommitInMetric = (inches: number): number =>
  convertDisplayToInches(convertInchesToInputValue(inches, 'metric'), 'metric');

/** Typed cm -> stored inches -> shown back in the metric field. */
const typeInMetric = (cm: number): number =>
  convertInchesToInputValue(convertDisplayToInches(cm, 'metric'), 'metric');

describe('convertInchesToInputValue', () => {
  // #343: typing 25 in a cm field stored 9.843in, which read back as 25.001
  it('shows every one-decimal cm value 0.1-60.0 exactly as typed', () => {
    expect(sweep(60, 1).filter((cm) => typeInMetric(cm) !== cm)).toEqual([]);
  });

  it('shows every two-decimal cm value 0.01-60.00 exactly as typed', () => {
    expect(sweep(60, 2).filter((cm) => typeInMetric(cm) !== cm)).toEqual([]);
  });

  it('shows 25 for the 25cm example from the issue', () => {
    expect(convertDisplayToInches(25, 'metric')).toBe(9.843);
    expect(convertInchesToInputValue(9.843, 'metric')).toBe(25);
  });

  // Blurring a metric field re-commits its text, so an inch-entered value
  // must survive being shown in cm (8.125in must not become 8.126in).
  it('keeps every sixteenth of an inch to 48in when re-committed in metric', () => {
    // Stored the way an imperial entry is: rounded to 3 decimals (1/16 -> 0.063)
    const stored = Array.from({ length: 48 * 16 }, (_, i) =>
      convertDisplayToInches((i + 1) / 16, 'imperial')
    );
    const drifted = stored.filter(
      (inches) => recommitInMetric(inches) !== inches
    );
    expect(drifted).toEqual([]);
  });

  it('keeps every 3-decimal inch value to 30in when re-committed in metric', () => {
    expect(
      sweep(30, 3).filter((inches) => recommitInMetric(inches) !== inches)
    ).toEqual([]);
  });

  it('shows 8.125in as 20.638cm, the shortest exact cm', () => {
    expect(convertInchesToInputValue(8.125, 'metric')).toBe(20.638);
  });

  it(`never shows more than ${METRIC_INPUT_MAX_DECIMALS} decimals`, () => {
    expect(convertInchesToInputValue(1 / 3, 'metric')).toBe(0.847);
  });

  it('passes inches through unchanged in imperial', () => {
    expect(convertInchesToInputValue(9.843, 'imperial')).toBe(9.843);
    expect(convertInchesToInputValue(8.125, 'imperial')).toBe(8.125);
  });
});
