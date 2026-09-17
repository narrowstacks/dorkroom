import { ArrowLeftRight } from 'lucide-react-native';
import { Pressable } from 'react-native';

interface FlipButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
}

export function FlipButton({ accessibilityLabel, onPress }: FlipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="min-h-12 min-w-12 items-center justify-center rounded-xl bg-white/10"
    >
      <ArrowLeftRight size={20} color="#ffffff" />
    </Pressable>
  );
}
