import { Pressable, View } from 'react-native';
import type { ThumbnailDot } from '@/lib/frame-map-thumbnail';
import { usePhaseHue } from '@/theme/use-phase-accent';

const WIDTH = 96;
const HEIGHT = 72;
const DOT = 8;

interface FrameMapThumbnailProps {
  dots: readonly ThumbnailDot[];
  /** "Map of 3 frames with a location": never the coordinates. */
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * A drawn stand-in for the roll's map: a faint grid with a dot in the phase
 * hue for each located point, placed by `thumbnailDots`. Not a map view, so it
 * fetches nothing, scrolls with the page and follows safelight like any other
 * view. A tap opens the roll's map.
 */
export function FrameMapThumbnail({
  dots,
  accessibilityLabel,
  onPress,
}: FrameMapThumbnailProps) {
  const hue = usePhaseHue();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the map."
      className="overflow-hidden rounded-xl border border-edge bg-surface-inset active:opacity-70"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {[1, 2].map((line) => (
        <View
          key={`h${line}`}
          className="absolute h-px bg-edge"
          style={{ left: 0, right: 0, top: (HEIGHT * line) / 3 }}
        />
      ))}
      {[1, 2].map((line) => (
        <View
          key={`v${line}`}
          className="absolute w-px bg-edge"
          style={{ top: 0, bottom: 0, left: (WIDTH * line) / 3 }}
        />
      ))}
      {dots.map((dot) => (
        <View
          key={`${dot.x},${dot.y}`}
          className="absolute rounded-full"
          style={{
            width: DOT,
            height: DOT,
            left: dot.x * WIDTH - DOT / 2,
            top: dot.y * HEIGHT - DOT / 2,
            backgroundColor: hue,
          }}
        />
      ))}
    </Pressable>
  );
}
