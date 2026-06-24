import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { useCameras, useRolls } from '@/hooks/use-film-log';
import { shareRollsAsJson } from '@/lib/film-log-export';
import { formatProcess } from '@/lib/film-log-options';
import type { FilmRoll } from '@/types/film-log';

const STATUS_LABEL: Record<FilmRoll['status'], string> = {
  active: 'Active',
  finished: 'Finished',
  developed: 'Developed',
};

// Static — hoisted so it isn't rebuilt on every render.
const EMPTY_STATE = (
  <View className="items-center gap-2 px-6 py-16">
    <Text className="text-center text-base text-white/60">
      No rolls yet. Start one to log your shots.
    </Text>
  </View>
);

export function FilmListScreen() {
  const rolls = useRolls();
  const cameras = useCameras();

  const cameraName = useMemo(() => {
    const map = new Map(cameras.map((camera) => [camera.id, camera.name]));
    return (id: string) => map.get(id) ?? 'Unknown camera';
  }, [cameras]);

  const onExport = useCallback(() => {
    if (rolls.length === 0) {
      Alert.alert('Nothing to export', 'Add a roll first.');
      return;
    }
    void shareRollsAsJson();
  }, [rolls.length]);

  const renderRoll = useCallback(
    ({ item }: { item: FilmRoll }) => {
      const film = item.filmStockName ?? 'No film set';
      const subtitle = `${cameraName(item.cameraId)} · ${film} · ${formatProcess(item.process)}`;
      return (
        <Pressable
          onPress={() => router.push(`/film-log/roll/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open roll ${item.name ?? film}`}
        >
          <GlassCard className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base font-semibold text-white"
                numberOfLines={1}
              >
                {item.name?.trim() ? item.name : film}
              </Text>
              <Text className="text-xs uppercase tracking-wide text-rose-400">
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            <Text className="text-sm text-white/60" numberOfLines={1}>
              {subtitle}
            </Text>
            <Text className="text-sm text-white/40">
              {item.shots.length} {item.shots.length === 1 ? 'shot' : 'shots'}
            </Text>
          </GlassCard>
        </Pressable>
      );
    },
    [cameraName]
  );

  const header = (
    <View className="gap-3 pb-2">
      <Pressable
        onPress={() => router.push('/film-log/roll-form')}
        accessibilityRole="button"
        className="items-center rounded-xl bg-rose-600 px-4 py-3"
      >
        <Text className="text-base font-semibold text-white">+ New roll</Text>
      </Pressable>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.push('/film-log/gear')}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-white">Cameras & lenses</Text>
        </Pressable>
        <Pressable
          onPress={onExport}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-white">Export JSON</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={rolls}
        keyExtractor={(roll) => roll.id}
        ListHeaderComponent={header}
        ListEmptyComponent={EMPTY_STATE}
        renderItem={renderRoll}
      />
    </View>
  );
}
