import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

/**
 * A rounded translucent "glass" pill for the controls drawn over the camera
 * feed (ISO lock, roll picker, calibration). Shares the {@link BlurPanel}
 * BlurView pattern but is pill-shaped with a hairline edge, so the top controls
 * read as one cohesive, iOS-native bar.
 */
export function GlassPill({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <BlurView intensity={24} tint="dark" style={[styles.pill, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
});
