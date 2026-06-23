import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Text } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';
import { ToolListRow } from '@/components/tool-list-row';

export function SettingsScreen() {
  const version = Constants.expoConfig?.version;

  return (
    <Screen>
      <GlassCard>
        <ToolListRow
          label="Edit Tabs"
          accessory="›"
          onPress={() => router.push('/more/edit' as never)}
        />
      </GlassCard>

      <GlassCard>
        <ToolListRow
          label="GitHub"
          accessory="›"
          onPress={() =>
            Linking.openURL('https://github.com/narrowstacks/dorkroom')
          }
        />
        <ToolListRow
          label="Newsletter"
          accessory="›"
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
