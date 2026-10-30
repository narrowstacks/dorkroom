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
        <Text className="text-center text-xs text-white/40">
          Dorkroom v{version}
        </Text>
      ) : null}
    </Screen>
  );
}
