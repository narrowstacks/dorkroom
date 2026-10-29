/**
 * VoiceOver semantics for `Stepper`, kept free of react-native imports so the
 * behavior is unit-testable under vitest (which has no RN renderer).
 *
 * The min/max/step clamping lives in the `onDecrement` / `onIncrement`
 * callbacks each screen passes in (the same ones the visible buttons call), so
 * routing accessibility actions through them keeps both paths identical.
 */

export const STEPPER_ACCESSIBILITY_ACTIONS = [
  { name: 'increment' },
  { name: 'decrement' },
] as const;

export function stepperAccessibilityValue(value: string) {
  return { text: value };
}

/** Runs the matching callback for a VoiceOver action; returns whether it handled one. */
export function handleStepperAction(
  actionName: string,
  onDecrement: () => void,
  onIncrement: () => void
): boolean {
  if (actionName === 'increment') {
    onIncrement();
    return true;
  }
  if (actionName === 'decrement') {
    onDecrement();
    return true;
  }
  return false;
}
