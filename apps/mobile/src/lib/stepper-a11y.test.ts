import { describe, expect, it, vi } from 'vitest';
import {
  handleStepperAction,
  STEPPER_ACCESSIBILITY_ACTIONS,
  stepperAccessibilityValue,
} from './stepper-a11y';

describe('stepper accessibility', () => {
  it('declares increment and decrement actions', () => {
    expect(STEPPER_ACCESSIBILITY_ACTIONS.map((a) => a.name)).toEqual([
      'increment',
      'decrement',
    ]);
  });

  it('exposes the displayed value, unit included, as the value text', () => {
    expect(stepperAccessibilityValue('+1/3 stops')).toEqual({
      text: '+1/3 stops',
    });
  });

  it('routes increment and decrement to the matching callback once', () => {
    const dec = vi.fn();
    const inc = vi.fn();
    expect(handleStepperAction('increment', dec, inc)).toBe(true);
    expect(inc).toHaveBeenCalledTimes(1);
    expect(dec).not.toHaveBeenCalled();
    expect(handleStepperAction('decrement', dec, inc)).toBe(true);
    expect(dec).toHaveBeenCalledTimes(1);
    expect(inc).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown actions', () => {
    const dec = vi.fn();
    const inc = vi.fn();
    expect(handleStepperAction('activate', dec, inc)).toBe(false);
    expect(dec).not.toHaveBeenCalled();
    expect(inc).not.toHaveBeenCalled();
  });
});
