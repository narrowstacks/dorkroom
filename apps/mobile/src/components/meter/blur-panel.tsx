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
    <BlurView intensity={36} tint="dark" style={[styles.panel, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, overflow: 'hidden' },
});
