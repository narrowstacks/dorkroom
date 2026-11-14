/**
 * Whether a `Screen` lets React Native adjust its scroll view for the
 * keyboard, as a pure state machine (`useKeyboardInsetsGate` feeds it).
 *
 * React Native's handler (`_keyboardWillChangeFrame` in
 * `RCTScrollViewComponentView.mm`) runs in every mounted scroll view whose
 * prop is on, and it is the only thing that sets and clears the keyboard's
 * bottom inset: with the prop off it returns early, so a hide it misses
 * leaves that inset behind as a blank band at the end of the screen. Each
 * time it runs it also re-applies the offset through a clamp at 0, which puts
 * a screen near its top under its header. So the gate is open for the focused
 * screen, except for a keyboard that was already up when the screen gained
 * focus or mounted (its hide would only clamp this screen), and stays open
 * after the screen loses focus with its own keyboard up, until that keyboard
 * has hidden and the inset is cleared.
 */
export interface KeyboardGateState {
  focused: boolean;
  /** A keyboard was up when this screen gained focus, and it is not its own. */
  inherited: boolean;
  /** This screen lost focus while adjusting for a keyboard that is still up. */
  held: boolean;
}

export const initialKeyboardGate = (
  focused: boolean,
  keyboardUp: boolean
): KeyboardGateState => ({
  focused,
  inherited: focused && keyboardUp,
  held: false,
});

export const isKeyboardGateOpen = (state: KeyboardGateState): boolean =>
  state.focused ? !state.inherited : state.held;

/** Whether the state changes when the keyboard hides (`keyboardGateOnHide`). */
export const isWaitingForHide = (state: KeyboardGateState): boolean =>
  state.inherited || state.held;

export function keyboardGateOnFocusChange(
  state: KeyboardGateState,
  focused: boolean,
  keyboardUp: boolean
): KeyboardGateState {
  // The gate was open with a keyboard up, so that keyboard's inset is ours.
  const owned = keyboardUp && isKeyboardGateOpen(state);
  return {
    focused,
    inherited: focused && keyboardUp && !owned,
    held: !focused && owned,
  };
}

/** The keyboard has gone: nothing is inherited or held any more. */
export const keyboardGateOnHide = (
  state: KeyboardGateState
): KeyboardGateState => initialKeyboardGate(state.focused, false);

/** The keyboard events `createKeyboardTracker` follows. */
export const KEYBOARD_TRACKER_EVENTS = [
  'keyboardWillShow',
  'keyboardDidShow',
  'keyboardWillHide',
  'keyboardDidHide',
] as const;

export type KeyboardTrackerEvent = (typeof KEYBOARD_TRACKER_EVENTS)[number];

export interface KeyboardTracker {
  isUp: () => boolean;
  onEvent: (event: KeyboardTrackerEvent) => void;
}

/**
 * Whether the keyboard is up, as React Native's handler sees it. That handler
 * acts on the will-events, while `Keyboard.isVisible()` flips only on the
 * did-events, so a screen that lost focus between `keyboardWillShow` and
 * `keyboardDidShow` already had the inset but was not held. The will-events
 * decide; the did-events are a backstop for a will-event that never came.
 */
export function createKeyboardTracker(initiallyUp: boolean): KeyboardTracker {
  let up = initiallyUp;
  return {
    isUp: () => up,
    onEvent: (event) => {
      up = event === 'keyboardWillShow' || event === 'keyboardDidShow';
    },
  };
}
