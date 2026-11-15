import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * The keyboard's height while it is up, else 0. It follows `keyboardWillShow`
 * and `keyboardWillHide`, so a layout that reads it moves as the keyboard
 * starts to rise or fall: the form sheets shrink their body with it, and Home
 * hides its favorites row while the search field is typing.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (event) =>
      setHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
