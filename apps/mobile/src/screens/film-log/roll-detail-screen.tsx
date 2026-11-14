import { router, Stack, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { Button } from '@/components/button';
import {
  confirmMarkDeveloped,
  confirmMarkShot,
} from '@/components/film-log/confirm-roll-status';
import { developedDateText } from '@/components/film-log/developed-date';
import { FrameRow } from '@/components/film-log/frame-row';
import { PhotoViewer } from '@/components/film-log/photo-viewer';
import { RollSummary } from '@/components/film-log/roll-summary';
import { useBackdropStyle } from '@/components/gradient-background';
import { offersSafelightButton } from '@/components/safelight/offer';
import { SafelightButton } from '@/components/safelight/safelight-button';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SectionLabel } from '@/components/section-label';
import { TabBarScrollView } from '@/components/tab-bar-scroll-view';
import { useCameras, useLenses, useRoll } from '@/hooks/use-film-log';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { frameLensName } from '@/lib/camera-lenses';
import { frameCountLabel } from '@/lib/film-log-list';
import { shareRollAsCsv, shareRollAsGpx } from '@/lib/film-log-share';
import { deleteRoll } from '@/lib/film-log-storage';
import { framePoints, locatedFrames } from '@/lib/frame-map-items';
import { loadAppleMaps } from '@/lib/frame-map-native';
import { thumbnailDots } from '@/lib/frame-map-thumbnail';
import { frameRowText } from '@/lib/frame-row-text';
import { cameraDisplayName } from '@/lib/gear-display';
import { toolHref } from '@/lib/home/destination';
import { toHref } from '@/lib/href';
import { openToolPath } from '@/lib/open-tool-path';
import {
  developmentSummaryLine,
  markDevelopedCopy,
  nextLifecycleAction,
} from '@/lib/roll-lifecycle';
import {
  locatedCountLabel,
  noFramesMessage,
  offersMeterShortcut,
  rollDatesLine,
  rollSetupLine,
} from '@/lib/roll-summary';
import type { FilmRoll, Shot } from '@/schemas/film-log.schema';
import { usePhase } from '@/theme/phase-context';

const addFramePath = (rollId: string) =>
  toHref(`/shoot/film-log/shot?rollId=${encodeURIComponent(rollId)}`);
const rollMapPath = (rollId: string) =>
  toHref(`/shoot/film-log/roll-map?rollId=${encodeURIComponent(rollId)}`);

interface RollHeaderItemsProps {
  rollId: string;
  hasFrames: boolean;
  located: boolean;
  onDelete: () => void;
}

/**
 * The header's right side: `+` (Add frame) and a More menu, native bar items.
 * They replace the stack's `headerRight`, so the safelight switch the phase
 * stack would put there is added back here while the stack offers it.
 */
// Memoized: its props change rarely, so a re-render of the page does not
// re-register the bar items. Its own hooks (phase, safelight) still re-render it.
const RollHeaderItems = memo(function RollHeaderItems({
  rollId,
  hasFrames,
  located,
  onDelete,
}: RollHeaderItemsProps) {
  const phase = usePhase();
  const { on } = useSafelight();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="plus"
        accessibilityLabel="Add frame"
        onPress={() => router.push(addFramePath(rollId))}
      />
      <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More">
        <Stack.Toolbar.MenuAction
          icon="pencil"
          onPress={() =>
            router.push(
              toHref(
                `/shoot/film-log/roll-form?rollId=${encodeURIComponent(rollId)}`
              )
            )
          }
        >
          Edit roll
        </Stack.Toolbar.MenuAction>
        {located ? (
          <Stack.Toolbar.MenuAction
            icon="map"
            onPress={() => router.push(rollMapPath(rollId))}
          >
            Show map
          </Stack.Toolbar.MenuAction>
        ) : null}
        <Stack.Toolbar.Menu icon="square.and.arrow.up" title="Share">
          <Stack.Toolbar.MenuAction
            icon="tablecells"
            disabled={!hasFrames}
            subtitle={hasFrames ? undefined : 'Log a frame to export.'}
            onPress={() => void shareRollAsCsv(rollId)}
          >
            Export CSV
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="mappin"
            disabled={!located}
            subtitle={
              located ? undefined : 'Add a location to a frame to export GPX.'
            }
            onPress={() => void shareRollAsGpx(rollId)}
          >
            Export GPX
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        {/* An inline section, so Delete sits apart below a separator. */}
        <Stack.Toolbar.Menu inline>
          <Stack.Toolbar.MenuAction icon="trash" destructive onPress={onDelete}>
            Delete roll
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
      <Stack.Toolbar.View hidden={!offersSafelightButton(phase, on)}>
        <SafelightButton />
      </Stack.Toolbar.View>
    </Stack.Toolbar>
  );
});

/** A roll with no frames: one sentence and the page's one commit. */
function NoFramesEmptyState({
  roll,
  onAddFrame,
}: {
  roll: Pick<FilmRoll, 'status'>;
  onAddFrame: () => void;
}) {
  return (
    <View className="gap-3 pt-1">
      <Text className="text-base text-ink-60">
        {noFramesMessage(roll.status)}
      </Text>
      <Button variant="commit" label="Add frame" onPress={onAddFrame} />
    </View>
  );
}

export function RollDetailScreen() {
  const backdrop = useBackdropStyle();
  const { rollId } = useLocalSearchParams<{ rollId: string }>();
  const roll = useRoll(rollId);
  const cameras = useCameras();
  const lenses = useLenses();
  const { setRoll: setMeterRoll } = useMeterRoll();
  const [viewerFile, setViewerFile] = useState<string | null>(null);

  const lensName = useMemo(() => {
    const map = new Map(lenses.map((lens) => [lens.id, lens.name]));
    return (id: string) => map.get(id);
  }, [lenses]);

  const shots = roll?.shots;
  const { located, mapDots } = useMemo(() => {
    const frames = locatedFrames(shots ?? []);
    return {
      located: frames.length,
      mapDots: thumbnailDots(framePoints(frames)),
    };
  }, [shots]);

  const onDelete = useCallback(() => {
    if (!rollId) return;
    Alert.alert('Delete roll?', 'This removes the roll and all its frames.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRoll(rollId);
          router.back();
        },
      },
    ]);
  }, [rollId]);

  const openMap = useCallback(() => {
    if (rollId) router.push(rollMapPath(rollId));
  }, [rollId]);

  const count = shots?.length ?? 0;
  const renderShot = useCallback(
    ({ item, index }: { item: Shot; index: number }) => {
      const photo = item.photo?.fileName;
      return (
        <FrameRow
          text={frameRowText(item, frameLensName(item, lensName))}
          photoFileName={photo}
          href={toHref(
            `/shoot/film-log/shot?rollId=${encodeURIComponent(rollId ?? '')}&shotId=${encodeURIComponent(item.id)}`
          )}
          index={index}
          count={count}
          onViewPhoto={() => {
            if (photo) setViewerFile(photo);
          }}
          onShowOnMap={openMap}
        />
      );
    },
    [count, lensName, openMap, rollId]
  );

  if (!roll) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b0b0c]">
        <Text className="text-ink-60">Roll not found.</Text>
      </View>
    );
  }

  const camera = cameras.find((c) => c.id === roll.cameraId);
  const cameraName = camera ? cameraDisplayName(camera) : undefined;
  const hasFrames = roll.shots.length > 0;
  const title = roll.name?.trim() ? roll.name : (roll.filmStockName ?? 'Roll');
  const action = nextLifecycleAction(roll.status);
  const onAction = () => {
    if (action?.kind === 'mark-shot') confirmMarkShot(roll);
    if (action?.kind === 'mark-developed') confirmMarkDeveloped(roll);
  };
  const actionAccessibilityLabel =
    action?.kind === 'mark-shot'
      ? 'Mark as shot. Moves the roll to To develop.'
      : action?.kind === 'mark-developed'
        ? markDevelopedCopy(roll, developedDateText).accessibilityLabel
        : undefined;
  const development =
    roll.status === 'developed' ? roll.development : undefined;
  // The thumbnail opens the map screen, so it shows only when this build has
  // the map; "Show map" in the menu stays (that screen explains a missing map
  // and still lists the frames).
  const showThumbnail = located > 0 && loadAppleMaps() !== null;
  const addFrame = () => router.push(addFramePath(roll.id));
  const openMeter = offersMeterShortcut(roll.status)
    ? () => {
        // The Meter logs to its persisted pick among the rolls in the camera
        // (`useMeterRoll`), the same setter its roll pill uses.
        setMeterRoll(roll.id);
        openToolPath(toolHref('meter'));
      }
    : undefined;

  const header = (
    <View className="gap-6 pb-3">
      <RollSummary
        status={roll.status}
        setup={rollSetupLine(roll, cameraName)}
        dates={rollDatesLine(roll, new Date())}
        development={
          development
            ? developmentSummaryLine(development, roll.iso)
            : undefined
        }
        developmentNotes={development?.notes?.trim() || undefined}
        back={roll.back?.trim() || undefined}
        notes={roll.notes?.trim() || undefined}
        action={action}
        actionAccessibilityLabel={actionAccessibilityLabel}
        onAction={onAction}
        frames={frameCountLabel(roll.shots.length)}
        located={locatedCountLabel(located)}
        mapDots={showThumbnail ? mapDots : null}
        mapAccessibilityLabel={`Map of ${frameCountLabel(located)} with a location`}
        onOpenMap={openMap}
        onOpenMeter={openMeter}
      />
      <SectionLabel>Frames</SectionLabel>
    </View>
  );

  return (
    // A fragment, not a wrapper view: the list must be the root native view
    // for the large title to collapse (see `Screen`).
    <>
      <Stack.Screen options={{ title }} />
      <TabBarScrollView>
        <FlatList
          style={backdrop}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16 }}
          data={roll.shots}
          keyExtractor={(shot) => shot.id}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <NoFramesEmptyState roll={roll} onAddFrame={addFrame} />
          }
          renderItem={renderShot}
        />
      </TabBarScrollView>
      <PhotoViewer
        visible={!!viewerFile}
        fileName={viewerFile}
        onClose={() => setViewerFile(null)}
      />
      {/* Renders no view: it sets the header's bar items. */}
      <RollHeaderItems
        rollId={roll.id}
        hasFrames={hasFrames}
        located={located > 0}
        onDelete={onDelete}
      />
    </>
  );
}
