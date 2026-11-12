import type {
  BorderCalculation,
  BorderLayoutInput,
  MeasurementUnit,
} from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { EDGE_HIT, valueFromSteps } from '@/components/stage/edge-drag';
import { EdgeHandles } from '@/components/stage/edge-handle';
import {
  CAPTION_MAX_FONT_SCALE,
  DRAWING_CAPTION_HEIGHT,
  type Size,
  STAGE_BLEED,
} from '@/components/stage/stage-layout';
import { useActiveDrag, useAreaPan } from '@/components/stage/use-edge-pan';
import { SAFELIGHT } from '@/theme/safelight';
import { BladeReadings } from './blade-readings';
import { layoutReadings } from './blade-readings-layout';
import {
  BORDER_DRAG_STEP,
  minBorderRange,
  offsetRanges,
  offsetsAfterDrag,
  type Range,
} from './border-drag';
import {
  formatBladeReadings,
  formatBorders,
  formatPreviewCaption,
  formatSpokenCaption,
} from './format';
import { computePaperBox, computePrintRect } from './geometry';
import { useBorderTracks } from './use-border-tracks';

const BLADE_MIN_THICKNESS = 2;
/** The slot of the drag inside the image, after the four edges' (0 to 3). */
const IMAGE_SLOT = 4;

interface BorderDrawingProps {
  stage: Size;
  calculation: BorderCalculation;
  /** What the layout was computed from: the current border, offsets and shape. */
  layout: BorderLayoutInput;
  paperLabel: string;
  unit: MeasurementUnit;
  showBlades: boolean;
  showBladeReadings: boolean;
  /** The first warning, drawn under the caption and spoken with the drawing. */
  warning?: string;
  onMinBorder: (inches: number) => void;
  onOffsets: (horizontal: number, vertical: number) => void;
}

interface Latest {
  /** The border the model uses (it falls back to the last valid one). */
  minBorder: number;
  borderRange: Range;
  offsetH: number;
  offsetV: number;
  ranges: { h: Range; v: Range };
  onMinBorder: (inches: number) => void;
  onOffsets: (horizontal: number, vertical: number) => void;
}

/**
 * The easel drawing, fitted into the stage and held still. Each blade reading
 * sits on the edge it describes, and the edges can be dragged: any edge moves
 * the minimum border (the slider's own step and bounds), and with offsets on,
 * dragging inside the image moves it. Each edge has its own gain, read from the
 * real layout, so the edge under the finger follows it. The pans run on the UI
 * thread and tell this component once per step, so the drawing redraws per step,
 * never per frame. It is one accessible element; every value is also in the panel.
 */
export function BorderDrawing({
  stage,
  calculation,
  layout,
  paperLabel,
  unit,
  showBlades,
  showBladeReadings,
  warning,
  onMinBorder,
  onOffsets,
}: BorderDrawingProps) {
  const { on: safelight } = useSafelight();
  const blade = safelight ? styles.bladeSafelight : styles.blade;
  const box = computePaperBox(
    calculation.paperWidth,
    calculation.paperHeight,
    stage.width,
    stage.height - DRAWING_CAPTION_HEIGHT
  );
  const print = computePrintRect(calculation, box);
  const bladeThickness = Math.max(
    calculation.bladeThickness,
    BLADE_MIN_THICKNESS
  );
  const { fontScale } = useWindowDimensions();
  const readings = layoutReadings(
    calculation,
    box.width,
    box.height,
    fontScale
  );
  const pxPerInch =
    calculation.paperWidth > 0 ? box.width / calculation.paperWidth : 0;

  // The border the model actually uses, and the offsets it actually draws.
  const minBorder = calculation.lastValidMinBorder;
  const ranges = offsetRanges({
    paperWidth: calculation.paperWidth,
    paperHeight: calculation.paperHeight,
    printWidth: calculation.printWidth,
    printHeight: calculation.printHeight,
    minBorder,
    ignoreMinBorder: layout.ignoreMinBorder,
  });

  const latest = useRef<Latest | null>(null);
  useLayoutEffect(() => {
    latest.current = {
      minBorder,
      borderRange: minBorderRange(
        calculation.paperWidth,
        calculation.paperHeight
      ),
      offsetH: calculation.clampedHorizontalOffset,
      offsetV: calculation.clampedVerticalOffset,
      ranges,
      onMinBorder,
      onOffsets,
    };
  });

  // Which handle's drag is live, and each edge's position table. A pan reads
  // them live, so they are only rewritten while nothing is being dragged.
  const active = useActiveDrag();
  const imageGain = useSharedValue(1);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const tracks = useBorderTracks({
    layout,
    calculation,
    pxPerInch,
    minBorder,
    active,
    imageGain,
    boxWidth: box.width,
  });

  // What this drag last wrote, so two steps before a commit cannot stick one off.
  const start = useRef({ minBorder: 0, h: 0, v: 0 });
  const lastWritten = useRef({ minBorder: 0, h: 0, v: 0 });

  const [handlers] = useState(() => {
    const edge = {
      onBegin: () => {
        const now = latest.current;
        if (!now) return;
        start.current.minBorder = now.minBorder;
        lastWritten.current.minBorder = now.minBorder;
      },
      onSteps: (steps: number) => {
        const now = latest.current;
        if (!now) return;
        const next = valueFromSteps({
          start: start.current.minBorder,
          steps,
          step: BORDER_DRAG_STEP,
          ...now.borderRange,
        });
        // At a bound the value stops changing, so the ticks and redraws stop too.
        if (next === lastWritten.current.minBorder) return;
        lastWritten.current.minBorder = next;
        Haptics.selectionAsync();
        now.onMinBorder(next);
      },
      onEnd: refresh,
    };
    return { left: edge, right: edge, top: edge, bottom: edge };
  });

  const onImageBegin = useCallback(() => {
    const now = latest.current;
    if (!now) return;
    start.current.h = now.offsetH;
    start.current.v = now.offsetV;
    lastWritten.current.h = now.offsetH;
    lastWritten.current.v = now.offsetV;
  }, []);
  const onImageSteps = useCallback((stepsX: number, stepsY: number) => {
    const now = latest.current;
    if (!now) return;
    const next = offsetsAfterDrag({
      start: start.current,
      stepsX,
      stepsY,
      ranges: now.ranges,
    });
    if (next.h === lastWritten.current.h && next.v === lastWritten.current.v) {
      return;
    }
    lastWritten.current.h = next.h;
    lastWritten.current.v = next.v;
    Haptics.selectionAsync();
    now.onOffsets(next.h, next.v);
  }, []);
  const imageGesture = useAreaPan({
    slot: IMAGE_SLOT,
    active,
    pxPerStep: imageGain,
    enabled: layout.enableOffset,
    onBegin: onImageBegin,
    onSteps: onImageSteps,
    onEnd: refresh,
  });

  if (box.width <= 0) return null;
  const caption = formatPreviewCaption(calculation, paperLabel, unit);
  const spokenWarning = warning
    ? ` Warning: ${warning.replace(/\n/g, ' ')}`
    : '';
  const label = `${formatSpokenCaption(calculation, paperLabel, unit)}. ${formatBorders(calculation, unit)}. ${formatBladeReadings(calculation, unit)}.${spokenWarning}`;
  // The edges' rectangle, in coordinates that include the bleed around the paper.
  const printRect = {
    left: print.left + STAGE_BLEED,
    top: print.top + STAGE_BLEED,
    width: print.width,
    height: print.height,
  };
  const inner = EDGE_HIT / 2;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityHint="Drag an edge to change the minimum border. Exact values are in the controls."
      style={{
        width: box.width + 2 * STAGE_BLEED,
        height: box.height + 2 * STAGE_BLEED + DRAWING_CAPTION_HEIGHT,
        padding: STAGE_BLEED,
      }}
    >
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
        {showBlades ? (
          // Blades sit in the border, inner edge flush with the print edge
          // (they mask the paper down to the image; they don't cover it).
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
        ) : null}
        {showBladeReadings ? (
          <BladeReadings layout={readings} unit={unit} />
        ) : null}
      </View>
      <View
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
        importantForAccessibility="no"
      >
        {layout.enableOffset ? (
          <GestureDetector gesture={imageGesture}>
            <View
              accessible={false}
              style={{
                position: 'absolute',
                left: printRect.left + inner,
                top: printRect.top + inner,
                width: Math.max(0, printRect.width - 2 * inner),
                height: Math.max(0, printRect.height - 2 * inner),
              }}
            />
          </GestureDetector>
        ) : null}
        <EdgeHandles
          rect={printRect}
          active={active}
          positions={tracks.positions}
          startIndex={tracks.startIndex}
          handlers={handlers}
        />
      </View>
      <View
        pointerEvents="none"
        style={{ height: DRAWING_CAPTION_HEIGHT, justifyContent: 'center' }}
      >
        <Text
          accessible={false}
          numberOfLines={1}
          maxFontSizeMultiplier={CAPTION_MAX_FONT_SCALE}
          className="text-center text-sm text-ink-60"
        >
          {caption}
        </Text>
        {warning ? (
          <Text
            accessible={false}
            numberOfLines={2}
            maxFontSizeMultiplier={CAPTION_MAX_FONT_SCALE}
            className="text-center text-xs text-amber-400"
          >
            {`⚠ ${warning}`}
          </Text>
        ) : null}
      </View>
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
