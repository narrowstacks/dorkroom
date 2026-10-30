import { describe, expect, it } from 'vitest';
import { toDisplayValue, toInternalValue } from '../../lib/measurement';

describe('toDisplayValue', () => {
  // #343: the resize fields and the border custom-paper field render
  // `toDisplay(stored)`, so a typed cm value has to read back unchanged.
  it('shows every one-decimal cm value exactly as typed after a round trip', () => {
    const drifted: number[] = [];
    for (let i = 1; i <= 600; i++) {
      const typed = Number((i / 10).toFixed(1));
      const shown = toDisplayValue(toInternalValue(typed, 'metric'), 'metric');
      if (shown !== typed) drifted.push(typed);
    }

    expect(drifted).toEqual([]);
    expect(
      String(toDisplayValue(toInternalValue(25, 'metric'), 'metric'))
    ).toBe('25');
  });

  it('leaves imperial inches untouched', () => {
    expect(toDisplayValue(8.125, 'imperial')).toBe(8.125);
    expect(toDisplayValue(toInternalValue(10.5, 'imperial'), 'imperial')).toBe(
      10.5
    );
  });
});
