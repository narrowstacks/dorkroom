import type { BorderCalculation, MeasurementUnit } from '@dorkroom/logic';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SAFELIGHT } from '@/theme/safelight';
import { BladeReadings } from './blade-readings';
import { computePaperBox, computePrintRect } from './geometry';

const MAX_PREVIEW_HEIGHT = 320;
const BLADE_MIN_THICKNESS = 2;

interface BorderPreviewProps {
  calculation: BorderCalculation;
  showBlades: boolean;
  showBladeReadings: boolean;
  unit: MeasurementUnit;
}

/** Native paper/print/blade visualization (replaces the web CSS preview). */
export function BorderPreview({
  calculation,
  showBlades,
  showBladeReadings,
  unit,
}: BorderPreviewProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const { on: safelight } = useSafelight();
  const blade = safelight ? styles.bladeSafelight : styles.blade;

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const box = computePaperBox(
    calculation.paperWidth,
    calculation.paperHeight,
    containerWidth,
    MAX_PREVIEW_HEIGHT
  );
  const print = computePrintRect(calculation, box);
  const bladeThickness = Math.max(
    calculation.bladeThickness,
    BLADE_MIN_THICKNESS
  );

  return (
    <View onLayout={onLayout} className="items-center">
      {box.width > 0 && (
        <View
          className="overflow-hidden rounded-lg bg-paper"
          style={{ width: box.width, height: box.height }}
        >
          <View
            className="absolute border-hw border-line bg-paper-print"
            style={{
              left: print.left,
              top: print.top,
              width: print.width,
              height: print.height,
            }}
          />
          {showBlades && (
            // Blades sit in the border, inner edge flush with the print edge
            // (they mask the paper down to the image — they don't cover it).
            <>
              <View
                style={[
                  blade,
                  {
                    left: print.left - bladeThickness,
                    top: 0,
                    width: bladeThickness,
                    height: box.height,
                  },
                ]}
              />
              <View
                style={[
                  blade,
                  {
                    left: print.left + print.width,
                    top: 0,
                    width: bladeThickness,
                    height: box.height,
                  },
                ]}
              />
              <View
                style={[
                  blade,
                  {
                    left: 0,
                    top: print.top - bladeThickness,
                    width: box.width,
                    height: bladeThickness,
                  },
                ]}
              />
              <View
                style={[
                  blade,
                  {
                    left: 0,
                    top: print.top + print.height,
                    width: box.width,
                    height: bladeThickness,
                  },
                ]}
              />
            </>
          )}
          {showBladeReadings && (
            <BladeReadings
              calculation={calculation}
              boxWidth={box.width}
              boxHeight={box.height}
              unit={unit}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches the web preview's dark-theme blade: a brighter-than-black grey
  // with a soft drop shadow (--blade-background #1b1b1d, --blade-shadow
  // 0 2px 4px rgba(0,0,0,0.3)).
  // Safelight mode: a black blade with a bright edge, so it reads on the dim
  // paper and against the black image area.
  bladeSafelight: {
    position: 'absolute',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: SAFELIGHT.outlineSelected,
  },
  blade: {
    position: 'absolute',
    backgroundColor: '#1b1b1d',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
  },
});
