import { Pressable, Text } from 'react-native';
import { toolListRowLabel } from '@/lib/tool-list-row-label';

/** A settings row: a label with an optional trailing value or chevron text. */
export function ToolListRow({
  label,
  onPress,
  accessoryText,
  external,
}: {
  label: string;
  onPress: () => void;
  /** Trailing value text; also read out after the label. */
  accessoryText?: string;
  /** The row opens a web page: a link, labelled "<label>, opens in the
   * browser", and its chevron is decoration VoiceOver skips. */
  external?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={toolListRowLabel(label, accessoryText, external)}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <Text className="text-base text-white">{label}</Text>
      {accessoryText === undefined ? null : (
        <Text className="text-ink-40">{accessoryText}</Text>
      )}
    </Pressable>
  );
}
