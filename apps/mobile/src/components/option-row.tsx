import { Pressable, ScrollView, Text, View } from 'react-native';
import { type AccentColor, selectionTint } from '@/theme/accents';

interface OptionRowProps<T extends string | number> {
  label?: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** Tool signature accent for selected chips. Omit for the brand rose fill. */
  accent?: AccentColor;
}

export function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  accent,
}: OptionRowProps<T>) {
  const tint = accent ? selectionTint(accent) : null;
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm text-white/60">{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => onChange(option.value)}
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
                    selected
                      ? tint
                        ? undefined
                        : 'text-white'
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
      </ScrollView>
    </View>
  );
}
