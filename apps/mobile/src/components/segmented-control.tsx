import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import { type AccentColor, selectionTint } from '@/theme/accents';

interface SegmentedControlProps<T extends string | number | boolean> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** Tool signature accent for the selected segment. Omit for the brand rose fill. */
  accent?: AccentColor;
}

export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  accent,
}: SegmentedControlProps<T>) {
  const tint = accent ? selectionTint(accent) : null;
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
            accessibilityState={{ selected }}
            className={`flex-1 items-center rounded-lg py-2 ${
              selected && !tint ? 'bg-rose-600' : ''
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
                selected
                  ? tint
                    ? undefined
                    : 'font-semibold text-white'
                  : 'text-white/70'
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
  );
}
