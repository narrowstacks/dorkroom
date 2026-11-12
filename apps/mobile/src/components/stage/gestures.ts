import { Gesture } from 'react-native-gesture-handler';

// Lowercase wrappers: the compiler lint reads a capitalized call as a component.
export const panGesture = () => Gesture.Pan();
export const longPressGesture = () => Gesture.LongPress();
export const tapGesture = () => Gesture.Tap();
export const exclusiveGesture = (
  ...gestures: Parameters<typeof Gesture.Exclusive>
) => Gesture.Exclusive(...gestures);
