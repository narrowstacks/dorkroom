import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Whether a `Screen` should let React Native adjust its scroll view for the
 * keyboard (`automaticallyAdjustKeyboardInsets`). Only while it is the
 * focused screen, and not for a keyboard that was already up when it became
 * focused (a tab switch or Back with a field still focused elsewhere): that
 * keyboard's hide would be handled here and clamp this screen to offset 0,
 * its first rows under the header (see `Screen`). It counts again once that
 * keyboard has gone.
 */
export function useKeyboardInsetsGate(): boolean {
  const focused = useIsFocused();
  const [prevFocused, setPrevFocused] = useState(focused);
  const [inherited, setInherited] = useState(false);
  // Decided during render, so the first commit after focus already has it.
  if (focused !== prevFocused) {
    setPrevFocused(focused);
    setInherited(focused && Keyboard.isVisible());
  }
  useEffect(() => {
    if (!inherited) return;
    const sub = Keyboard.addListener('keyboardDidHide', () =>
      setInherited(false)
    );
    return () => sub.remove();
  }, [inherited]);
  return focused && !inherited;
}
