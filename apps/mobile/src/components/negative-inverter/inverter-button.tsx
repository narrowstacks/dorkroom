import { Pressable, Text } from 'react-native';
import { useCommitStyle } from '@/theme/use-phase-accent';

export interface InverterButtonProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}

/** A full-width button of the inverter screen, in the phase hue when primary. */
export function InverterButton({
  label,
  onPress,
  primary = false,
  disabled = false,
  className = '',
}: InverterButtonProps) {
  const commit = useCommitStyle();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`flex-1 items-center rounded-xl py-3 ${
        primary
          ? disabled
            ? 'opacity-40'
            : ''
          : 'border-hw border-line bg-surface'
      } ${className}`}
      style={primary ? commit.fill : undefined}
    >
      <Text
        className={`font-semibold ${primary ? '' : disabled ? 'text-ink-40' : 'text-white'}`}
        style={primary ? commit.label : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}
