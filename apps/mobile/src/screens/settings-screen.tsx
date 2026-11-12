import Constants from 'expo-constants';
import { Linking, Text } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ToggleRow } from '@/components/toggle-row';
import { ToolListRow } from '@/components/tool-list-row';
import { useMeasurementUnit } from '@/hooks/use-measurement-unit';
import { useSaveMeterPhotosToLibrary } from '@/lib/photo-settings';
import { useCuesInSilentMode } from '@/lib/timer/timer-settings';
import { PhaseProvider } from '@/theme/phase-context';

export function SettingsScreen() {
  const version = Constants.expoConfig?.version;
  const [savePhotos, setSavePhotos] = useSaveMeterPhotosToLibrary();
  const [unit, setUnit] = useMeasurementUnit();
  const [cuesInSilent, setCuesInSilent] = useCuesInSilentMode();
  const safelight = useSafelight();

  return (
    // Settings belongs to no phase: it sits in each phase's stack but keeps the
    // neutral backdrop glow.
    <PhaseProvider value={null}>
      <Screen>
        <GlassCard className="gap-2">
          <SectionLabel>Units</SectionLabel>
          <SegmentedControl
            options={[
              { label: 'Imperial (in)', value: 'imperial' },
              { label: 'Metric (cm)', value: 'metric' },
            ]}
            value={unit}
            onChange={setUnit}
            accessibilityHint="Units for lengths in Border and Resize"
          />
          <Text className="text-xs text-ink-50">
            Applies to Border and Resize. Mat stays in inches for now.
          </Text>
        </GlassCard>

        <GlassCard>
          <ToggleRow
            label="Also save meter photos to Photos"
            value={savePhotos}
            onChange={setSavePhotos}
          />
        </GlassCard>

        <GlassCard className="gap-2">
          <ToggleRow
            label="Timer sounds in silent mode"
            value={cuesInSilent}
            onChange={setCuesInSilent}
          />
          <Text className="text-xs text-ink-50">
            Off by default, so the silent switch mutes the timer beeps. Alerts
            while Dorkroom is in the background always follow the switch.
          </Text>
        </GlassCard>

        <GlassCard className="gap-2">
          <ToggleRow
            label="Safelight mode"
            value={safelight.on}
            onChange={safelight.setOn}
          />
          <Text className="text-xs text-ink-50">
            Turns the app deep red on black for working under a safelight and
            hides the status bar. The keyboard, photo picker and system alerts
            and sheets stay bright. Camera and photo previews show as bright red
            images. Not tested as safe for photographic paper. Red light is not
            safe for film or colour paper.
          </Text>
        </GlassCard>

        <GlassCard>
          <ToolListRow
            label="GitHub"
            accessoryText="›"
            onPress={() =>
              Linking.openURL('https://github.com/narrowstacks/dorkroom')
            }
          />
          <ToolListRow
            label="Newsletter"
            accessoryText="›"
            onPress={() => Linking.openURL('https://news.dorkroom.art')}
          />
        </GlassCard>

        {version ? (
          <Text className="text-center text-xs text-ink-40">
            Dorkroom v{version}
          </Text>
        ) : null}
      </Screen>
    </PhaseProvider>
  );
}
