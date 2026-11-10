import { Lightbulb } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { SAFELIGHT } from '@/theme/safelight';
import { useSafelight } from './safelight-provider';

/**
 * The header toggle for safelight mode. A switch (`accessibilityRole="switch"`)
 * with a visible on-state: the bulb fills and takes a ring. Offered in the Print
 * stack always, and in every stack while the mode is on, so it can always be
 * turned off where you are.
 */
export function SafelightButton() {
  const { on, toggle } = useSafelight();
  return (
    <Pressable
      hitSlop={12}
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityLabel="Safelight mode"
      accessibilityState={{ checked: on }}
      style={{
        paddingHorizontal: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: on ? SAFELIGHT.outlineSelected : 'transparent',
        padding: 3,
      }}
    >
      <Lightbulb
        size={22}
        color={on ? SAFELIGHT.text : '#ffffff'}
        fill={on ? SAFELIGHT.outline : 'none'}
      />
    </Pressable>
  );
}
