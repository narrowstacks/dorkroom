import { Pressable, Text } from 'react-native';
import { useCommitStyle } from '@/theme/use-phase-accent';

interface CommitButtonProps {
  label: string;
  onPress: () => void;
  /** Blocks the press, dims the button and tells VoiceOver. */
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Layout only, e.g. `flex-1`. */
  className?: string;
}

/**
 * The solid button that commits or creates (Start roll, Add shot, Save): the
 * surrounding phase's hue with dark ink, brand rose with white outside a phase.
 * The one place the commit fill is drawn, so it can't drift per screen.
 */
export function CommitButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
  className = '',
}: CommitButtonProps) {
  const commit = useCommitStyle();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled === undefined ? undefined : { disabled }}
      // Pressed feedback is a class: NativeWind ignores style callbacks.
      className={`items-center rounded-xl px-4 py-3 ${disabled ? 'opacity-40' : 'active:opacity-80'} ${className}`}
      style={commit.fill}
    >
      <Text className="text-base font-semibold" style={commit.label}>
        {label}
      </Text>
    </Pressable>
  );
}
