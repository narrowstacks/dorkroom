import { Pressable, Text, View } from 'react-native';

interface NavRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

/** Summary row that opens a settings sheet. */
export function NavRow({ label, value, onPress }: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
    >
      <View className="gap-0.5">
        <Text className="text-xs text-white/50">{label}</Text>
        <Text className="text-base font-semibold text-white">{value}</Text>
      </View>
      <Text className="text-lg text-white/40">›</Text>
    </Pressable>
  );
}
