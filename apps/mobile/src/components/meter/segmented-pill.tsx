import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text } from 'react-native';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
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
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.option,
              vertical && styles.optionVertical,
              active && styles.optionActive,
            ]}
          >
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
    minWidth: 108,
    minHeight: 38,
    paddingHorizontal: 16,
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
