import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { CommitButton } from '@/components/commit-button';
import { FilmLogStatsStrip } from '@/components/film-log/film-log-stats-strip';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { PresetChipRow } from '@/components/preset-chip-row';
import { TabBarScrollView } from '@/components/tab-bar-scroll-view';
import { useCameras, useRolls } from '@/hooks/use-film-log';
import {
  filmLogStats,
  filterRolls,
  ROLL_FILTERS,
  rollCounts,
  type RollFilter,
  rollFilterFromParam,
  sortRolls,
} from '@/lib/film-log-collection';
import {
  formatProcess,
  rollLabel,
  rollStatusLabel,
} from '@/lib/film-log-options';
import { shareRollsAsJson } from '@/lib/film-log-share';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import type { FilmRoll } from '@/schemas/film-log.schema';

// Static — hoisted so it isn't rebuilt on every render.
const EMPTY_STATE = (
  <View className="items-center gap-2 px-6 py-16">
    <Text className="text-center text-base text-ink-60">
      No rolls yet. Start one to log your shots.
    </Text>
  </View>
);

const FILTER_EMPTY_TEXT = {
  'in-camera': 'No film in a camera right now.',
  'to-develop': 'Nothing waiting to be developed.',
  'this-year': 'No rolls started this year.',
} satisfies Record<Exclude<RollFilter, 'all'>, string>;

function filterEmptyState(filter: Exclude<RollFilter, 'all'>) {
  return (
    <View className="items-center gap-2 px-6 py-16">
      <Text className="text-center text-base text-ink-60">
        {FILTER_EMPTY_TEXT[filter]}
      </Text>
    </View>
  );
}

export function FilmListScreen() {
  const rolls = useRolls();
  const cameras = useCameras();
  const [filter, setFilter] = useState<RollFilter>('all');
  // A link may open the list on a filter (`?filter=to-develop&at=`, the Develop
  // hub's "N more"). Applied once per opening, during render, so the user's
  // own chip choice afterwards is left alone.
  const { filter: filterParam, [LINK_OPENED_PARAM]: openedParam } =
    useLocalSearchParams<{ filter?: string; at?: string }>();
  const linkedFilter = rollFilterFromParam(filterParam);
  const opening = linkedFilter ? `${linkedFilter}|${openedParam ?? ''}` : null;
  const [appliedOpening, setAppliedOpening] = useState<string | null>(null);
  if (linkedFilter && opening !== appliedOpening) {
    setAppliedOpening(opening);
    setFilter(linkedFilter);
  }

  // Only the calendar year matters to counts and stats, so it is the memo key:
  // they stay put when the filter changes and refresh across New Year. The
  // anchor date sits mid-year, which every local zone agrees is that year.
  const year = new Date().getFullYear();
  const { counts, stats } = useMemo(() => {
    const anchor = new Date(year, 6, 1);
    return {
      counts: rollCounts(rolls, anchor),
      stats: filmLogStats(rolls, cameras, anchor),
    };
  }, [rolls, cameras, year]);
  const visible = useMemo(
    () => filterRolls(sortRolls(rolls), filter, new Date(year, 6, 1)),
    [rolls, filter, year]
  );

  const chipOptions = useMemo(
    () =>
      ROLL_FILTERS.map(({ value, label }) => {
        const count = counts[value];
        return {
          value,
          label: `${label} ${count}`,
          accessibilityLabel: `${label}, ${count} ${count === 1 ? 'roll' : 'rolls'}`,
          dimmed: count === 0,
        };
      }),
    [counts]
  );

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
      const showName = Boolean(item.name?.trim());
      const subtitle = [
        cameraName(item.cameraId),
        showName ? film : null,
        formatProcess(item.process),
      ]
        .filter(Boolean)
        .join(' · ');
      const startedLabel = new Date(item.startedAt).toLocaleDateString(
        undefined,
        { month: 'short', day: 'numeric' }
      );
      return (
        <Pressable
          onPress={() => router.push(`/shoot/film-log/roll/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open roll ${rollLabel(item)}, ${rollStatusLabel(item.status)}`}
        >
          <GlassCard className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base font-semibold text-white"
                numberOfLines={1}
              >
                {item.name?.trim() ? item.name : film}
              </Text>
              <Text className="text-xs uppercase tracking-wide text-ink-50">
                {rollStatusLabel(item.status)}
              </Text>
            </View>
            <Text className="text-sm text-ink-60" numberOfLines={1}>
              {subtitle}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-ink-40">
                {item.shots.length} {item.shots.length === 1 ? 'shot' : 'shots'}
              </Text>
              <Text className="text-sm text-ink-40">{startedLabel}</Text>
            </View>
          </GlassCard>
        </Pressable>
      );
    },
    [cameraName]
  );

  const header = (
    <View className="gap-3 pb-2">
      <CommitButton
        onPress={() => router.push('/shoot/film-log/roll-form')}
        label="+ New roll"
      />
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.push('/shoot/film-log/gear')}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl border-hw border-line bg-surface px-4 py-3"
        >
          <Text className="text-base text-white">Cameras & lenses</Text>
        </Pressable>
        <Pressable
          onPress={onExport}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl border-hw border-line bg-surface px-4 py-3"
        >
          <Text className="text-base text-white">Export data</Text>
        </Pressable>
      </View>
      {rolls.length > 0 ? (
        <>
          <PresetChipRow
            options={chipOptions}
            value={filter}
            onSelect={setFilter}
          />
          <FilmLogStatsStrip stats={stats} />
        </>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <TabBarScrollView>
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={visible}
          keyExtractor={(roll) => roll.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            rolls.length === 0 || filter === 'all'
              ? EMPTY_STATE
              : filterEmptyState(filter)
          }
          renderItem={renderRoll}
        />
      </TabBarScrollView>
    </View>
  );
}
