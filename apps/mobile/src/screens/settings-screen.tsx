import Constants from 'expo-constants';
import { Linking, View } from 'react-native';
import { LabeledGroup } from '@/components/labeled-group';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { Screen } from '@/components/screen';
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
    // Settings belongs to no phase: it sits in the Search tab's stack and keeps
    // the neutral backdrop glow.
    <PhaseProvider value={null}>
      <Screen>
        <LabeledGroup
          title="Units"
          footer="Applies to Border and Resize. Mat stays in inches for now."
        >
          <View key="unit" className="p-3">
            <SegmentedControl
              options={[
                { label: 'Imperial (in)', value: 'imperial' },
                { label: 'Metric (cm)', value: 'metric' },
              ]}
              value={unit}
              onChange={setUnit}
              accessibilityHint="Units for lengths in Border and Resize"
            />
          </View>
        </LabeledGroup>

        <LabeledGroup
          title="Camera and timer"
          footer="Timer sounds are off in silent mode by default, so the silent switch mutes the beeps. Alerts while Dorkroom is in the background always follow the switch."
        >
          <ToggleRow
            key="photos"
            grouped
            label="Also save meter photos to Photos"
            value={savePhotos}
            onChange={setSavePhotos}
          />
          <ToggleRow
            key="cues"
            grouped
            label="Timer sounds in silent mode"
            value={cuesInSilent}
            onChange={setCuesInSilent}
          />
        </LabeledGroup>

        <LabeledGroup
          title="Safelight"
          footer="Turns the app deep red on black and hides the status bar. The keyboard, photo picker, system alerts and sheets stay bright, and camera and photo previews show as bright red images. Not tested as safe for photographic paper. Red light is not safe for film or colour paper."
        >
          <ToggleRow
            key="safelight"
            grouped
            label="Safelight mode"
            value={safelight.on}
            onChange={safelight.setOn}
          />
        </LabeledGroup>

        <LabeledGroup
          title="About"
          footer={version ? `Dorkroom v${version}` : undefined}
        >
          <ToolListRow
            key="github"
            label="GitHub"
            accessoryText="›"
            external
            onPress={() =>
              Linking.openURL('https://github.com/narrowstacks/dorkroom')
            }
          />
          <ToolListRow
            key="newsletter"
            label="Newsletter"
            accessoryText="›"
            external
            onPress={() => Linking.openURL('https://news.dorkroom.art')}
          />
        </LabeledGroup>
      </Screen>
    </PhaseProvider>
  );
}
