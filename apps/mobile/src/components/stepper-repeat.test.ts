import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStepperRepeat,
  HOLD_DELAY_MS,
  REPEAT_INTERVAL_MS,
} from './stepper-repeat';

/**
 * Stands in for a Stepper caller: like every real one, its callbacks compute
 * an absolute value from the state of the render that created them, and each
 * state change re-renders (here: hands the repeater fresh handlers).
 */
function mountCounter(initial: number, min = Number.NEGATIVE_INFINITY) {
  const feedback = vi.fn();
  const repeat = createStepperRepeat(feedback);
  let value = initial;
  const render = () => {
    const rendered = value;
    repeat.update({
      value: String(rendered),
      onDecrement: () => setValue(Math.max(min, rendered - 1)),
      onIncrement: () => setValue(rendered + 1),
    });
  };
  const setValue = (next: number) => {
    value = next;
    render();
  };
  render();
  return { repeat, feedback, current: () => value };
}

describe('createStepperRepeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps climbing for as long as the button is held', () => {
    const { repeat, current } = mountCounter(0);

    repeat.press('increment');
    expect(current()).toBe(1);

    vi.advanceTimersByTime(HOLD_DELAY_MS + REPEAT_INTERVAL_MS * 4);
    expect(current()).toBe(5);

    repeat.release();
    vi.advanceTimersByTime(REPEAT_INTERVAL_MS * 4);
    expect(current()).toBe(5);
  });

  it('stops repeating, haptics included, once the value hits a bound', () => {
    const { repeat, feedback, current } = mountCounter(3, 1);

    repeat.press('decrement');
    vi.advanceTimersByTime(HOLD_DELAY_MS + REPEAT_INTERVAL_MS * 10);

    expect(current()).toBe(1);
    // Press (3 -> 2), a repeat (2 -> 1), then one clamped step (1 -> 1). The
    // repeater can only see a step had no effect after trying it, then stops.
    expect(feedback).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing further after release, as on unmount', () => {
    const { repeat, feedback } = mountCounter(0);

    repeat.press('increment');
    vi.advanceTimersByTime(HOLD_DELAY_MS - 1);
    repeat.release();
    vi.advanceTimersByTime(HOLD_DELAY_MS + REPEAT_INTERVAL_MS * 4);

    expect(feedback).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
