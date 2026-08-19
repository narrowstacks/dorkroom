import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export function ToolListRow({
  label,
  onPress,
  accessory,
  accessoryText,
  leading,
}: {
  label: string;
  onPress: () => void;
  /** Trailing element, e.g. a chevron. Ignored when `accessoryText` is set. */
  accessory?: ReactNode;
  /** Trailing value text; also read out after the label. */
  accessoryText?: string;
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        accessoryText === undefined ? label : `${label}: ${accessoryText}`
      }
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <View className="flex-row items-center gap-3">
        {leading}
        <Text className="text-base text-white">{label}</Text>
      </View>
      {accessoryText === undefined ? (
        accessory
      ) : (
        <Text className="text-white/40">{accessoryText}</Text>
      )}
    </Pressable>
  );
}
