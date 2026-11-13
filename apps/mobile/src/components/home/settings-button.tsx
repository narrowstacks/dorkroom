import { Settings } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { useSelectedInk } from '@/theme/use-phase-accent';

/**
 * The gear at the end of Home's search row. Home has no native header, so this
 * is how Settings is reached. A 44pt target, white (red under safelight mode).
 */
export function HomeSettingsButton({ onPress }: { onPress: () => void }) {
  const color = useSelectedInk('#ffffff');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      className="items-center justify-center active:opacity-60"
      style={{ width: 44, height: 44 }}
    >
      <Settings size={22} color={color} />
    </Pressable>
  );
}
