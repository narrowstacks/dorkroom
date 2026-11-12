import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SAFELIGHT_OVERLAY } from '@/theme/safelight';
import { rootVarsStyle } from '@/theme/safelight-vars';
import { useSafelight } from './safelight-provider';

/**
 * The guarantee: one full-window, non-interactive pure-red view that multiplies
 * everything beneath it, so green and blue are zero whatever a screen draws.
 */
export function SafelightOverlay() {
  const { on } = useSafelight();
  if (!on) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: SAFELIGHT_OVERLAY, mixBlendMode: 'multiply' },
      ]}
    />
  );
}

interface SafelightRootProps {
  children: ReactNode;
  /**
   * Draw the full-window overlay (default). Pass false in a TRANSPARENT modal:
   * multiplying over a window with nothing painted in it yields plain red, so
   * there the overlay goes inside the surface that is painted instead (the
   * sheet's panel, the dialog's card), and the root only carries the variables.
   */
  overlay?: boolean;
  /** Paint the window opaque black under the mode, for a modal whose own
   * backdrop is translucent. */
  opaque?: boolean;
}

/**
 * The root of one window: the content, the safelight variable overrides, and
 * (by default) the overlay as the LAST child. Use it at the app root and inside
 * every RN `Modal`, which is a separate window the root overlay cannot reach.
 */
export function SafelightRoot({
  children,
  overlay = true,
  opaque = false,
}: SafelightRootProps) {
  const { on } = useSafelight();
  return (
    <View
      style={[
        styles.fill,
        // Always a vars() style, from the first render: one that appears later
        // remounts this view and everything under it (react-native-css-interop).
        rootVarsStyle(on),
        on && opaque ? styles.black : null,
      ]}
    >
      {children}
      {overlay ? <SafelightOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  black: { backgroundColor: '#000000' },
});
