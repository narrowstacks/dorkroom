import { Pressable, Text } from 'react-native';

export interface InverterButtonProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}

/** A full-width button of the inverter screen, rose when primary. */
export function InverterButton({
  label,
  onPress,
  primary = false,
  disabled = false,
  className = '',
}: InverterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`flex-1 items-center rounded-xl py-3 ${
        primary ? (disabled ? 'bg-rose-600/40' : 'bg-rose-600') : 'bg-white/10'
      } ${className}`}
    >
      <Text
        className={`font-semibold ${disabled ? 'text-white/40' : 'text-white'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
