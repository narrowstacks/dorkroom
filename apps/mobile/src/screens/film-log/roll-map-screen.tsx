// A roll's located frames on Apple Maps, with the same frames as a list below
// for VoiceOver and for anyone who would rather read than pan. The route takes
// only the roll id; coordinates are read from the film log here and go nowhere
// but the map view and the list.
//
// Opening the map makes MapKit fetch tiles from Apple for the region in view.
// The app itself sends no coordinates anywhere. The map never shows the user's
// own location, so it asks for no permission.
import type { AppleMaps } from 'expo-maps';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { NeutralButton } from '@/components/neutral-button';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SectionLabel } from '@/components/section-label';
import { useRoll } from '@/hooks/use-film-log';
import { useHeaderClearance } from '@/hooks/use-header-clearance';
import {
  type FramePoint,
  framePoints,
  type LocatedFrame,
  locatedFrameLabel,
  locatedFrames,
  selectedPoint,
} from '@/lib/frame-map-items';
import {
  type AppleMapsApi,
  frameMapView,
  loadAppleMaps,
  MAP_NEEDS_BUILD,
} from '@/lib/frame-map-native';
import { type FrameMapCamera, frameMapCamera } from '@/lib/frame-map-region';
import { usePhaseHue } from '@/theme/use-phase-accent';

/** The map's share of the window height, and its bounds in points. The map
 * keeps one height for the whole visit, whatever is selected. */
const MAP_SHARE = 0.36;
const MAP_MIN_HEIGHT = 220;
const MAP_MAX_HEIGHT = 440;
/** In a very short window the map gives way down to this, so a card still
 * has its minimum room. */
const MAP_FLOOR_HEIGHT = 160;
/** The card's frames always get at least this much height to scroll in. */
const CARD_MIN_FRAMES_HEIGHT = 96;
/** The card's vertical padding (`compact`) plus the gap under its header. */
const CARD_CHROME = 12 * 2 + 12;
const HEADER_MAX_FONT_SCALE = 2;
/** A header at twice its size, the chrome and the minimum frames height. */
const CARD_MIN_HEIGHT = 56 + CARD_CHROME + CARD_MIN_FRAMES_HEIGHT;
/** Space between the map and the card, and under the card. */
const GAP = 12;

/**
 * The map's one height for the visit: a share of the window within bounds,
 * lowered in a very short window so the card's minimum still fits above the
 * tab bar. It depends on the window only, never on what the card measures.
 */
function mapHeightFor(windowHeight: number, top: number, bottom: number) {
  const preferred = Math.min(
    MAP_MAX_HEIGHT,
    Math.max(MAP_MIN_HEIGHT, Math.round(windowHeight * MAP_SHARE))
  );
  const leaveForCard = windowHeight - top - bottom - 2 * GAP - CARD_MIN_HEIGHT;
  return Math.max(MAP_FLOOR_HEIGHT, Math.min(preferred, leaveForCard));
}

type MapRef = RefObject<AppleMaps.MapView | null>;

/** Clears the map's own marker selection. The view method is an async native
 * call; a rejection is ignored rather than left unhandled. */
function clearNativeSelection(mapRef: MapRef): void {
  Promise.resolve(mapRef.current?.selectMarker(undefined)).catch(() => {});
}

function openFrame(rollId: string, shotId: string) {
  router.push(`/shoot/film-log/shot?rollId=${rollId}&shotId=${shotId}`);
}

interface FrameMapProps {
  maps: AppleMapsApi;
  camera: FrameMapCamera;
  points: readonly FramePoint[];
  height: number;
  tint: string;
  onSelect: (pointId: string) => void;
  mapRef: MapRef;
}

// One marker per point: expo-maps resolves a tapped marker by `MKMapItem`
// equality, so frames at one spot share a pin (see `framePoints`).
function FrameMap({
  maps,
  camera,
  points,
  height,
  tint,
  onSelect,
  mapRef,
}: FrameMapProps) {
  const markers = useMemo(
    () =>
      points.map((point) => ({
        id: point.id,
        coordinates: { latitude: point.latitude, longitude: point.longitude },
        monogram: point.monogram,
        title: point.title,
        tintColor: tint,
      })),
    [points, tint]
  );
  return (
    <View
      className="overflow-hidden rounded-2xl border-hw border-line"
      style={{ height }}
    >
      <maps.View
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={camera}
        markers={markers}
        colorScheme={maps.MapColorScheme.DARK}
        // Off on purpose: the location button and dot would ask for (or use)
        // the location permission, and POI selection is not what this is for.
        uiSettings={{ myLocationButtonEnabled: false }}
        properties={{ isMyLocationEnabled: false, selectionEnabled: false }}
        onMarkerClick={(marker) => {
          if (marker.id) onSelect(marker.id);
        }}
      />
    </View>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <GlassCard className="gap-3">{children}</GlassCard>;
}

interface SelectedPointProps {
  point: FramePoint;
  hue: string;
  /** The height the whole card may take before it reaches the tab bar. */
  room: number;
  onOpen: (shotId: string) => void;
  onClose: () => void;
}

interface PointFrameProps {
  frame: LocatedFrame;
  showNumber: boolean;
  onOpen: (shotId: string) => void;
}

function PointFrame({ frame, showNumber, onOpen }: PointFrameProps) {
  return (
    <View className="gap-1">
      {showNumber ? (
        <Text className="text-base font-semibold text-white">
          Frame {frame.frameNumber}
        </Text>
      ) : null}
      {frame.place ? (
        <Text className="text-base text-white">{frame.place}</Text>
      ) : null}
      <Text className="text-sm text-ink-60">
        {frame.coordinatesText}
        {frame.accuracyText ? ` (${frame.accuracyText})` : ''}
      </Text>
      <NeutralButton
        label="Edit frame"
        onPress={() => onOpen(frame.shotId)}
        accessibilityLabel={`Edit frame ${frame.frameNumber}`}
      />
    </View>
  );
}

/** Every frame at the tapped pin, each with its own "Edit frame". */
function SelectedPoint({
  point,
  hue,
  room,
  onOpen,
  onClose,
}: SelectedPointProps) {
  const several = point.frames.length > 1;
  const [headerHeight, setHeaderHeight] = useState(0);
  const maxHeight = Math.max(
    CARD_MIN_FRAMES_HEIGHT,
    room - headerHeight - CARD_CHROME
  );
  const renderFrame = useCallback(
    ({ item }: { item: LocatedFrame }) => (
      <PointFrame frame={item} showNumber={several} onOpen={onOpen} />
    ),
    [several, onOpen]
  );
  // The title and Close stay put while the frames scroll under them, in what
  // is left above the tab bar. Their text is capped at twice its size so the
  // largest Dynamic Type leaves room for the frames.
  return (
    <GlassCard compact className="gap-3">
      <View
        className="flex-row items-center justify-between gap-3"
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
      >
        <Text
          className="flex-1 text-lg font-semibold"
          style={{ color: hue }}
          accessibilityRole="header"
          maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
        >
          {point.title}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
        >
          <Text
            className="text-base text-ink-70"
            maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
          >
            Close
          </Text>
        </Pressable>
      </View>
      <FlatList
        style={{ maxHeight }}
        contentContainerStyle={{ gap: 12 }}
        data={point.frames}
        keyExtractor={(frame) => frame.shotId}
        renderItem={renderFrame}
      />
    </GlassCard>
  );
}

export function RollMapScreen() {
  const hue = usePhaseHue();
  const { on: safelight } = useSafelight();
  const { rollId } = useLocalSearchParams<{ rollId: string }>();
  const roll = useRoll(rollId);
  const [showInSafelight, setShowInSafelight] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<AppleMaps.MapView>(null);
  // The map keeps its own selection: clear it too, or tapping the same pin
  // again changes nothing natively and sends no event (seen on the Simulator).
  // The screen never moves the camera after the opening fit, and the map
  // never changes size, so a tapped pin stays where it is.
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    clearNativeSelection(mapRef);
  }, []);
  const top = useHeaderClearance(12);
  const { height: windowHeight } = useWindowDimensions();
  // Inside a tab, the bottom inset includes the tab bar.
  const insets = useSafeAreaInsets();

  const frames = useMemo(() => locatedFrames(roll?.shots ?? []), [roll]);
  const points = useMemo(() => framePoints(frames), [frames]);
  const camera = useMemo(() => frameMapCamera(frames), [frames]);
  const maps = loadAppleMaps();
  const mapHeight = mapHeightFor(windowHeight, top, insets.bottom);

  // A selected point can vanish while the map is under the shot form (its
  // last frame deleted or moved). The card then has nothing to show; clear the
  // native selection as well, or that pin would be dead to taps.
  const selected = selectedPoint(points, selectedId);
  const selectionGone = selectedId !== null && selected === undefined;
  useFocusEffect(
    useCallback(() => {
      if (selectionGone) clearSelection();
    }, [selectionGone, clearSelection])
  );

  const onOpenFrame = useCallback(
    (shotId: string) => {
      if (roll) openFrame(roll.id, shotId);
    },
    [roll]
  );

  const renderFrame = useCallback(
    ({ item }: { item: LocatedFrame }) => (
      <Pressable
        onPress={() => roll && openFrame(roll.id, item.shotId)}
        accessibilityRole="button"
        accessibilityLabel={locatedFrameLabel(item)}
        accessibilityHint="Opens the frame"
      >
        <GlassCard className="flex-row items-center gap-3" compact>
          <Text className="w-12 text-lg font-semibold" style={{ color: hue }}>
            #{item.frameNumber}
          </Text>
          <View className="flex-1 gap-0.5">
            {item.place ? (
              <Text className="text-base text-white">{item.place}</Text>
            ) : null}
            <Text className="text-sm text-ink-60">
              {item.coordinatesText}
              {item.accuracyText ? ` (${item.accuracyText})` : ''}
            </Text>
          </View>
        </GlassCard>
      </Pressable>
    ),
    [hue, roll]
  );

  if (!roll) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b0b0c]">
        <Text className="text-ink-60">Roll not found.</Text>
      </View>
    );
  }

  const cardRoom = windowHeight - top - mapHeight - insets.bottom - 2 * GAP;
  const unlocated = roll.shots.length - frames.length;

  // The map is pinned above the list; a notice in its place scrolls with the
  // list instead, so large Dynamic Type can never push it off the screen.
  let notice: ReactNode = null;
  let map: ReactNode = null;
  const view = frameMapView({
    hasLocations: camera !== null,
    hasMap: maps !== null,
    safelight,
    showInSafelight,
  });
  if (view === 'no-locations') {
    notice = (
      <Notice>
        <Text className="text-base text-white">
          No frame on this roll has a location.
        </Text>
      </Notice>
    );
  } else if (view === 'needs-build') {
    notice = (
      <Notice>
        <Text className="text-base text-white">{MAP_NEEDS_BUILD}</Text>
        <Text className="text-sm text-ink-60">
          The frames are listed below.
        </Text>
      </Notice>
    );
  } else if (view === 'safelight') {
    notice = (
      <Notice>
        <Text className="text-base text-white">
          The map is hidden in Safelight mode.
        </Text>
        <Text className="text-sm text-ink-60">
          Apple Maps draws at full brightness. Safelight mode turns it red but
          cannot dim it.
        </Text>
        <NeutralButton
          label="Show map anyway"
          onPress={() => setShowInSafelight(true)}
        />
      </Notice>
    );
  } else if (maps && camera) {
    map = (
      <FrameMap
        maps={maps}
        camera={camera}
        points={points}
        height={mapHeight}
        tint={hue}
        onSelect={setSelectedId}
        mapRef={mapRef}
      />
    );
  }

  return (
    <View className="flex-1">
      <GradientBackground />
      {map ? (
        // The map and the tapped pin's card are pinned; while a card is open
        // it takes the room down to the tab bar in place of the list.
        <View style={{ paddingTop: top, paddingHorizontal: 16, gap: GAP }}>
          {map}
          {selected ? (
            <SelectedPoint
              key={selected.id}
              point={selected}
              hue={hue}
              room={cardRoom}
              onOpen={onOpenFrame}
              onClose={clearSelection}
            />
          ) : null}
        </View>
      ) : null}
      {selected && map ? null : (
        <FlatList
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={frames}
          keyExtractor={(frame) => frame.shotId}
          ListHeaderComponent={
            <View className="gap-3">
              {notice}
              <SectionLabel>Frames with a location</SectionLabel>
            </View>
          }
          ListFooterComponent={
            unlocated > 0 ? (
              <Text className="px-2 py-2 text-sm text-ink-50">
                {unlocated === 1
                  ? '1 frame has no location.'
                  : `${unlocated} frames have no location.`}
              </Text>
            ) : null
          }
          renderItem={renderFrame}
        />
      )}
    </View>
  );
}
