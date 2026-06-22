import type { BorderCalculation } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { computeBladeReadings } from './blade-readings-layout';
import { formatInches } from './format';

interface BladeReadingsProps {
  calculation: BorderCalculation;
  boxWidth: number;
  boxHeight: number;
}

/** Absolute-positioned blade-reading labels overlaid on the preview. */
export function BladeReadings({
  calculation,
  boxWidth,
  boxHeight,
}: BladeReadingsProps) {
  const readings = computeBladeReadings(calculation, boxWidth, boxHeight);
  return (
    <View pointerEvents="none" className="absolute inset-0">
      {readings.map((r) => (
        <View
          key={r.side}
          className="absolute items-center gap-0.5 rounded-md bg-black/70 px-2 py-1"
          style={{
            left: r.x,
            top: r.y,
            flexDirection:
              r.side === 'top' || r.side === 'bottom' ? 'column' : 'row',
            transform: [
              { translateX: r.translateX },
              { translateY: r.translateY },
            ],
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
      ))}
    </View>
  );
}
