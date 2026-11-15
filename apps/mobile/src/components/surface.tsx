import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { SURFACE_CLASS } from './surface-style';

interface SurfaceProps {
  children: ReactNode;
  className?: string;
  /** Style on the surface itself, for what `className` can't carry (flex
   *  sizing, an accent border). */
  style?: StyleProp<ViewStyle>;
  /** Tighter padding. */
  compact?: boolean;
  /** No padding: the content lays itself out. */
  flush?: boolean;
}

/**
 * The flat content surface: a readout, a summary, a warning, a group. Same
 * props as `GlassCard`, so converting a content card is a rename.
 *
 * Glass (`GlassCard`) is only for chrome and for controls that float over a
 * photo, a camera feed, a map or a drawing. Everything in the content layer
 * sits on this.
 */
export function Surface({
  children,
  className,
  style,
  compact = false,
  flush = false,
}: SurfaceProps) {
  const padding = flush ? '' : compact ? 'p-3' : 'p-5';
  return (
    <View
      style={style}
      className={`${SURFACE_CLASS} ${padding} ${className ?? ''}`}
    >
      {children}
    </View>
  );
}
