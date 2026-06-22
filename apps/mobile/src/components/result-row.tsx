import { Text, View } from 'react-native';

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-white/60">{label}</Text>
      <Text className="text-base font-semibold text-white">{value}</Text>
    </View>
  );
}
