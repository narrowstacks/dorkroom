import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { readoutText as MONO } from '@/theme/tokens';

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
  /** Render an icon in place of the text label; gets the resolved fg color so
   * it matches the active/inactive state. `label` is still used for a11y. */
  renderIcon?: (props: { color: string; size: number }) => ReactNode;
}

/** A compact option toggle drawn over the camera feed; horizontal or vertical. */
export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  orientation = 'horizontal',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const vertical = orientation === 'vertical';
  return (
    <BlurView
      accessibilityLabel={accessibilityLabel}
      intensity={34}
      tint="dark"
      style={[styles.container, vertical && styles.containerVertical]}
    >
      {options.map((option) => {
        const active = option.value === value;
        const fg = active ? '#0b0b0c' : 'rgba(255,255,255,0.62)';
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            style={[
              styles.option,
              vertical && styles.optionVertical,
              active && styles.optionActive,
            ]}
          >
            {option.renderIcon ? (
              option.renderIcon({ color: fg, size: 22 })
            ) : (
              <Text
                style={[
                  MONO,
                  active ? styles.activeText : SHADOW,
                  styles.optionText,
                  active ? styles.optionTextActive : styles.optionTextInactive,
                ]}
              >
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 2,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(18,18,18,0.26)',
    overflow: 'hidden',
    boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
  },
  containerVertical: {
    flexDirection: 'column',
    borderRadius: 18,
    borderCurve: 'continuous',
  },
  option: {
    // Snug around the metering icons (text labels, when used, still wrap fine).
    minWidth: 54,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionVertical: {
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  optionActive: {
    backgroundColor: '#facc15',
  },
  optionText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  optionTextActive: {
    color: '#0b0b0c',
    fontWeight: '700',
  },
  optionTextInactive: {
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '500',
  },
  activeText: {
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
});
