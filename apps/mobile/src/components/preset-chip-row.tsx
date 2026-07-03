import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { type AccentColor, selectionTint } from '@/theme/accents';

interface PresetChipRowProps<T extends string | number> {
  options: { label: string; value: T }[];
  value?: T;
  onSelect: (value: T) => void;
  /** Tool signature accent for the selected chip. Omit for the brand rose fill. */
  accent?: AccentColor;
}

export function PresetChipRow<T extends string | number>({
  options,
  value,
  onSelect,
  accent,
}: PresetChipRowProps<T>) {
  const tint = accent ? selectionTint(accent) : null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {options.map((option) => {
          const selected =
            typeof option.value === 'number' && typeof value === 'number'
              ? Math.abs(option.value - value) < 0.01
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
              className={`rounded-full px-4 py-2 ${
                selected && !tint
                  ? 'bg-rose-600'
                  : !selected
                    ? 'bg-white/10'
                    : ''
              }`}
              style={
                selected && tint
                  ? {
                      backgroundColor: tint.backgroundColor,
                      borderWidth: 1,
                      borderColor: tint.borderColor,
                    }
                  : undefined
              }
            >
              <Text
                className={
                  selected ? (tint ? undefined : 'text-white') : 'text-white/70'
                }
                style={
                  selected && tint
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
