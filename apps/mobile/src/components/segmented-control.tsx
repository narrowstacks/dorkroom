import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import type { AccentColor } from '@/theme/accents';
import { useSelectionTint } from '@/theme/use-phase-accent';

interface SegmentedControlProps<T extends string | number | boolean> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** Hue for the selected segment. Omit to take the surrounding phase's (neutral on Home and Settings). */
  accent?: AccentColor;
  /** What the choice is about, read by VoiceOver after each segment's label. */
  accessibilityHint?: string;
  /** What the control chooses, e.g. "When selecting a preset, adjust".
   * Prefixed to each segment's spoken label so VoiceOver gives the context
   * with every segment, not only on a separate label element. */
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  accent,
  accessibilityHint,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const tint = useSelectionTint(accent);
  return (
    <View className="flex-row rounded-xl bg-white/10 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              if (option.value !== value) {
                Haptics.selectionAsync();
                onChange(option.value);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              accessibilityLabel
                ? `${accessibilityLabel}: ${option.label}`
                : undefined
            }
            accessibilityState={{ selected }}
            accessibilityHint={accessibilityHint}
            className="flex-1 items-center rounded-lg py-2"
            style={
              selected
                ? {
                    backgroundColor: tint.backgroundColor,
                    borderWidth: 1,
                    borderColor: tint.borderColor,
                  }
                : undefined
            }
          >
            <Text
              className={selected ? undefined : 'text-white/70'}
              style={
                selected ? { color: tint.color, fontWeight: '600' } : undefined
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
