import { Pressable, Text } from 'react-native';

interface NeutralButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Layout only, e.g. `flex-1`. */
  className?: string;
}

/**
 * A solid-looking button that is not a commit: retry, a permission request, a
 * link to another screen. Neutral glass with white text, because the solid
 * accent fill is reserved for `CommitButton`.
 */
export function NeutralButton({
  label,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  className = '',
}: NeutralButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className={`items-center rounded-xl border-hw border-line bg-surface px-4 py-3 active:opacity-70 ${className}`}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
