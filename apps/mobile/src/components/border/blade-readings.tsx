import type { BorderCalculation } from '@dorkroom/logic';
import { useState } from 'react';
import { type LayoutChangeEvent, Text, View } from 'react-native';
import {
  type BladeSide,
  bladeLabelOffset,
  computeBladeReadings,
} from './blade-readings-layout';
import { formatInches } from './format';

interface BladeReadingsProps {
  calculation: BorderCalculation;
  boxWidth: number;
  boxHeight: number;
}

type Size = { width: number; height: number };

/** Absolute-positioned blade-reading labels overlaid on the preview. */
export function BladeReadings({
  calculation,
  boxWidth,
  boxHeight,
}: BladeReadingsProps) {
  // Each label is centered on its anchor using its measured size, so opposing
  // labels (top/bottom, left/right) line up regardless of differing text.
  const [sizes, setSizes] = useState<Partial<Record<BladeSide, Size>>>({});
  const readings = computeBladeReadings(calculation, boxWidth, boxHeight);

  const measure = (side: BladeSide) => (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSizes((prev) => {
      const cur = prev[side];
      if (cur && cur.width === width && cur.height === height) return prev;
      return { ...prev, [side]: { width, height } };
    });
  };

  return (
    <View pointerEvents="none" className="absolute inset-0">
      {readings.map((r) => {
        const size = sizes[r.side];
        const offset = size
          ? bladeLabelOffset(r.side, r.isInside, size.width, size.height)
          : null;
        const isVertical = r.side === 'top' || r.side === 'bottom';
        return (
          <View
            key={r.side}
            onLayout={measure(r.side)}
            className="absolute items-center gap-0.5 rounded-md bg-black/70 px-2 py-1"
            style={{
              left: r.x,
              top: r.y,
              flexDirection: isVertical ? 'column' : 'row',
              // Hidden for the first frame until measured, then placed exactly.
              opacity: offset ? 1 : 0,
              transform: offset
                ? [
                    { translateX: offset.translateX },
                    { translateY: offset.translateY },
                  ]
                : undefined,
            }}
          >
            {r.arrowFirst && (
              <Text className="text-xs text-white">{r.arrow}</Text>
            )}
            <Text className="text-xs font-medium text-white">
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
