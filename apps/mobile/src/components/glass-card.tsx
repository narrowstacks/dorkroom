import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SAFELIGHT } from '@/theme/safelight';

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
  /** No padding at all: the card is a frame, and its content lays itself out
   *  (the stage screens' control panel). */
  flush?: boolean;
}

/**
 * A Liquid Glass card on iOS 26; a translucent NativeWind card elsewhere. Glass
 * is for chrome and for controls floating over media (a photo, the camera, a
 * map, a drawing). Content cards use the flat `Surface` instead.
 */
export function GlassCard({
  children,
  className,
  style,
  compact = false,
  flush = false,
}: GlassCardProps) {
  const padding = flush ? '' : compact ? 'p-3' : 'p-5';
  const { on: safelight } = useSafelight();
  if (USE_GLASS) {
    // One wrapper type in both modes, so the card's children stay mounted when
    // the mode flips. Under safelight the glass is switched off (`none`) and a
    // hairline outline takes its place.
    return (
      <GlassView
        glassEffectStyle={safelight ? 'none' : 'regular'}
        style={[
          { borderRadius: 20, overflow: 'hidden' },
          safelight ? { borderWidth: 1, borderColor: SAFELIGHT.outline } : null,
          style,
        ]}
      >
        <View className={`${padding} ${className ?? ''}`}>{children}</View>
      </GlassView>
    );
  }
  return (
    <View
      style={style}
      className={`rounded-2xl border border-edge bg-surface ${padding} ${className ?? ''}`}
    >
      {children}
    </View>
  );
}
