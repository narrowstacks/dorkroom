import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View } from 'react-native';

function glassAvailable(): boolean {
  try {
    // isGlassEffectAPIAvailable exists on SDK 55+; fall back to SDK 54 check.
    const apiCheck =
      typeof isGlassEffectAPIAvailable === 'function'
        ? isGlassEffectAPIAvailable()
        : true;
    return apiCheck && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

// Stable for the app's lifetime — compute once at import rather than per render.
const USE_GLASS = glassAvailable();

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

/** A Liquid Glass card on iOS 26; a translucent NativeWind card elsewhere. */
export function GlassCard({ children, className }: GlassCardProps) {
  if (USE_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <View className={`p-5 ${className ?? ''}`}>{children}</View>
      </GlassView>
    );
  }
  return (
    <View className={`rounded-2xl bg-white/10 p-5 ${className ?? ''}`}>
      {children}
    </View>
  );
}
