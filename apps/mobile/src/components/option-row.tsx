import { Pressable, ScrollView, Text, View } from 'react-native';

interface OptionRowProps<T extends string | number> {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: OptionRowProps<T>) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-white/60">{label}</Text>
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
                  selected ? 'bg-rose-600' : 'bg-white/10'
                }`}
              >
                <Text className={selected ? 'text-white' : 'text-white/70'}>
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
