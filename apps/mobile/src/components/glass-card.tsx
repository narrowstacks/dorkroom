import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

function glassAvailable(): boolean {
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

// Stable for the app's lifetime — compute once at import rather than per render.
const USE_GLASS = glassAvailable();

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /**
   * Style applied to the OUTER card element. Needed for things `className`
   * can't reach on the glass element — flex sizing (so a card can stretch to
   * fill a row) or an accent border.
   */
  style?: StyleProp<ViewStyle>;
  /** Tighter padding, for a control panel that shares the screen with a
   *  photo rather than a card in a scrolling stack. */
  compact?: boolean;
}

/** A Liquid Glass card on iOS 26; a translucent NativeWind card elsewhere. */
export function GlassCard({
  children,
  className,
  style,
  compact = false,
}: GlassCardProps) {
  const padding = compact ? 'p-3' : 'p-5';
  if (USE_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={[{ borderRadius: 20, overflow: 'hidden' }, style]}
      >
        <View className={`${padding} ${className ?? ''}`}>{children}</View>
      </GlassView>
    );
  }
  return (
    <View
      style={style}
      className={`rounded-2xl border border-white/10 bg-white/10 ${padding} ${className ?? ''}`}
    >
      {children}
    </View>
  );
}
