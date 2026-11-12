import { useMemo, useState } from 'react';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  type Edge,
  EDGE_AXIS,
  EDGE_SLOP,
  nearestStep,
  stepsFromDelta,
} from './edge-drag';
import { panGesture } from './gestures';

/** The `active` value while no drag owns the drawing. */
export const NO_DRAG = -1;

/**
 * One value for a whole drawing: which handle's drag is live. A second finger
 * on another handle sees it taken and does nothing, so two pans never share
 * the one starting value the JS side keeps.
 */
export function useActiveDrag(): SharedValue<number> {
  return useSharedValue(NO_DRAG);
}

/** The shared values a drawing keeps for its four edges' position tables. */
export interface EdgeTracks {
  positions: Record<Edge, SharedValue<number[]>>;
  startIndex: Record<Edge, SharedValue<number>>;
}

/** Four position tables and starting indexes, made once for a drawing. */
export function useEdgeTracks(): EdgeTracks {
  const lp = useSharedValue<number[]>([]);
  const rp = useSharedValue<number[]>([]);
  const tp = useSharedValue<number[]>([]);
  const bp = useSharedValue<number[]>([]);
  const li = useSharedValue(0);
  const ri = useSharedValue(0);
  const ti = useSharedValue(0);
  const bi = useSharedValue(0);
  const [tracks] = useState<EdgeTracks>(() => ({
    positions: { left: lp, right: rp, top: tp, bottom: bp },
    startIndex: { left: li, right: ri, top: ti, bottom: bi },
  }));
  return tracks;
}

interface EdgePanInput {
  edge: Edge;
  /** This handle's slot in `active`: distinct for every gesture on the drawing. */
  slot: number;
  active: SharedValue<number>;
  /**
   * The edge's inward position (px) for every step of its value. Usually
   * ascending, but an edge pinned by a limit can turn back (see `nearestStep`).
   * Shared values so a drawing can rebuild them between drags without
   * rebuilding the gesture; keep them still while a drag runs.
   */
  positions: SharedValue<number[]>;
  /** The index in `positions` of the value the next drag starts from. */
  startIndex: SharedValue<number>;
  /** A drag began: JS reads the value it will count steps from. */
  onBegin: () => void;
  /** The whole-step count changed; positive is inward. Once per step. */
  onSteps: (steps: number) => void;
  /** The drag ended or was cancelled. */
  onEnd?: () => void;
}

/**
 * A pan along one edge's axis. It runs on the UI thread and tells JS only when
 * the whole-step count changes, like the scrub ruler. Moves across the other
 * axis fail it, so the panel keeps its own drag.
 */
export function useEdgePan({
  edge,
  slot,
  active,
  positions,
  startIndex,
  onBegin,
  onSteps,
  onEnd,
}: EdgePanInput) {
  const lastSteps = useSharedValue(0);
  const mine = useSharedValue(false);
  const downX = useSharedValue(0);
  const downY = useSharedValue(0);
  const fromIndex = useSharedValue(0);
  return useMemo(() => {
    const { axis, inward } = EDGE_AXIS[edge];
    // iOS resets a pan's translation when it activates, so travel is counted
    // from where the finger touched down (`absolute - down`), not from there.
    const pan = panGesture()
      .maxPointers(1)
      .onBegin((event) => {
        'worklet';
        downX.value = event.absoluteX;
        downY.value = event.absoluteY;
      })
      .onStart(() => {
        'worklet';
        if (active.value !== NO_DRAG) return;
        active.value = slot;
        mine.value = true;
        lastSteps.value = 0;
        fromIndex.value = startIndex.value;
        scheduleOnRN(onBegin);
      });
    const along =
      axis === 'x'
        ? pan.activeOffsetX([-EDGE_SLOP, EDGE_SLOP]).failOffsetY([-12, 12])
        : pan.activeOffsetY([-EDGE_SLOP, EDGE_SLOP]).failOffsetX([-12, 12]);
    return along
      .onUpdate((event) => {
        'worklet';
        if (!mine.value) return;
        const travel =
          axis === 'x'
            ? event.absoluteX - downX.value
            : event.absoluteY - downY.value;
        const steps = nearestStep(
          positions.value,
          fromIndex.value,
          travel * inward,
          lastSteps.value
        );
        if (steps !== lastSteps.value) {
          lastSteps.value = steps;
          scheduleOnRN(onSteps, steps);
        }
      })
      .onFinalize(() => {
        'worklet';
        if (!mine.value) return;
        mine.value = false;
        active.value = NO_DRAG;
        // The next touch may land before the drawing re-renders: start it from
        // where this one ended (the refresh writes the same value).
        const last = Math.min(
          Math.max(fromIndex.value + lastSteps.value, 0),
          Math.max(positions.value.length - 1, 0)
        );
        startIndex.value = last;
        if (onEnd) scheduleOnRN(onEnd);
      });
  }, [
    edge,
    slot,
    active,
    positions,
    startIndex,
    onBegin,
    onSteps,
    onEnd,
    lastSteps,
    mine,
    downX,
    downY,
    fromIndex,
  ]);
}

interface AreaPanInput {
  slot: number;
  active: SharedValue<number>;
  pxPerStep: SharedValue<number>;
  enabled: boolean;
  onBegin: () => void;
  /** Whole steps along x (right positive) and y (down positive). */
  onSteps: (stepsX: number, stepsY: number) => void;
  onEnd?: () => void;
}

/** A pan in any direction, for moving something inside the drawing. */
export function useAreaPan({
  slot,
  active,
  pxPerStep,
  enabled,
  onBegin,
  onSteps,
  onEnd,
}: AreaPanInput) {
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const mine = useSharedValue(false);
  const downX = useSharedValue(0);
  const downY = useSharedValue(0);
  return useMemo(
    () =>
      panGesture()
        .maxPointers(1)
        .enabled(enabled)
        .onBegin((event) => {
          'worklet';
          downX.value = event.absoluteX;
          downY.value = event.absoluteY;
        })
        .activeOffsetX([-EDGE_SLOP, EDGE_SLOP])
        .activeOffsetY([-EDGE_SLOP, EDGE_SLOP])
        .onStart(() => {
          'worklet';
          if (active.value !== NO_DRAG) return;
          active.value = slot;
          mine.value = true;
          lastX.value = 0;
          lastY.value = 0;
          scheduleOnRN(onBegin);
        })
        .onUpdate((event) => {
          'worklet';
          if (!mine.value) return;
          const sx = stepsFromDelta(
            event.absoluteX - downX.value,
            pxPerStep.value
          );
          const sy = stepsFromDelta(
            event.absoluteY - downY.value,
            pxPerStep.value
          );
          if (sx !== lastX.value || sy !== lastY.value) {
            lastX.value = sx;
            lastY.value = sy;
            scheduleOnRN(onSteps, sx, sy);
          }
        })
        .onFinalize(() => {
          'worklet';
          if (!mine.value) return;
          mine.value = false;
          active.value = NO_DRAG;
          if (onEnd) scheduleOnRN(onEnd);
        }),
    [
      slot,
      active,
      pxPerStep,
      enabled,
      onBegin,
      onSteps,
      onEnd,
      lastX,
      lastY,
      mine,
      downX,
      downY,
    ]
  );
}
