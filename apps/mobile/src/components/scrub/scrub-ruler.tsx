import {
  Canvas,
  Group,
  LinearGradient,
  matchFont,
  Path,
  Rect,
  type SkFont,
  Skia,
  type SkPath,
  Text as SkiaText,
  vec,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import { useSafelight } from '@/components/safelight/safelight-provider';
import type { RulerTick } from '@/components/scrub/ruler-machine';
import { INDICATOR_TOP, RULER_METRICS } from '@/components/scrub/ruler-metrics';
import { SAFELIGHT } from '@/theme/safelight';

const MINOR_COLOR = 'rgba(255,255,255,0.2)';
const MAJOR_COLOR = 'rgba(255,255,255,0.4)';
const LABEL_COLOR = 'rgba(255,255,255,0.35)';
// Safelight mode: the multiply overlay keeps only red, so the ticks take red
// levels that stay legible rather than a low-alpha white.
const SAFELIGHT_MINOR = SAFELIGHT.outline;
const SAFELIGHT_MAJOR = SAFELIGHT.outlineSelected;
const SAFELIGHT_LABEL = SAFELIGHT.text;
const LABEL_SIZE = 10;
/** Cap height as a share of the font size, for centring a label in its band. */
const CAP_HEIGHT = 0.72;
const LABEL_BASELINE =
  RULER_METRICS.labelTop +
  (RULER_METRICS.labelHeight + LABEL_SIZE * CAP_HEIGHT) / 2;
const FADE_COLORS = ['rgba(0,0,0,0)', '#000000', '#000000', 'rgba(0,0,0,0)'];
/** Transparent at each edge, opaque from 10% to 90% of the width. */
const FADE_POSITIONS = [0, 0.1, 0.9, 1];

let labelFont: SkFont | null | undefined;

/** Skia's iOS font resolver maps `System` to `.AppleSystemUIFont` (SF). It
 * has no name for the rounded face the readouts use, so labels are SF. */
const LABEL_FAMILY = 'System';

function measuresDigits(font: SkFont): boolean {
  try {
    return font.measureText('0').width > 0;
  } catch {
    return false;
  }
}

/** The label face, made on first use (not at import, so tests never touch
 * Skia). If the system family measures nothing, Skia's default family stands
 * in; if that fails too there are no labels. */
function getLabelFont(): SkFont | null {
  if (labelFont !== undefined) return labelFont;
  labelFont = null;
  for (const style of [{ fontFamily: LABEL_FAMILY }, {}]) {
    try {
      const font = matchFont({ ...style, fontSize: LABEL_SIZE });
      if (measuresDigits(font)) {
        labelFont = font;
        break;
      }
    } catch {
      // Try the default family.
    }
  }
  return labelFont;
}

interface RulerLabel {
  key: string;
  text: string;
  x: number;
}

interface RulerPaths {
  minor: SkPath;
  major: SkPath;
  labels: RulerLabel[];
}

/** One path per tick weight and one text per label, in strip coordinates with
 * the origin at the strip's centre. Built once per window. */
function buildPaths(
  ticks: RulerTick[],
  centre: number,
  font: SkFont | null
): RulerPaths {
  const minor = Skia.Path.Make();
  const major = Skia.Path.Make();
  const labels: RulerLabel[] = [];
  for (const tick of ticks) {
    const height = tick.major
      ? RULER_METRICS.majorTick
      : RULER_METRICS.minorTick;
    // One px wide, centred on the tick, hanging from the bottom of the strip.
    (tick.major ? major : minor).addRect(
      Skia.XYWHRect(
        centre + tick.x - 0.5,
        RULER_METRICS.height - height,
        1,
        height
      )
    );
    if (tick.label !== null && font !== null) {
      labels.push({
        key: String(tick.value),
        text: tick.label,
        x: centre + tick.x - font.measureText(tick.label).width / 2,
      });
    }
  }
  return { minor, major, labels };
}

interface ScrubRulerProps {
  /** The window of the number line, in fixed coordinates from the origin. */
  ticks: RulerTick[];
  width: number;
  color: string;
  /** Where the line sits, in px. Driven on the UI thread; Skia reads it there
   * with no React render. */
  offset: SharedValue<number>;
}

/**
 * A number line under a fixed centre indicator, drawn in one Skia canvas that
 * is never remounted. Everything that moves sits in one group translated by
 * the shared `offset`; a full-strip alpha ramp (dstIn over a layer) fades the ticks at both edges, so
 * they dim as they approach an edge while they move. Re-renders only when the
 * ticks, the width or the accent change.
 */
export const ScrubRuler = memo(function ScrubRuler({
  ticks,
  width,
  color,
  offset,
}: ScrubRulerProps) {
  const centre = width / 2;
  const { on } = useSafelight();
  const font = getLabelFont();
  const paths = useMemo(
    () => buildPaths(ticks, centre, font),
    [ticks, centre, font]
  );
  const transform = useDerivedValue(() => [{ translateX: offset.value }]);
  const fade = useMemo(
    () => (
      <Rect
        x={0}
        y={0}
        width={width}
        height={RULER_METRICS.height}
        blendMode="dstIn"
      >
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={FADE_COLORS}
          positions={FADE_POSITIONS}
        />
      </Rect>
    ),
    [width]
  );
  return (
    <>
      <View
        // Decorative: the row is one adjustable element already.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Canvas style={{ width, height: RULER_METRICS.height }}>
          <Group layer>
            <Group transform={transform}>
              <Path
                path={paths.minor}
                color={on ? SAFELIGHT_MINOR : MINOR_COLOR}
              />
              <Path
                path={paths.major}
                color={on ? SAFELIGHT_MAJOR : MAJOR_COLOR}
              />
              {paths.labels.map((label) => (
                <SkiaText
                  key={label.key}
                  x={label.x}
                  y={LABEL_BASELINE}
                  text={label.text}
                  font={font}
                  color={on ? SAFELIGHT_LABEL : LABEL_COLOR}
                />
              ))}
            </Group>
            {fade}
          </Group>
        </Canvas>
      </View>
      <View
        style={{
          position: 'absolute',
          top: INDICATOR_TOP,
          bottom: 0,
          left: centre - 1,
          width: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    </>
  );
});
