import { router, Stack, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import {
  FirstRollEmptyState,
  NoMatchEmptyState,
} from '@/components/film-log/film-log-empty-state';
import { RollRow } from '@/components/film-log/roll-row';
import { useBackdropStyle } from '@/components/gradient-background';
import { PresetChipRow } from '@/components/preset-chip-row';
import { offersSafelightButton } from '@/components/safelight/offer';
import { SafelightButton } from '@/components/safelight/safelight-button';
import { useSafelight } from '@/components/safelight/safelight-provider';
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
  filmLogCaption,
  filmLogEmptyState,
  firstRollHint,
  rollDateLabel,
  rollRowText,
} from '@/lib/film-log-list';
import { shareRollsAsJson } from '@/lib/film-log-share';
import { cameraDisplayName } from '@/lib/gear-display';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import type { FilmRoll } from '@/schemas/film-log.schema';
import { usePhase } from '@/theme/phase-context';

const openNewRoll = () => router.push('/shoot/film-log/roll-form');
const openGear = () => router.push('/shoot/film-log/gear');

interface HeaderItemsProps {
  hasRolls: boolean;
}

/**
 * The header's right side: `+` (New roll) and a More menu, native bar items.
 * They replace the stack's `headerRight`, so the safelight switch the phase
 * stack would put there is added back here while the stack offers it.
 */
// Memoized: its only prop changes rarely, so a chip tap does not re-register
// the bar items. Its own hooks (phase, safelight) still re-render it.
const FilmLogHeaderItems = memo(function FilmLogHeaderItems({
  hasRolls,
}: HeaderItemsProps) {
  const phase = usePhase();
  const { on } = useSafelight();
  return (
    <Stack.Toolbar placement="right">
      {/* With no rolls the empty state's own New roll button is the action. */}
      <Stack.Toolbar.Button
        icon="plus"
        accessibilityLabel="New roll"
        hidden={!hasRolls}
        onPress={openNewRoll}
      />
      <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More">
        <Stack.Toolbar.MenuAction icon="camera" onPress={openGear}>
          Cameras & lenses
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon="square.and.arrow.up"
          disabled={!hasRolls}
          subtitle={hasRolls ? undefined : 'Add a roll first.'}
          onPress={() => void shareRollsAsJson()}
        >
          Export all data
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
      <Stack.Toolbar.View hidden={!offersSafelightButton(phase, on)}>
        <SafelightButton />
      </Stack.Toolbar.View>
    </Stack.Toolbar>
  );
});

export function FilmListScreen() {
  const backdrop = useBackdropStyle();
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

  // Only the calendar year matters to counts, stats and row dates, so it is
  // the memo key: they stay put when the filter changes and refresh across New
  // Year. The anchor date sits mid-year, which every local zone agrees is that
  // year.
  const year = new Date().getFullYear();
  const { counts, caption } = useMemo(() => {
    const anchor = new Date(year, 6, 1);
    return {
      counts: rollCounts(rolls, anchor),
      caption: filmLogCaption(
        filmLogStats(rolls, cameras, anchor),
        year,
        rolls.length
      ),
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
    const map = new Map(
      cameras.map((camera) => [camera.id, cameraDisplayName(camera)])
    );
    return (id: string) => map.get(id);
  }, [cameras]);

  const count = visible.length;
  const renderRoll = useCallback(
    ({ item, index }: { item: FilmRoll; index: number }) => {
      const dateLabel = rollDateLabel(item.startedAt, new Date(year, 6, 1));
      return (
        <RollRow
          text={rollRowText(item, cameraName(item.cameraId), dateLabel)}
          dateLabel={dateLabel}
          inCamera={item.status === 'active'}
          index={index}
          count={count}
          onPress={() => router.push(`/shoot/film-log/roll/${item.id}`)}
        />
      );
    },
    [cameraName, count, year]
  );

  const showAll = useCallback(() => setFilter('all'), []);
  const empty = filmLogEmptyState(rolls.length, filter, count);
  const emptyComponent =
    empty.kind === 'first-roll' ? (
      <FirstRollEmptyState
        hint={firstRollHint(cameras.length)}
        onNewRoll={openNewRoll}
      />
    ) : empty.kind === 'no-match' ? (
      <NoMatchEmptyState message={empty.message} onShowAll={showAll} />
    ) : null;

  const header =
    rolls.length > 0 ? (
      <View className="gap-3 pb-3">
        <PresetChipRow
          options={chipOptions}
          value={filter}
          onSelect={setFilter}
        />
        {caption ? (
          <Text className="text-sm text-ink-60">{caption}</Text>
        ) : null}
      </View>
    ) : null;

  // A fragment, not a wrapper view: the list must be the root native view
  // for the large title to collapse (see `Screen`). The header items render
  // no native view, so they may follow it.
  return (
    <>
      <TabBarScrollView>
        <FlatList
          style={backdrop}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16 }}
          data={visible}
          keyExtractor={(roll) => roll.id}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyComponent}
          renderItem={renderRoll}
        />
      </TabBarScrollView>
      {/* Renders no view: it sets the header's bar items. */}
      <FilmLogHeaderItems hasRolls={rolls.length > 0} />
    </>
  );
}
