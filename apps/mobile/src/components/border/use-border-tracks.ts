import type { BorderCalculation, BorderLayoutInput } from '@dorkroom/logic';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { gridIndex } from '@/components/stage/edge-drag';
import { NO_DRAG, useEdgeTracks } from '@/components/stage/use-edge-pan';
import {
  BORDER_DRAG_STEP,
  type EdgePositions,
  edgePositionsByStep,
  minBorderRange,
  OFFSET_DRAG_STEP,
  pxPerStep,
} from './border-drag';

interface BorderTracksInput {
  layout: BorderLayoutInput;
  calculation: BorderCalculation;
  pxPerInch: number;
  /** The border the model uses now: where the next drag starts. */
  minBorder: number;
  active: SharedValue<number>;
  /** The image drag's gain, written beside the tables. */
  imageGain: SharedValue<number>;
  boxWidth: number;
}

/**
 * The four edges' position tables (see `edgePositionsByStep`) as shared values
 * for the pans, plus the index each starts from. The tables are rebuilt when
 * anything but the border changes (offsets move the edges too, so do ratio,
 * paper and orientation) and written only while no drag is live; a drag's end
 * re-renders the drawing, which writes any change that arrived mid-drag.
 */
export function useBorderTracks({
  layout,
  calculation,
  pxPerInch,
  minBorder,
  active,
  imageGain,
  boxWidth,
}: BorderTracksInput) {
  const tracks = useEdgeTracks();
  const {
    paperSize,
    lastValidCustomPaperWidth,
    lastValidCustomPaperHeight,
    aspectRatio,
    lastValidCustomAspectWidth,
    lastValidCustomAspectHeight,
    isLandscape,
    isRatioFlipped,
    enableOffset,
    horizontalOffset,
    verticalOffset,
    ignoreMinBorder,
  } = layout;
  const range = minBorderRange(calculation.paperWidth, calculation.paperHeight);
  const tables = useMemo(
    () =>
      edgePositionsByStep(
        {
          paperSize,
          lastValidCustomPaperWidth,
          lastValidCustomPaperHeight,
          aspectRatio,
          lastValidCustomAspectWidth,
          lastValidCustomAspectHeight,
          isLandscape,
          isRatioFlipped,
          minBorder: 0,
          lastValidMinBorder: 0,
          enableOffset,
          horizontalOffset,
          verticalOffset,
          ignoreMinBorder,
        },
        pxPerInch,
        { min: range.min, max: range.max }
      ),
    [
      paperSize,
      lastValidCustomPaperWidth,
      lastValidCustomPaperHeight,
      aspectRatio,
      lastValidCustomAspectWidth,
      lastValidCustomAspectHeight,
      isLandscape,
      isRatioFlipped,
      enableOffset,
      horizontalOffset,
      verticalOffset,
      ignoreMinBorder,
      pxPerInch,
      range.min,
      range.max,
    ]
  );
  const written = useRef<EdgePositions | null>(null);
  useLayoutEffect(() => {
    if (active.value !== NO_DRAG) return;
    if (written.current !== tables) {
      written.current = tables;
      tracks.positions.left.value = tables.left;
      tracks.positions.right.value = tables.right;
      tracks.positions.top.value = tables.top;
      tracks.positions.bottom.value = tables.bottom;
    }
    const index = gridIndex(
      minBorder,
      range.min,
      BORDER_DRAG_STEP,
      tables.count
    );
    tracks.startIndex.left.value = index;
    tracks.startIndex.right.value = index;
    tracks.startIndex.top.value = index;
    tracks.startIndex.bottom.value = index;
    imageGain.value = pxPerStep(
      boxWidth,
      calculation.paperWidth,
      OFFSET_DRAG_STEP
    );
  });
  return tracks;
}
