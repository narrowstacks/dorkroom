import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { usePhaseHue } from '@/theme/use-phase-accent';
import { withAlpha } from '@/theme/with-alpha';
import { type Edge, EDGE_HIT } from './edge-drag';
import { edgeBarRect, edgeHitRects, type EdgeRect } from './edge-geometry';
import { HIT_MIN_LEFT } from './stage-layout';
import { useEdgePan } from './use-edge-pan';

const BAR_THICKNESS = 4;
const EDGES: readonly Edge[] = ['left', 'right', 'top', 'bottom'];

/** What a drawing supplies for one of its edges. */
export interface EdgeHandlers {
  onBegin: () => void;
  onSteps: (steps: number) => void;
  onEnd?: () => void;
}

interface EdgeTargetProps {
  edge: Edge;
  slot: number;
  hit: EdgeRect;
  active: SharedValue<number>;
  positions: SharedValue<number[]>;
  startIndex: SharedValue<number>;
  handlers: EdgeHandlers;
}

function EdgeTarget({
  edge,
  slot,
  hit,
  active,
  positions,
  startIndex,
  handlers,
}: EdgeTargetProps) {
  const gesture = useEdgePan({
    edge,
    slot,
    active,
    positions,
    startIndex,
    onBegin: handlers.onBegin,
    onSteps: handlers.onSteps,
    onEnd: handlers.onEnd,
  });
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible={false}
        importantForAccessibility="no"
        style={{
          position: 'absolute',
          left: hit.left,
          top: hit.top,
          width: hit.width,
          height: hit.height,
        }}
      />
    </GestureDetector>
  );
}

interface EdgeHandlesProps {
  /** The edges' rectangle, in the drawing's coordinates. */
  rect: EdgeRect;
  active: SharedValue<number>;
  /** Each edge's inward position (px) per step of its value; read live by its pan. */
  positions: Record<Edge, SharedValue<number[]>>;
  /** Each edge's starting index into `positions`. */
  startIndex: Record<Edge, SharedValue<number>>;
  handlers: Record<Edge, EdgeHandlers>;
}

/**
 * The four draggable edges of a rectangle: a 44pt target for each, which stays
 * on its own side even when the rectangle is tiny (see `edgeHitRects`), and a
 * short bar in the phase hue on the edge itself so the gesture can be found. Not
 * accessibility elements: the drawing gives one summary, and every value stays
 * editable in the panel.
 */
export function EdgeHandles({
  rect,
  active,
  positions,
  startIndex,
  handlers,
}: EdgeHandlesProps) {
  const hue = usePhaseHue();
  const hits = edgeHitRects(rect, EDGE_HIT, HIT_MIN_LEFT);
  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      importantForAccessibility="no"
    >
      {EDGES.map((edge, slot) => (
        <EdgeTarget
          key={edge}
          edge={edge}
          slot={slot}
          hit={hits[edge]}
          active={active}
          positions={positions[edge]}
          startIndex={startIndex[edge]}
          handlers={handlers[edge]}
        />
      ))}
      {EDGES.map((edge) => {
        const bar = edgeBarRect(edge, rect, BAR_THICKNESS);
        return (
          <View
            key={edge}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: bar.left,
              top: bar.top,
              width: bar.width,
              height: bar.height,
              borderRadius: BAR_THICKNESS / 2,
              backgroundColor: hue,
              borderWidth: 1,
              borderColor: withAlpha('#000000', 0.35),
            }}
          />
        );
      })}
    </View>
  );
}
