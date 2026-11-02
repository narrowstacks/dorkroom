/**
 * Press-and-hold repeat for `Stepper`, kept free of react-native so it can be
 * tested with fake timers. Callers compute an absolute value from their render's
 * state (`set(n + 1)`), so every repeat must call the handlers from the latest
 * render, never the ones captured at press-in (#317).
 */
export const HOLD_DELAY_MS = 350;
export const REPEAT_INTERVAL_MS = 120;

export type StepDirection = 'decrement' | 'increment';

export interface StepperHandlers {
  /** Displayed value, used to notice when a step had no effect (a bound). */
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function createStepperRepeat(feedback: () => void) {
  let handlers: StepperHandlers | null = null;
  let delay: ReturnType<typeof setTimeout> | null = null;
  let repeat: ReturnType<typeof setInterval> | null = null;

  const release = () => {
    if (delay) clearTimeout(delay);
    if (repeat) clearInterval(repeat);
    delay = null;
    repeat = null;
  };

  const step = (current: StepperHandlers, direction: StepDirection) => {
    feedback();
    if (direction === 'increment') current.onIncrement();
    else current.onDecrement();
  };

  return {
    /** Hand over the latest render's handlers. */
    update(next: StepperHandlers) {
      handlers = next;
    },
    press(direction: StepDirection) {
      release();
      if (!handlers) return;
      let lastValue = handlers.value;
      step(handlers, direction);
      delay = setTimeout(() => {
        repeat = setInterval(() => {
          // An unchanged value means the last step was clamped: stop at the bound.
          if (!handlers || handlers.value === lastValue) {
            release();
            return;
          }
          lastValue = handlers.value;
          step(handlers, direction);
        }, REPEAT_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    release,
  };
}
