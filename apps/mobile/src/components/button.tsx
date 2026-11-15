import { Pressable, Text } from 'react-native';
import {
  useCommitStyle,
  usePhaseHue,
  useSelectionTint,
} from '@/theme/use-phase-accent';
import {
  buttonClassName,
  buttonLabelClassName,
  type ButtonVariant,
} from './button-style';

export type { ButtonVariant } from './button-style';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** Commit, secondary (the default), plain, tinted or destructive; see
   * `button-style.ts`. */
  variant?: ButtonVariant;
  /** Blocks the press, dims the button and tells VoiceOver. */
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Layout only, e.g. `flex-1`. */
  className?: string;
}

/**
 * The one button. Every variant shares the height, radius, weight, pressed and
 * disabled states; only the fill and the ink differ. `CommitButton` and
 * `NeutralButton` are this with the variant fixed.
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  accessibilityLabel,
  accessibilityHint,
  className,
}: ButtonProps) {
  const commit = useCommitStyle();
  const hue = usePhaseHue();
  const tint = useSelectionTint();
  const labelStyle =
    variant === 'commit'
      ? commit.label
      : variant === 'plain'
        ? { color: hue }
        : variant === 'tinted'
          ? { color: tint.color }
          : undefined;
  const fillStyle =
    variant === 'commit'
      ? commit.fill
      : variant === 'tinted'
        ? {
            backgroundColor: tint.backgroundColor,
            borderColor: tint.borderColor,
            borderWidth: 1,
          }
        : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled === undefined ? undefined : { disabled }}
      className={buttonClassName(variant, disabled === true, className)}
      style={fillStyle}
    >
      <Text className={buttonLabelClassName(variant)} style={labelStyle}>
        {label}
      </Text>
    </Pressable>
  );
}
