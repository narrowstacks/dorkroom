import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { useCameras, useLenses, useRoll } from '@/hooks/use-film-log';
import { formatProcess } from '@/lib/film-log-options';
import { deleteRoll } from '@/lib/film-log-storage';
import type { Shot } from '@/types/film-log';

function exposureSummary(shot: Shot, rollIso: number | undefined): string {
  const parts: string[] = [];
  if (shot.aperture !== undefined) parts.push(formatAperture(shot.aperture));
  if (shot.shutterSpeed !== undefined)
    parts.push(formatShutterSpeed(shot.shutterSpeed));
  if (rollIso !== undefined) parts.push(`ISO ${rollIso}`);
  return parts.length > 0 ? parts.join(' · ') : 'No exposure set';
}

export function RollDetailScreen() {
  const { rollId } = useLocalSearchParams<{ rollId: string }>();
  const roll = useRoll(rollId);
  const cameras = useCameras();
  const lenses = useLenses();

  const lensName = useMemo(() => {
    const map = new Map(lenses.map((lens) => [lens.id, lens.name]));
    return (id: string | undefined) => (id ? map.get(id) : undefined);
  }, [lenses]);

  const onDelete = useCallback(() => {
    if (!roll) return;
    Alert.alert('Delete roll?', 'This removes the roll and all its shots.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRoll(roll.id);
          router.back();
        },
      },
    ]);
  }, [roll]);

  const renderShot = useCallback(
    ({ item }: { item: Shot }) => {
      const lens = lensName(item.lensId);
      const meta = [lens, item.back].filter(Boolean).join(' · ');
      return (
        <Pressable
          onPress={() =>
            router.push(`/film-log/shot?rollId=${roll?.id}&shotId=${item.id}`)
          }
          accessibilityRole="button"
          accessibilityLabel={`Edit frame ${item.frameNumber}`}
        >
          <GlassCard className="flex-row items-center gap-3">
            <Text className="w-10 text-lg font-semibold text-rose-400">
              #{item.frameNumber}
            </Text>
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-white">
                {exposureSummary(item, roll?.iso)}
              </Text>
              {meta ? (
                <Text className="text-sm text-white/50">{meta}</Text>
              ) : null}
              {item.notes ? (
                <Text className="text-sm text-white/40" numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
            {item.source === 'meter' ? (
              <Text className="text-xs uppercase text-white/40">meter</Text>
            ) : null}
          </GlassCard>
        </Pressable>
      );
    },
    [lensName, roll?.id, roll?.iso]
  );

  if (!roll) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b0b0c]">
        <Text className="text-white/60">Roll not found.</Text>
      </View>
    );
  }

  const cameraName =
    cameras.find((c) => c.id === roll.cameraId)?.name ?? 'Unknown camera';
  const title = roll.name?.trim() ? roll.name : (roll.filmStockName ?? 'Roll');

  const header = (
    <View className="gap-3 pb-2">
      <GlassCard className="gap-1">
        <Text className="text-sm text-white/60">{cameraName}</Text>
        <Text className="text-base text-white">
          {roll.filmStockName ?? 'No film set'} · {formatProcess(roll.process)}
          {roll.iso !== undefined ? ` · EI ${roll.iso}` : ''}
        </Text>
        {roll.back ? (
          <Text className="text-sm text-white/50">Back: {roll.back}</Text>
        ) : null}
        {roll.notes ? (
          <Text className="text-sm text-white/40">{roll.notes}</Text>
        ) : null}
      </GlassCard>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.push(`/film-log/roll-form?rollId=${roll.id}`)}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-white">Edit roll</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-rose-400">Delete</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => router.push(`/film-log/shot?rollId=${roll.id}`)}
        accessibilityRole="button"
        className="items-center rounded-xl bg-rose-600 px-4 py-3"
      >
        <Text className="text-base font-semibold text-white">+ Add shot</Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title }} />
      <GradientBackground />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        data={roll.shots}
        keyExtractor={(shot) => shot.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text className="px-2 py-6 text-center text-white/50">
            No shots logged yet.
          </Text>
        }
        renderItem={renderShot}
      />
    </View>
  );
}
