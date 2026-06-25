import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

/**
 * A rounded dark-blur backdrop so overlaid readouts and dials stay legible
 * against any scene behind the camera feed.
 */
export function BlurPanel({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <BlurView intensity={44} tint="dark" style={[styles.panel, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(18,18,18,0.36)',
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.30)',
  },
});
