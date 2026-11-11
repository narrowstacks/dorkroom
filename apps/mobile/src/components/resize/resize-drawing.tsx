import { computePreviewRects } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useChartInk } from '@/components/reciprocity/chart-ink';
import type { Size } from '@/components/stage/stage-layout';
import {
  useAccentColor,
  useAccentFill,
  useModeColor,
} from '@/theme/use-phase-accent';
import { withAlpha } from '@/theme/with-alpha';
import {
  type DimensionKey,
  fitResizeBox,
  formatDimension,
  heightBars,
  LABEL_PAD_X,
  LABEL_PAD_Y,
  resizeLabels,
} from './drawing-geometry';

const BAR_WIDTH = 44;
const LABEL_WIDTH = 64;
const LABEL_HEIGHT = 22;

interface LabelProps {
  x: number;
  y: number;
  text: string;
  hue?: string;
}

/** A dimension written on the edge it names, on a pill so the line behind it never cuts the text. */
function EdgeText({ x, y, text, hue }: LabelProps) {
  const pill = useModeColor('rgba(0,0,0,0.9)', '#000000');
  return (
    <View
      pointerEvents="none"
      accessible={false}
      className="absolute items-center justify-center rounded-md px-1"
      style={{
        backgroundColor: pill,
        left: x - LABEL_WIDTH / 2,
        top: y - LABEL_HEIGHT / 2,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
      }}
    >
      <Text
        accessible={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        className="text-xs font-semibold text-ink-80"
        style={hue ? { color: hue } : undefined}
      >
        {text}
      </Text>
    </View>
  );
}

interface PrintDrawingProps {
  stage: Size;
  unit: string;
  origW: number;
  origL: number;
  newW: number;
  newL: number;
}

/**
 * The original print (dashed) and the new one (filled) at one scale, centred
 * on each other, with every dimension written on its own edge. Still: it
 * redraws only when a dimension changes.
 */
export function PrintDrawing({
  stage,
  unit,
  origW,
  origL,
  newW,
  newL,
}: PrintDrawingProps) {
  const hue = useAccentColor('rose');
  const fill = useAccentFill('rose', '22');
  const ink = useChartInk().line(0.5);
  const box = fitResizeBox(stage);
  const { orig, target } = computePreviewRects(origW, origL, newW, newL, box);
  if (box <= 0 || target.w <= 0) return null;
  const labels = resizeLabels(origW, origL, newW, newL, box);
  const value = { origW, origL, newW, newL } satisfies Record<
    DimensionKey,
    number
  >;
  const spoken = `Original ${formatDimension(origW)} by ${formatDimension(origL)} ${unit}, new ${formatDimension(newW)} by ${formatDimension(newL)} ${unit}.`;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Print sizes. ${spoken}`}
      style={{ width: box + 2 * LABEL_PAD_X, height: box + 2 * LABEL_PAD_Y }}
    >
      <View
        accessible={false}
        style={{ position: 'absolute', left: LABEL_PAD_X, top: LABEL_PAD_Y }}
      >
        <Svg width={box} height={box}>
          <Rect
            x={target.x}
            y={target.y}
            width={target.w}
            height={target.h}
            fill={fill}
            stroke={hue}
            strokeWidth={1.5}
            rx={2}
          />
          <Rect
            x={orig.x}
            y={orig.y}
            width={orig.w}
            height={orig.h}
            fill="transparent"
            stroke={ink.stroke}
            strokeOpacity={ink.strokeOpacity}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            rx={2}
          />
        </Svg>
        {labels.map((l) => (
          <EdgeText
            key={l.key}
            x={l.x}
            y={l.y}
            text={formatDimension(value[l.key])}
            hue={l.key === 'newW' || l.key === 'newL' ? hue : undefined}
          />
        ))}
      </View>
    </View>
  );
}

interface ColumnDrawingProps {
  stage: Size;
  unit: string;
  origH: number;
  newH: number;
}

/** Enlarger mode: the column at its original and new height, from one base. */
export function ColumnDrawing({
  stage,
  unit,
  origH,
  newH,
}: ColumnDrawingProps) {
  const hue = useAccentColor('rose');
  const fill = useAccentFill('rose', '22');
  const ink = useChartInk().line(0.5);
  const bars = heightBars(origH, newH, stage.height - 2 * LABEL_HEIGHT);
  if (!bars) return null;
  const spoken = `Enlarger column, original ${formatDimension(origH)} ${unit}, new ${formatDimension(newH)} ${unit}.`;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={spoken}
      className="flex-row items-end justify-center gap-10"
      style={{ height: stage.height }}
    >
      <View className="items-center">
        <Text className="pb-1 text-xs font-semibold text-ink-80">
          {formatDimension(origH)}
        </Text>
        <View
          style={{
            width: BAR_WIDTH,
            height: bars.orig,
            borderWidth: 1.5,
            borderColor: withAlpha(ink.stroke, ink.strokeOpacity),
            borderStyle: 'dashed',
            borderRadius: 2,
          }}
        />
      </View>
      <View className="items-center">
        <Text className="pb-1 text-xs font-semibold" style={{ color: hue }}>
          {formatDimension(newH)}
        </Text>
        <View
          style={{
            width: BAR_WIDTH,
            height: bars.target,
            borderWidth: 1.5,
            borderColor: hue,
            backgroundColor: fill,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}
