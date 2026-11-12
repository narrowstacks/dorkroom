import { Pressable, Text } from 'react-native';

interface NeutralButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
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
  className = '',
}: NeutralButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`items-center rounded-xl bg-white/10 px-4 py-3 active:opacity-70 ${className}`}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
