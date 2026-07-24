import { useState } from 'react';
// eslint-disable-next-line react-doctor/rn-prefer-reanimated -- JS-thread Animated is intentional: the drag is a JS-thread PanResponder (no gesture-handler) and reanimated's worklet babel plugin isn't wired up; the ruler commits on release so there are no React re-renders during the drag, keeping the glide smooth.
import { Animated } from 'react-native';

/** Creates the stable drag-offset value shared between the active scrubber
 * (writer) and the ruler (reader). Lives here so the screen needn't import
 * Animated directly. Carries the live combined drag offset in px (right/up +). */
export function useDragOffset() {
  const [value] = useState(() => new Animated.Value(0));
  return value;
}
