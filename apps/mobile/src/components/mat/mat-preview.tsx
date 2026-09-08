import type { UseMatCalculatorReturn } from '@dorkroom/logic';
import { useState } from 'react';
import {
  type LayoutChangeEvent,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {
  computeMatPreviewGeometry,
  type MatPreviewGeometry,
  type MatRect,
} from './geometry';

const MAX_PREVIEW_HEIGHT = 320;

type MatPreviewProps = Pick<
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
>;

function rectStyle(rect: MatRect): ViewStyle {
  return {
    position: 'absolute',
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function borderLabelStyle(
  geometry: MatPreviewGeometry,
  edge: 'top' | 'bottom' | 'left' | 'right'
): ViewStyle {
  const { board, window } = geometry;

  switch (edge) {
    case 'top':
      return {
        position: 'absolute',
        left: window.left,
        top: board.top,
        width: window.width,
        height: window.top - board.top,
      };
    case 'bottom':
      return {
        position: 'absolute',
        left: window.left,
        top: window.top + window.height,
        width: window.width,
        height: board.height - (window.top + window.height),
      };
    case 'left':
      return {
        position: 'absolute',
        left: board.left,
        top: window.top,
        width: window.left - board.left,
        height: window.height,
      };
    case 'right':
      return {
        position: 'absolute',
        left: window.left + window.width,
        top: window.top,
        width: board.width - (window.left + window.width - board.left),
        height: window.height,
      };
  }
}

interface BorderLabelProps {
  geometry: MatPreviewGeometry;
  edge: 'top' | 'bottom' | 'left' | 'right';
  value: string;
}

function BorderLabel({ geometry, edge, value }: BorderLabelProps) {
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={borderLabelStyle(geometry, edge)}
      className="items-center justify-center overflow-hidden px-0.5"
    >
      <Text
        accessible={false}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        className="text-xs font-semibold text-black/70"
      >
        {value}
      </Text>
    </View>
  );
}

/** Proportional native rendering of the outer board, opening, and artwork. */
export function MatPreview({
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
}: MatPreviewProps) {
  const [availableWidth, setAvailableWidth] = useState(0);
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
    availableWidth,
    maxHeight: MAX_PREVIEW_HEIGHT,
  });

  const onLayout = (event: LayoutChangeEvent) => {
    setAvailableWidth(event.nativeEvent.layout.width);
  };

  const summary = `Mat preview, outer mat ${fmt(ow)} by ${fmt(oh)}, window ${fmt(
    windowW
  )} by ${fmt(windowH)}.`;

  return (
    <View
      accessible
      accessibilityLabel={summary}
      onLayout={onLayout}
      className="items-center"
    >
      {geometry ? (
        <View
          accessible={false}
          style={{ width: availableWidth, height: geometry.board.height }}
        >
          <View
            accessible={false}
            style={rectStyle(geometry.board)}
            className="absolute overflow-hidden rounded-lg bg-neutral-400"
          />
          {geometry.artwork ? (
            <View
              accessible={false}
              style={rectStyle(geometry.artwork)}
              className="absolute bg-cyan-400/20"
            />
          ) : null}
          <View
            accessible={false}
            style={rectStyle(geometry.window)}
            className="absolute border border-cyan-400 bg-[#161618]"
          />
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
              className="text-center text-xs font-semibold text-white/70"
            >
              {fmt(windowW)} × {fmt(windowH)}
            </Text>
          </View>
          <BorderLabel geometry={geometry} edge="top" value={fmt(bt)} />
          <BorderLabel geometry={geometry} edge="bottom" value={fmt(bb)} />
          <BorderLabel geometry={geometry} edge="left" value={fmt(bl)} />
          <BorderLabel geometry={geometry} edge="right" value={fmt(br)} />
        </View>
      ) : (
        <View
          accessible={false}
          className="h-56 w-full items-center justify-center rounded-lg bg-white/5"
        >
          <Text accessible={false} className="text-sm text-white/50">
            Enter a valid mat and borders.
          </Text>
        </View>
      )}
    </View>
  );
}
