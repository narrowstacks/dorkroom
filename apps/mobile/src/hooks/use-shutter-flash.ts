import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * A quick white screen-flash to confirm a frame was captured. Returns the
 * animated style to apply to a full-screen overlay and a trigger to fire it.
 */
export function useShutterFlash() {
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const triggerFlash = useCallback(() => {
    flash.value = withSequence(
      withTiming(0.85, { duration: 50 }),
      withTiming(0, { duration: 220 })
    );
  }, [flash]);
  return { flashStyle, triggerFlash };
}
