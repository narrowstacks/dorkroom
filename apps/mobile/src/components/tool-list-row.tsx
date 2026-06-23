import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export function ToolListRow({
  label,
  onPress,
  accessory,
  leading,
}: {
  label: string;
  onPress: () => void;
  accessory?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <View className="flex-row items-center gap-3">
        {leading}
        <Text className="text-base text-white">{label}</Text>
      </View>
      {typeof accessory === 'string' ? (
        <Text className="text-white/40">{accessory}</Text>
      ) : (
        accessory
      )}
    </Pressable>
  );
}
