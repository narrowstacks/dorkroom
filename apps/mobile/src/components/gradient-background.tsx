import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { backdropStyle } from '@/theme/backdrop';
import { usePhase } from '@/theme/phase-context';

/**
 * The screen backdrop for the current phase and mode (`backdropStyle`). Put it
 * on the screen's root view, so a scroll view can stay the root's first child.
 */
export function useBackdropStyle(): ViewStyle {
  const phase = usePhase();
  const { on } = useSafelight();
  return backdropStyle(phase, on);
}

/**
 * The backdrop as an absolute-fill, non-interactive view, for screens with no
 * scroll view (stage screens, the Inverter's frame). Never put it in front of
 * a scroll view on a large-title screen: put `useBackdropStyle()` on the root
 * view instead.
 */
export function GradientBackground() {
  const backdrop = useBackdropStyle();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, backdrop]} />
  );
}
