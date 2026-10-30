import type { SensorFormat } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';
import { formatPairLabels, sensorOverlay } from './format';

const BOX_W = 220;
const BOX_H = 140;
const STROKE_WIDTH = 1.5;

interface SensorPreviewProps {
  source: SensorFormat;
  target: SensorFormat;
}

/** Source and target formats drawn to scale, the smaller nested in the larger. */
export function SensorPreview({ source, target }: SensorPreviewProps) {
  const { outer, inner, sourceIsOuter } = sensorOverlay(
    source,
    target,
    BOX_W,
    BOX_H,
    STROKE_WIDTH
  );
  const sourceRect = sourceIsOuter ? outer : inner;
  const targetRect = sourceIsOuter ? inner : outer;
  const labels = formatPairLabels(source, target);
  const areaRatio =
    (target.width * target.height) / (source.width * source.height);

  return (
    <View
      className="items-center gap-2 py-1"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${labels.source} compared with ${labels.target}: the target has ${areaRatio.toFixed(2)} times the area of the source`}
    >
      <Svg width={BOX_W} height={BOX_H}>
        <Rect
          x={targetRect.x}
          y={targetRect.y}
          width={targetRect.w}
          height={targetRect.h}
          fill={`${ACCENT.emerald}22`}
          stroke={ACCENT.emerald}
          strokeWidth={STROKE_WIDTH}
          rx={2}
        />
        <Rect
          x={sourceRect.x}
          y={sourceRect.y}
          width={sourceRect.w}
          height={sourceRect.h}
          fill="transparent"
          stroke="#ffffff"
          strokeOpacity={0.5}
          strokeDasharray="4 3"
          strokeWidth={STROKE_WIDTH}
          rx={2}
        />
      </Svg>
      <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1 self-stretch">
        <Text className="shrink text-center text-xs text-white/60">
          ┅ {labels.source}
        </Text>
        <Text
          className="shrink text-center text-xs"
          style={{ color: ACCENT.emerald }}
        >
          ■ {labels.target}
        </Text>
      </View>
    </View>
  );
}
