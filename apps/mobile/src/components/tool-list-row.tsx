import { Pressable, Text } from 'react-native';

/** A settings row: a label with an optional trailing value or chevron text. */
export function ToolListRow({
  label,
  onPress,
  accessoryText,
}: {
  label: string;
  onPress: () => void;
  /** Trailing value text; also read out after the label. */
  accessoryText?: string;
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
      <Text className="text-base text-white">{label}</Text>
      {accessoryText === undefined ? null : (
        <Text className="text-white/40">{accessoryText}</Text>
      )}
    </Pressable>
  );
}
