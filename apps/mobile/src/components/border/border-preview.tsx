import type { BorderCalculation } from '@dorkroom/logic';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { BladeReadings } from './blade-readings';
import { computePaperBox, computePrintRect } from './geometry';

const MAX_PREVIEW_HEIGHT = 320;
const BLADE_MIN_THICKNESS = 2;

interface BorderPreviewProps {
  calculation: BorderCalculation;
  showBlades: boolean;
  showBladeReadings: boolean;
}

/** Native paper/print/blade visualization (replaces the web CSS preview). */
export function BorderPreview({
  calculation,
  showBlades,
  showBladeReadings,
}: BorderPreviewProps) {
  const [containerWidth, setContainerWidth] = useState(0);

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
          className="overflow-hidden rounded-lg bg-white"
          style={{ width: box.width, height: box.height }}
        >
          <View
            className="absolute bg-neutral-700"
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
                className="absolute bg-neutral-950"
                style={{
                  left: print.left - bladeThickness,
                  top: 0,
                  width: bladeThickness,
                  height: box.height,
                }}
              />
              <View
                className="absolute bg-neutral-950"
                style={{
                  left: print.left + print.width,
                  top: 0,
                  width: bladeThickness,
                  height: box.height,
                }}
              />
              <View
                className="absolute bg-neutral-950"
                style={{
                  left: 0,
                  top: print.top - bladeThickness,
                  width: box.width,
                  height: bladeThickness,
                }}
              />
              <View
                className="absolute bg-neutral-950"
                style={{
                  left: 0,
                  top: print.top + print.height,
                  width: box.width,
                  height: bladeThickness,
                }}
              />
            </>
          )}
          {showBladeReadings && (
            <BladeReadings
              calculation={calculation}
              boxWidth={box.width}
              boxHeight={box.height}
            />
          )}
        </View>
      )}
    </View>
  );
}
