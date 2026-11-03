import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Text } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ToggleRow } from '@/components/toggle-row';
import { ToolListRow } from '@/components/tool-list-row';
import { useMeasurementUnit } from '@/hooks/use-measurement-unit';
import { useSaveMeterPhotosToLibrary } from '@/lib/photo-settings';

const REPO_URL = 'https://github.com/narrowstacks/dorkroom';
const PRIVACY_URL = 'https://dorkroom.art/privacy';
// Questions go to GitHub Discussions, the channel CONTRIBUTING.md names.
const SUPPORT_URL = `${REPO_URL}/discussions`;
// The repo's AGPLv3 license text. Dependencies carry their own licenses.
const LICENSES_URL = `${REPO_URL}/blob/main/LICENSE`;

export function SettingsScreen() {
  const version = Constants.expoConfig?.version;
  const [savePhotos, setSavePhotos] = useSaveMeterPhotosToLibrary();
  const [unit, setUnit] = useMeasurementUnit();

  return (
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
        <Text className="text-xs text-white/50">
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

      <GlassCard>
        <ToolListRow
          label="Edit Tabs"
          accessoryText="›"
          onPress={() => router.push('/more/edit')}
        />
      </GlassCard>

      <GlassCard>
        <ToolListRow
          label="Privacy Policy"
          accessoryText="›"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <ToolListRow
          label="Support"
          accessoryText="›"
          onPress={() => Linking.openURL(SUPPORT_URL)}
        />
        <ToolListRow
          label="Open-source licenses"
          accessoryText="›"
          onPress={() => Linking.openURL(LICENSES_URL)}
        />
      </GlassCard>

      <GlassCard>
        <ToolListRow
          label="GitHub"
          accessoryText="›"
          onPress={() => Linking.openURL(REPO_URL)}
        />
        <ToolListRow
          label="Newsletter"
          accessoryText="›"
          onPress={() => Linking.openURL('https://news.dorkroom.art')}
        />
      </GlassCard>

      {version ? (
        <Text className="text-center text-xs text-white/40">
          Dorkroom v{version}
        </Text>
      ) : null}
    </Screen>
  );
}
