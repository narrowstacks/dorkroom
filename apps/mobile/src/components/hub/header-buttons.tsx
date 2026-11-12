import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { offersSafelightButton } from '@/components/safelight/offer';
import { SafelightButton } from '@/components/safelight/safelight-button';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { toHref } from '@/lib/href';
import { settingsRoute } from '@/lib/tools';
import { usePhase } from '@/theme/phase-context';
import { SAFELIGHT } from '@/theme/safelight';

/** The gear on each hub; opens that phase's Settings. The header sits
 * under the stack's `PhaseProvider`, so the phase comes from context. */
function SettingsButton() {
  const phase = usePhase() ?? 'shoot';
  const { on } = useSafelight();
  return (
    <Pressable
      hitSlop={12}
      onPress={() => router.push(toHref(settingsRoute(phase)))}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      style={{ paddingHorizontal: 6 }}
    >
      <Settings size={22} color={on ? SAFELIGHT.text : '#ffffff'} />
    </Pressable>
  );
}

/** The hub's right side: the safelight switch (when offered) beside the gear. */
export function HubHeaderRight() {
  const phase = usePhase();
  const { on } = useSafelight();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {offersSafelightButton(phase, on) ? <SafelightButton /> : null}
      <SettingsButton />
    </View>
  );
}
