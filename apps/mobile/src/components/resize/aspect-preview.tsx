import { computePreviewRects } from '@dorkroom/logic';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';

const BOX = 120;

interface AspectPreviewProps {
  origW: number;
  origL: number;
  newW: number;
  newL: number;
}

export function AspectPreview({
  origW,
  origL,
  newW,
  newL,
}: AspectPreviewProps) {
  const { orig, target } = computePreviewRects(origW, origL, newW, newL, BOX);
  if (target.w <= 0) return null;
  return (
    <View className="items-center py-2">
      <Svg width={BOX} height={BOX}>
        <Rect
          x={target.x}
          y={target.y}
          width={target.w}
          height={target.h}
          fill={`${ACCENT.teal}22`}
          stroke={ACCENT.teal}
          strokeWidth={1.5}
          rx={2}
        />
        <Rect
          x={orig.x}
          y={orig.y}
          width={orig.w}
          height={orig.h}
          fill="transparent"
          stroke="#ffffff"
          strokeOpacity={0.5}
          strokeDasharray="4 3"
          strokeWidth={1.5}
          rx={2}
        />
      </Svg>
    </View>
  );
}
