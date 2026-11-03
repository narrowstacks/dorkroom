import { Text, View } from 'react-native';

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    // Wraps rather than overlaps when large text leaves no room for both on one line.
    <View className="flex-row flex-wrap items-center justify-between gap-x-3 py-1.5">
      <Text className="shrink text-white/60">{label}</Text>
      <Text className="shrink text-right text-base font-semibold text-white">
        {value}
      </Text>
    </View>
  );
}
