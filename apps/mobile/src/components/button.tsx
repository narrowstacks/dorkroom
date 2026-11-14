import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  useCommitStyle,
  usePhaseHue,
  useSelectionTint,
} from '@/theme/use-phase-accent';
import {
  buttonAccessibilityState,
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
  /** A glyph before the label (a pencil, a plus), drawn by the caller. */
  icon?: ReactNode;
  /** For a button that opens or closes something below it: tells VoiceOver. */
  expanded?: boolean;
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
  icon,
  expanded,
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
      accessibilityState={buttonAccessibilityState(disabled, expanded)}
      className={buttonClassName(variant, disabled === true, className)}
      style={fillStyle}
    >
      {icon ? (
        <View className="shrink flex-row items-center justify-center gap-2">
          {icon}
          <Text
            className={buttonLabelClassName(variant, true)}
            style={labelStyle}
          >
            {label}
          </Text>
        </View>
      ) : (
        <Text className={buttonLabelClassName(variant)} style={labelStyle}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
