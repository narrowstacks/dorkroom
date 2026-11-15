import { Image } from 'expo-image';
import { type Href, Link, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { groupRowClassName } from '@/components/surface-style';
import { photoUri } from '@/lib/film-log-photos';
import {
  frameNumberColumnWidth,
  type FrameRowText,
} from '@/lib/frame-row-text';
import { useDimInk, usePhaseHue } from '@/theme/use-phase-accent';

interface FrameRowProps {
  text: FrameRowText;
  /** The frame's photo file, for the thumbnail; none, no thumbnail. */
  photoFileName: string | undefined;
  /** The frame's own page (the shot form): a tap, and Edit frame. */
  href: Href;
  /** Position in the group, for the rounded ends and the separator. */
  index: number;
  count: number;
  /** View photo; only offered when the frame has one. */
  onViewPhoto: () => void;
  /** Show roll map (the whole roll's map); only offered when the frame has a
   * location. */
  onShowOnMap: () => void;
}

type FrameAction = 'viewPhoto' | 'showOnMap';

/**
 * One frame in a roll's grouped list: the edge number in a fixed column in the
 * phase hue, a thumbnail only when there is a photo, the exposure, then lens,
 * back and place, the first line of the notes, and grey glyphs for a location (`mappin`) and a frame logged
 * from the Meter. One VoiceOver button whose label carries the glyphs (a
 * wrapper view; see below).
 *
 * A tap opens the frame. A long press shows a native context menu (expo-router
 * `Link.Menu`) with the frame's existing actions: Edit frame, View photo and
 * Show roll map, each only when it applies. VoiceOver gets the last two as
 * custom actions.
 */
export function FrameRow({
  text,
  photoFileName,
  href,
  index,
  count,
  onViewPhoto,
  onShowOnMap,
}: FrameRowProps) {
  const hue = usePhaseHue();
  const { fontScale } = useWindowDimensions();
  const numberWidth = frameNumberColumnWidth(fontScale);
  const glyph = useDimInk('rgba(255,255,255,0.5)');
  const actions: { name: FrameAction; label: string }[] = [];
  if (photoFileName) actions.push({ name: 'viewPhoto', label: 'View photo' });
  if (text.located) {
    actions.push({ name: 'showOnMap', label: 'Show roll map' });
  }

  return (
    // The VoiceOver element is this wrapper, not the Pressable: `Link.Menu`
    // mounts its trigger in a native view with `display: contents`, and the
    // accessibility tree skips that view's subtree, so a label on the
    // Pressable reached no one. A double-tap is `onAccessibilityTap`.
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={text.accessibilityLabel}
      accessibilityHint="Opens the frame to edit it."
      accessibilityActions={actions}
      onAccessibilityTap={() => router.push(href)}
      onAccessibilityAction={(event) => {
        const name = event.nativeEvent.actionName;
        if (name === 'viewPhoto') onViewPhoto();
        if (name === 'showOnMap') onShowOnMap();
      }}
    >
      <Link href={href} push asChild>
        <Link.Trigger>
          <Pressable
            className={`${groupRowClassName(index, count)} active:opacity-70`}
          >
            <View className="min-h-11 flex-row items-center gap-3 px-4 py-3">
              <Text
                className="text-lg font-semibold tabular-nums"
                style={{ color: hue, width: numberWidth }}
              >
                {text.number}
              </Text>
              {photoFileName ? (
                // An outline, so a photo metered in the dark still reads as a
                // photo and not as a hole.
                <View className="overflow-hidden rounded-md border border-edge">
                  <Image
                    source={{ uri: photoUri(photoFileName) }}
                    style={{ width: 36, height: 48 }}
                    contentFit="cover"
                  />
                </View>
              ) : null}
              <View className="flex-1 gap-0.5">
                <Text className="text-base tabular-nums text-white">
                  {text.exposure}
                </Text>
                {text.detail ? (
                  <Text className="text-sm text-ink-60">{text.detail}</Text>
                ) : null}
                {text.notes ? (
                  <Text
                    className="text-sm text-ink-50"
                    // One line at the usual sizes; it wraps at the large ones.
                    numberOfLines={fontScale >= 1.5 ? undefined : 1}
                  >
                    {text.notes}
                  </Text>
                ) : null}
              </View>
              {text.located || text.fromMeter ? (
                <View className="flex-row items-center gap-2">
                  {text.located ? (
                    <SymbolView name="mappin" size={14} tintColor={glyph} />
                  ) : null}
                  {text.fromMeter ? (
                    <SymbolView
                      name="camera.metering.center.weighted"
                      size={14}
                      tintColor={glyph}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        </Link.Trigger>
        <Link.Menu>
          <Link.MenuAction icon="pencil" onPress={() => router.push(href)}>
            Edit frame
          </Link.MenuAction>
          {photoFileName ? (
            <Link.MenuAction icon="photo" onPress={onViewPhoto}>
              View photo
            </Link.MenuAction>
          ) : null}
          {text.located ? (
            <Link.MenuAction icon="map" onPress={onShowOnMap}>
              Show roll map
            </Link.MenuAction>
          ) : null}
        </Link.Menu>
      </Link>
    </View>
  );
}
