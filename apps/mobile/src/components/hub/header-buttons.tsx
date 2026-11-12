import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { toHref } from '@/lib/href';
import { settingsRoute } from '@/lib/tools';
import { usePhase } from '@/theme/phase-context';

// Module scope, so the header options reference a stable function.

/** The gear on each hub; opens that phase's Settings. The header sits
 * under the stack's `PhaseProvider`, so the phase comes from context. */
export function SettingsButton() {
  const phase = usePhase() ?? 'shoot';
  return (
    <Pressable
      hitSlop={12}
      onPress={() => router.push(toHref(settingsRoute(phase)))}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={{ paddingHorizontal: 6 }}
    >
      <Settings size={22} color="#ffffff" />
    </Pressable>
  );
}
