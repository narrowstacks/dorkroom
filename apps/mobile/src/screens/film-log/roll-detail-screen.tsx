import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { CommitButton } from '@/components/commit-button';
import {
  confirmMarkDeveloped,
  confirmMarkShot,
} from '@/components/film-log/confirm-roll-status';
import { developedDateText } from '@/components/film-log/developed-date';
import { PhotoViewer } from '@/components/film-log/photo-viewer';
import { RollDevelopmentSection } from '@/components/film-log/roll-development-section';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { NeutralButton } from '@/components/neutral-button';
import { TabBarScrollView } from '@/components/tab-bar-scroll-view';
import { useCameras, useLenses, useRoll } from '@/hooks/use-film-log';
import { formatProcess, rollStatusLabel } from '@/lib/film-log-options';
import { photoUri } from '@/lib/film-log-photos';
import { shareRollAsCsv } from '@/lib/film-log-share';
import { deleteRoll } from '@/lib/film-log-storage';
import { isUsableLocation } from '@/lib/frame-location-format';
import { markDevelopedCopy } from '@/lib/roll-lifecycle';
import type { Shot } from '@/schemas/film-log.schema';
import { usePhaseHue } from '@/theme/use-phase-accent';

function exposureSummary(shot: Shot, rollIso: number | undefined): string {
  const parts: string[] = [];
  if (shot.aperture !== undefined) parts.push(formatAperture(shot.aperture));
  if (shot.shutterSpeed !== undefined)
    parts.push(formatShutterSpeed(shot.shutterSpeed));
  if (rollIso !== undefined) parts.push(`ISO ${rollIso}`);
  return parts.length > 0 ? parts.join(' · ') : 'No exposure set';
}

export function RollDetailScreen() {
  const hue = usePhaseHue();
  const { rollId } = useLocalSearchParams<{ rollId: string }>();
  const roll = useRoll(rollId);
  const cameras = useCameras();
  const lenses = useLenses();
  const [viewerFile, setViewerFile] = useState<string | null>(null);

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
            router.push(
              `/shoot/film-log/shot?rollId=${roll?.id}&shotId=${item.id}`
            )
          }
          accessibilityRole="button"
          accessibilityLabel={`Edit frame ${item.frameNumber}${isUsableLocation(item.location) ? ', has location' : ''}`}
        >
          <GlassCard className="flex-row items-center gap-3">
            {item.photo ? (
              <Pressable
                onPress={() => setViewerFile(item.photo!.fileName)}
                accessibilityRole="imagebutton"
                accessibilityLabel="View photo"
              >
                <Image
                  source={{ uri: photoUri(item.photo.fileName) }}
                  style={{ width: 40, height: 54, borderRadius: 6 }}
                  contentFit="cover"
                />
              </Pressable>
            ) : (
              <Text
                className="w-10 text-lg font-semibold"
                style={{ color: hue }}
              >
                #{item.frameNumber}
              </Text>
            )}
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-white">
                {item.photo
                  ? `#${item.frameNumber} · ${exposureSummary(item, roll?.iso)}`
                  : exposureSummary(item, roll?.iso)}
              </Text>
              {meta ? (
                <Text className="text-sm text-ink-50">{meta}</Text>
              ) : null}
              {item.place ? (
                <Text className="text-sm text-ink-60" numberOfLines={1}>
                  {item.place}
                </Text>
              ) : null}
              {item.notes ? (
                <Text className="text-sm text-ink-60" numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
            {isUsableLocation(item.location) ? (
              <SymbolView name="location.fill" size={14} tintColor={hue} />
            ) : null}
            {item.source === 'meter' ? (
              <Text className="text-xs uppercase text-ink-40">meter</Text>
            ) : null}
          </GlassCard>
        </Pressable>
      );
    },
    [hue, lensName, roll?.id, roll?.iso, setViewerFile]
  );

  if (!roll) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b0b0c]">
        <Text className="text-ink-60">Roll not found.</Text>
      </View>
    );
  }

  const cameraName =
    cameras.find((c) => c.id === roll.cameraId)?.name ?? 'Unknown camera';
  const title = roll.name?.trim() ? roll.name : (roll.filmStockName ?? 'Roll');

  const header = (
    <View className="gap-3 pb-2">
      <GlassCard className="gap-1">
        <Text className="text-sm text-ink-60">{cameraName}</Text>
        <Text className="text-base text-white">
          {roll.filmStockName ?? 'No film set'} · {formatProcess(roll.process)}
          {roll.iso !== undefined ? ` · EI ${roll.iso}` : ''}
        </Text>
        <Text className="text-sm text-ink-60">
          {rollStatusLabel(roll.status)}
        </Text>
        {roll.back ? (
          <Text className="text-sm text-ink-50">Back: {roll.back}</Text>
        ) : null}
        {roll.notes ? (
          <Text className="text-sm text-ink-60">{roll.notes}</Text>
        ) : null}
      </GlassCard>
      {roll.status === 'developed' && roll.development ? (
        <RollDevelopmentSection development={roll.development} />
      ) : null}
      {roll.status === 'active' ? (
        <NeutralButton
          onPress={() => confirmMarkShot(roll)}
          label="Mark as shot"
          accessibilityLabel="Mark as shot. Moves the roll to To develop."
        />
      ) : null}
      {roll.status === 'finished' ? (
        <NeutralButton
          onPress={() => confirmMarkDeveloped(roll)}
          label="Mark as developed"
          accessibilityLabel={
            markDevelopedCopy(roll, developedDateText).accessibilityLabel
          }
        />
      ) : null}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() =>
            router.push(`/shoot/film-log/roll-form?rollId=${roll.id}`)
          }
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl border-hw border-line bg-surface px-4 py-3"
        >
          <Text className="text-base text-white">Edit roll</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl border-hw border-line bg-surface px-4 py-3"
        >
          <Text className="text-base text-rose-400">Delete</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={() => void shareRollAsCsv(roll.id)}
        disabled={roll.shots.length === 0}
        accessibilityRole="button"
        accessibilityState={{ disabled: roll.shots.length === 0 }}
        accessibilityHint={
          roll.shots.length === 0
            ? 'Log a shot first. There is nothing to export yet.'
            : 'Opens the share sheet with a CSV file of this roll'
        }
        className="items-center rounded-xl border-hw border-line bg-surface px-4 py-3"
      >
        <Text
          className={`text-base text-white ${
            roll.shots.length === 0 ? 'opacity-40' : ''
          }`}
        >
          Export CSV
        </Text>
        {roll.shots.length === 0 ? (
          <Text className="text-xs text-ink-60">Log a shot to export.</Text>
        ) : null}
      </Pressable>
      <CommitButton
        onPress={() => router.push(`/shoot/film-log/shot?rollId=${roll.id}`)}
        label="+ Add shot"
      />
    </View>
  );

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title }} />
      <GradientBackground />
      <TabBarScrollView>
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={roll.shots}
          keyExtractor={(shot) => shot.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text className="px-2 py-6 text-center text-ink-50">
              No shots logged yet.
            </Text>
          }
          renderItem={renderShot}
        />
      </TabBarScrollView>
      <PhotoViewer
        visible={!!viewerFile}
        fileName={viewerFile}
        onClose={() => setViewerFile(null)}
      />
    </View>
  );
}
