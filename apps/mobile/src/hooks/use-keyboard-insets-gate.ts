import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import {
  createKeyboardTracker,
  initialKeyboardGate,
  isKeyboardGateOpen,
  isWaitingForHide,
  KEYBOARD_TRACKER_EVENTS,
  keyboardGateOnFocusChange,
  keyboardGateOnHide,
} from '@/lib/keyboard-insets-gate';

// One tracker for the app, subscribed for its lifetime.
const keyboard = createKeyboardTracker(Keyboard.isVisible());
for (const event of KEYBOARD_TRACKER_EVENTS) {
  Keyboard.addListener(event, () => keyboard.onEvent(event));
}

/**
 * Whether a `Screen` should let React Native adjust its scroll view for the
 * keyboard (`automaticallyAdjustKeyboardInsets`). Open while it is the
 * focused screen, except for a keyboard that was already up when it became
 * focused or mounted (a tab switch, a push or Back with a field still focused
 * elsewhere): that keyboard's hide would clamp this screen to offset 0, its
 * first rows under the header (see `Screen`). Still open after it loses focus
 * with its own keyboard up (a push or tab switch while typing), until that
 * keyboard hides: the hide is what clears the bottom inset, and a hide it
 * missed left a keyboard-sized blank band at the end of the screen. The rule
 * is `lib/keyboard-insets-gate.ts`.
 */
export function useKeyboardInsetsGate(): boolean {
  const focused = useIsFocused();
  const [gate, setGate] = useState(() =>
    initialKeyboardGate(focused, keyboard.isUp())
  );
  // Decided during render, so the first commit after a focus change has it.
  if (focused !== gate.focused) {
    setGate(keyboardGateOnFocusChange(gate, focused, keyboard.isUp()));
  }
  const waiting = isWaitingForHide(gate);
  useEffect(() => {
    if (!waiting) return;
    const sub = Keyboard.addListener('keyboardDidHide', () =>
      setGate(keyboardGateOnHide)
    );
    // A hide that landed between the render that set this and the subscription.
    if (!keyboard.isUp()) setGate(keyboardGateOnHide);
    return () => sub.remove();
  }, [waiting]);
  return isKeyboardGateOpen(gate);
}
