import { matBorderToInput, type UseMatCalculatorReturn } from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { type Edge, valueFromSteps } from '@/components/stage/edge-drag';
import { EdgeHandles } from '@/components/stage/edge-handle';
import {
  CAPTION_MAX_FONT_SCALE,
  DRAWING_CAPTION_HEIGHT,
  type Size,
  STAGE_BLEED,
} from '@/components/stage/stage-layout';
import {
  NO_DRAG,
  useActiveDrag,
  useEdgeTracks,
} from '@/components/stage/use-edge-pan';
import { usePhaseHue } from '@/theme/use-phase-accent';
import { withAlpha } from '@/theme/with-alpha';
import {
  borderLabelFits,
  computeMatPreviewGeometry,
  type MatPreviewGeometry,
  type MatRect,
  windowLabelFits,
} from './geometry';
import {
  BORDER_KEY,
  matBorderOf,
  matBorderRange,
  matDragStep,
  matEdgeTrack,
} from './mat-drag';

type MatDrawingState = Pick<
  UseMatCalculatorReturn,
  | 'valid'
  | 'revealMode'
  | 'ow'
  | 'oh'
  | 'bt'
  | 'bb'
  | 'bl'
  | 'br'
  | 'aw'
  | 'ah'
  | 'windowW'
  | 'windowH'
  | 'fmt'
  | 'set'
>;

interface MatDrawingProps extends MatDrawingState {
  stage: Size;
  /** The first warning, drawn under the caption. */
  warning?: string;
}

/** A rectangle placed in the drawing, which has `STAGE_BLEED` around the board. */
function rectStyle(rect: MatRect): ViewStyle {
  return {
    position: 'absolute',
    left: rect.left + STAGE_BLEED,
    top: rect.top + STAGE_BLEED,
    width: rect.width,
    height: rect.height,
  };
}

interface Band {
  rect: MatRect;
  thickness: number;
}

/** The band of board an edge's border fills, and how thick it is. */
function bandOf(geometry: MatPreviewGeometry, edge: Edge): Band {
  const { board, window } = geometry;
  switch (edge) {
    case 'top': {
      const height = window.top - board.top;
      return {
        rect: {
          left: window.left,
          top: board.top,
          width: window.width,
          height,
        },
        thickness: height,
      };
    }
    case 'bottom': {
      const top = window.top + window.height;
      const height = board.top + board.height - top;
      return {
        rect: { left: window.left, top, width: window.width, height },
        thickness: height,
      };
    }
    case 'left': {
      const width = window.left - board.left;
      return {
        rect: {
          left: board.left,
          top: window.top,
          width,
          height: window.height,
        },
        thickness: width,
      };
    }
    case 'right': {
      const left = window.left + window.width;
      const width = board.left + board.width - left;
      return {
        rect: { left, top: window.top, width, height: window.height },
        thickness: width,
      };
    }
  }
}

/** The widest a label's text needs, in px. */
const LABEL_MIN_WIDTH = 64;

function widenForLabel(rect: MatRect, edge: Edge): MatRect {
  if ((edge !== 'top' && edge !== 'bottom') || rect.width >= LABEL_MIN_WIDTH) {
    return rect;
  }
  return {
    ...rect,
    left: rect.left + (rect.width - LABEL_MIN_WIDTH) / 2,
    width: LABEL_MIN_WIDTH,
  };
}

interface BorderLabelProps {
  geometry: MatPreviewGeometry;
  edge: Edge;
  value: string;
}

/** A border's value, centred in the band it describes. Hidden when the band is too thin. */
function BorderLabel({ geometry, edge, value }: BorderLabelProps) {
  const { thickness, ...band } = bandOf(geometry, edge);
  const along =
    edge === 'left' || edge === 'right' ? band.rect.height : band.rect.width;
  if (!borderLabelFits(edge, thickness, along)) return null;
  // A top or bottom label may be wider than a narrow window: it keeps the
  // window's centre but takes room for its text.
  const rect = widenForLabel(band.rect, edge);
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={rectStyle(rect)}
      className="items-center justify-center overflow-hidden px-0.5"
    >
      <Text
        accessible={false}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        className="text-xs font-semibold text-paper-ink"
      >
        {value}
      </Text>
    </View>
  );
}

const EDGES: readonly Edge[] = ['left', 'right', 'top', 'bottom'];

interface Latest {
  layout: {
    ow: number;
    oh: number;
    bt: number;
    bb: number;
    bl: number;
    br: number;
  };
  step: number;
  set: UseMatCalculatorReturn['set'];
}

interface Written {
  start: number;
  last: number;
}

/**
 * The mat drawing, fitted into the stage and held still: the board, the window,
 * the artwork footprint in reveal mode, each border's value in its own band and
 * the window size in the middle (in the caption when the window is too small
 * for it). Dragging a window edge moves that side's border on a grid that
 * coarsens on a small drawing (see `matDragStep`); the pan runs on the UI thread
 * and tells this component once per step. One accessible element carries the
 * summary; every value is also editable in the panel.
 */
export function MatDrawing({
  stage,
  warning,
  valid,
  revealMode,
  ow,
  oh,
  bt,
  bb,
  bl,
  br,
  aw,
  ah,
  windowW,
  windowH,
  fmt,
  set,
}: MatDrawingProps) {
  const hue = usePhaseHue();
  const geometry = computeMatPreviewGeometry({
    outerWidth: ow,
    outerHeight: oh,
    borderTop: bt,
    borderBottom: bb,
    borderLeft: bl,
    borderRight: br,
    artworkWidth: aw,
    artworkHeight: ah,
    revealMode,
    valid,
    availableWidth: stage.width,
    maxHeight: stage.height - DRAWING_CAPTION_HEIGHT,
  });
  const step = geometry ? matDragStep(geometry.scale) : 0;

  const latest = useRef<Latest | null>(null);
  useLayoutEffect(() => {
    latest.current = { layout: { ow, oh, bt, bb, bl, br }, step, set };
  });

  // Each edge's inward positions, linear because a border moves 1:1 with the
  // finger on a grid of `step`. Read live by each pan, so they are only
  // rewritten while nothing is being dragged.
  const active = useActiveDrag();
  const tracks = useEdgeTracks();
  // A drag's last step redraws while it is still live, so rewrite on its end.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const scale = geometry?.scale ?? 0;
  const edgeTracks = useMemo(
    () => ({
      left: matEdgeTrack('left', { ow, oh, bt, bb, bl, br }, step, scale),
      right: matEdgeTrack('right', { ow, oh, bt, bb, bl, br }, step, scale),
      top: matEdgeTrack('top', { ow, oh, bt, bb, bl, br }, step, scale),
      bottom: matEdgeTrack('bottom', { ow, oh, bt, bb, bl, br }, step, scale),
    }),
    [ow, oh, bt, bb, bl, br, step, scale]
  );
  const writtenTracks = useRef<typeof edgeTracks | null>(null);
  useLayoutEffect(() => {
    if (active.value !== NO_DRAG || writtenTracks.current === edgeTracks) {
      return;
    }
    writtenTracks.current = edgeTracks;
    for (const edge of EDGES) {
      tracks.positions[edge].value = edgeTracks[edge].positions;
      tracks.startIndex[edge].value = edgeTracks[edge].startIndex;
    }
  });

  // Made once, so a redraw per step never rebuilds a gesture mid-drag.
  const [handlers] = useState(() => {
    const written: Written = { start: 0, last: 0 };
    const make = (edge: Edge) => ({
      onBegin: () => {
        const now = latest.current;
        if (!now) return;
        written.start = matBorderOf(edge, now.layout);
        written.last = written.start;
      },
      onSteps: (steps: number) => {
        const now = latest.current;
        if (!now || now.step <= 0) return;
        const next = valueFromSteps({
          start: written.start,
          steps,
          step: now.step,
          ...matBorderRange(edge, now.layout),
        });
        // At a bound the value stops changing: no more ticks or redraws.
        if (next === written.last) return;
        written.last = next;
        Haptics.selectionAsync();
        now.set(BORDER_KEY[edge], matBorderToInput(next));
      },
      onEnd: refresh,
    });
    return {
      left: make('left'),
      right: make('right'),
      top: make('top'),
      bottom: make('bottom'),
    };
  });

  if (!geometry) {
    return (
      <View
        accessible
        accessibilityLabel="Mat preview. Enter a valid mat and borders."
        style={{ width: stage.width }}
        className="h-56 items-center justify-center rounded-lg border-hw border-line bg-surface-dim"
      >
        <Text accessible={false} className="text-sm text-ink-50">
          Enter a valid mat and borders.
        </Text>
      </View>
    );
  }

  const caption = `Window ${fmt(windowW)} × ${fmt(windowH)}`;
  const spokenWarning = warning
    ? ` Warning: ${warning.replace(/\n/g, ' ')}`
    : '';
  const summary = `Mat preview, outer mat ${fmt(ow)} by ${fmt(oh)}, window ${fmt(
    windowW
  )} by ${fmt(windowH)}. Borders top ${fmt(bt)}, bottom ${fmt(bb)}, left ${fmt(bl)}, right ${fmt(br)}.${spokenWarning}`;
  const windowRect = {
    left: geometry.window.left + STAGE_BLEED,
    top: geometry.window.top + STAGE_BLEED,
    width: geometry.window.width,
    height: geometry.window.height,
  };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      accessibilityHint="Drag a window edge to change that border. Exact values are in the controls."
      style={{
        width: stage.width + 2 * STAGE_BLEED,
        height:
          geometry.board.height + DRAWING_CAPTION_HEIGHT + 2 * STAGE_BLEED,
      }}
    >
      <View
        accessible={false}
        style={rectStyle(geometry.board)}
        className="absolute overflow-hidden rounded-lg bg-paper"
      />
      {geometry.artwork ? (
        <View
          accessible={false}
          className="absolute"
          style={[
            rectStyle(geometry.artwork),
            { backgroundColor: withAlpha(hue, 0.2) },
          ]}
        />
      ) : null}
      <View
        accessible={false}
        style={[rectStyle(geometry.window), { borderColor: hue }]}
        className="absolute border bg-window"
      />
      {windowLabelFits(geometry.window) ? (
        <View
          accessible={false}
          pointerEvents="none"
          style={rectStyle(geometry.window)}
          className="items-center justify-center px-1"
        >
          <Text
            accessible={false}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            className="text-center text-xs font-semibold text-ink-70"
          >
            {fmt(windowW)} × {fmt(windowH)}
          </Text>
        </View>
      ) : null}
      <BorderLabel geometry={geometry} edge="top" value={fmt(bt)} />
      <BorderLabel geometry={geometry} edge="bottom" value={fmt(bb)} />
      <BorderLabel geometry={geometry} edge="left" value={fmt(bl)} />
      <BorderLabel geometry={geometry} edge="right" value={fmt(br)} />
      <EdgeHandles
        rect={windowRect}
        active={active}
        positions={tracks.positions}
        startIndex={tracks.startIndex}
        handlers={handlers}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: geometry.board.height + 2 * STAGE_BLEED,
          height: DRAWING_CAPTION_HEIGHT,
          justifyContent: 'center',
        }}
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
