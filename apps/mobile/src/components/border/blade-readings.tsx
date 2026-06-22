import type { BorderCalculation } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import {
  bladeLabelOffset,
  computeBladeReadings,
} from './blade-readings-layout';
import { formatInches } from './format';

interface BladeReadingsProps {
  calculation: BorderCalculation;
  boxWidth: number;
  boxHeight: number;
}

// Fixed label sizes (per orientation) keep each label's box stable as the
// reading text grows/shrinks (e.g. 1" -> 1.25"), so the labels don't jitter
// while dragging a slider. Equal widths also keep opposing labels aligned.
const ROW_LABEL = { width: 62, height: 24 }; // left / right (arrow beside value)
const COL_LABEL = { width: 50, height: 38 }; // top / bottom (arrow above/below)

/** Absolute-positioned blade-reading labels overlaid on the preview. */
export function BladeReadings({
  calculation,
  boxWidth,
  boxHeight,
}: BladeReadingsProps) {
  const readings = computeBladeReadings(calculation, boxWidth, boxHeight);

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {readings.map((r) => {
        const isVertical = r.side === 'top' || r.side === 'bottom';
        const dim = isVertical ? COL_LABEL : ROW_LABEL;
        const offset = bladeLabelOffset(
          r.side,
          r.isInside,
          dim.width,
          dim.height
        );
        return (
          <View
            key={r.side}
            className="absolute items-center justify-center gap-0.5 rounded-md bg-black/70"
            style={{
              left: r.x,
              top: r.y,
              width: dim.width,
              height: dim.height,
              flexDirection: isVertical ? 'column' : 'row',
              transform: [
                { translateX: offset.translateX },
                { translateY: offset.translateY },
              ],
            }}
          >
            {r.arrowFirst && (
              <Text className="text-xs text-white">{r.arrow}</Text>
            )}
            <Text numberOfLines={1} className="text-xs font-medium text-white">
              {formatInches(r.reading)}
            </Text>
            {!r.arrowFirst && (
              <Text className="text-xs text-white">{r.arrow}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
