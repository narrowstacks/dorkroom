import { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import {
  bottomPaddingFor,
  keyboardCeiling,
  panelPlacement,
  scrimAlpha,
} from '@/components/detent-sheet/detent-sheet-layout';

interface DetentStylesInput {
  height: SharedValue<number>;
  mediumHeight: SharedValue<number>;
  largeHeight: SharedValue<number>;
  /** True once the heights and the resting height are written. */
  ready: SharedValue<boolean>;
  /** 0 to 1 on the entrance timeline. */
  enter: SharedValue<number>;
  keyboardHeight: SharedValue<number>;
  windowHeight: number;
  topInset: number;
  insetBottom: number;
}

/**
 * The panel's frame and the scrim's opacity, both read on the UI thread from
 * the one shared height (and the keyboard's), so a drag costs no JS per frame.
 */
export function useDetentStyles({
  height,
  mediumHeight,
  largeHeight,
  ready,
  enter,
  keyboardHeight,
  windowHeight,
  topInset,
  insetBottom,
}: DetentStylesInput) {
  const panelStyle = useAnimatedStyle(() => {
    // Until `ready` the panel is laid out tall and off screen: a view with no
    // room is not mounted, so it would never report the size it needs.
    if (!ready.value) {
      return {
        height: windowHeight,
        transform: [{ translateY: windowHeight }],
      };
    }
    const lift = keyboardHeight.value;
    const placement = panelPlacement({
      height: height.value,
      mediumHeight: mediumHeight.value,
      ceiling: keyboardCeiling(windowHeight, topInset, lift),
    });
    return {
      height: placement.height,
      paddingBottom: bottomPaddingFor(insetBottom, lift),
      transform: [
        {
          translateY:
            placement.slide + (1 - enter.value) * placement.height - lift,
        },
      ],
    };
  });

  const scrimStyle = useAnimatedStyle(() => {
    const medium = mediumHeight.value;
    // Fades out as the dismiss drag takes the sheet down.
    const dismissFade = medium > 0 ? Math.min(1, height.value / medium) : 1;
    return {
      opacity:
        scrimAlpha(height.value, medium, largeHeight.value) *
        enter.value *
        dismissFade,
    };
  });

  return { panelStyle, scrimStyle };
}
