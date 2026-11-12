import { Pressable, ScrollView, Text, View } from 'react-native';
import type { AccentColor } from '@/theme/accents';
import { useSelectionTint } from '@/theme/use-phase-accent';

interface OptionRowProps<T extends string | number> {
  label?: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  /** Hue for selected chips. Omit to take the surrounding phase's (neutral on Home and Settings). */
  accent?: AccentColor;
}

export function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  accent,
}: OptionRowProps<T>) {
  const tint = useSelectionTint(accent);
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm text-ink-60">{label}</Text> : null}
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
                className={`rounded-full px-4 py-2 ${selected ? '' : 'border-hw border-line bg-surface'}`}
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
    </View>
  );
}
