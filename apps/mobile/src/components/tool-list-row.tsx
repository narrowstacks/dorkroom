import { Pressable, Text } from 'react-native';

export function ToolListRow({
  label,
  onPress,
  accessory,
}: {
  label: string;
  onPress: () => void;
  accessory?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <Text className="text-base text-white">{label}</Text>
      {accessory ? <Text className="text-white/40">{accessory}</Text> : null}
    </Pressable>
  );
}
