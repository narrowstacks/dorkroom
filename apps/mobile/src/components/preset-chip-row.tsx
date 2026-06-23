import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface PresetChipRowProps<T extends string | number> {
  options: { label: string; value: T }[];
  value?: T;
  onSelect: (value: T) => void;
}

export function PresetChipRow<T extends string | number>({
  options,
  value,
  onSelect,
}: PresetChipRowProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(option.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`rounded-full px-4 py-2 ${selected ? 'bg-rose-600' : 'bg-white/10'}`}
            >
              <Text className={selected ? 'text-white' : 'text-white/70'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
