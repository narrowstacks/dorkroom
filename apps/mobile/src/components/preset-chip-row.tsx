import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { AccentColor } from '@/theme/accents';
import { useSelectionTint } from '@/theme/use-phase-accent';

interface PresetChipRowProps<T extends string | number> {
  options: { label: string; value: T }[];
  value?: T;
  onSelect: (value: T) => void;
  /** Hue for the selected chip. Omit to take the surrounding phase's (neutral on Home and Settings). */
  accent?: AccentColor;
}

export function PresetChipRow<T extends string | number>({
  options,
  value,
  onSelect,
  accent,
}: PresetChipRowProps<T>) {
  const tint = useSelectionTint(accent);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {options.map((option) => {
          // Numeric presets match within a tolerance; anything else exactly.
          const selected =
            Number.isFinite(option.value) && Number.isFinite(value)
              ? Math.abs(Number(option.value) - Number(value)) < 0.01
              : option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(option.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`min-h-11 items-center justify-center rounded-full px-4 py-2 ${
                selected ? '' : 'border-hw border-line bg-surface'
              }`}
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
                className={selected ? undefined : 'text-ink-70'}
                style={
                  selected
                    ? { color: tint.color, fontWeight: '600' }
                    : undefined
                }
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
