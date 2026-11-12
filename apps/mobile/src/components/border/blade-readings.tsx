import type { MeasurementUnit } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import {
  READING_MAX_FONT_SCALE,
  type ReadingsLayout,
} from './blade-readings-layout';
import { formatLength } from './format';

interface BladeReadingsProps {
  layout: ReadingsLayout;
  unit: MeasurementUnit;
}

/** The blade readings, each on the edge it describes. Not interactive. */
export function BladeReadings({ layout, unit }: BladeReadingsProps) {
  const full = layout.form === 'full';
  return (
    <View pointerEvents="none" accessible={false} className="absolute inset-0">
      {layout.readings.map((r) => {
        const vertical = r.side === 'top' || r.side === 'bottom';
        const text = formatLength(r.reading, unit);
        return (
          <View
            key={r.side}
            className="absolute items-center justify-center gap-0.5 rounded-md bg-black/70"
            style={{
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
              flexDirection: vertical ? 'column' : 'row',
            }}
          >
            {full && r.arrowFirst ? (
              <Text
                maxFontSizeMultiplier={READING_MAX_FONT_SCALE}
                className="text-xs text-white"
              >
                {r.arrow}
              </Text>
            ) : null}
            {/* A long reading ("-12.7cm") steps down a size rather than relying on
                font fitting, which shrank a label to nothing in a column. */}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={READING_MAX_FONT_SCALE}
              className="font-medium text-white"
              style={{ fontSize: text.length > 7 ? 10 : 12 }}
            >
              {text}
            </Text>
            {full && !r.arrowFirst ? (
              <Text
                maxFontSizeMultiplier={READING_MAX_FONT_SCALE}
                className="text-xs text-white"
              >
                {r.arrow}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
