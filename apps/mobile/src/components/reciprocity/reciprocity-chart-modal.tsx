import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';
import {
  axisTicks,
  buildCurve,
  type ChartPoint,
  computeChartLayout,
  gridLines,
  meteredAtX,
  scaleX,
  scaleY,
} from './chart-geometry';

const PADDING = { top: 20, right: 18, bottom: 44, left: 52 };

interface ReciprocityChartModalProps {
  visible: boolean;
  onClose: () => void;
  originalTime: number;
  adjustedTime: number;
  factor: number;
  filmName: string;
  formatTime: (seconds: number) => string;
}

function toPath(points: ChartPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export function ReciprocityChartModal({
  visible,
  onClose,
  originalTime,
  adjustedTime,
  factor,
  filmName,
  formatTime,
}: ReciprocityChartModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // null = follow the current calculation; a number = a dragged metered time.
  const [scrub, setScrub] = useState<number | null>(null);

  const chartW = width - 32;
  const chartH = Math.min(360, Math.round(width * 0.95));
  const layout = computeChartLayout({
    originalTime,
    adjustedTime,
    factor,
    width: chartW,
    height: chartH,
    padding: PADDING,
  });
  const curve = toPath(buildCurve(layout, factor, 120));
  const grid = gridLines(layout);
  const ticks = axisTicks(layout);
  const baseY = chartH - PADDING.bottom;

  const activeMetered = scrub ?? originalTime;
  const activeAdjusted = activeMetered ** factor;
  const mx = scaleX(activeMetered, layout);
  const my = scaleY(activeAdjusted, layout);

  const close = () => {
    setScrub(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View className="flex-1 bg-[#0b0b0c]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-semibold text-white">{filmName}</Text>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close chart"
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <Text className="text-lg text-white">✕</Text>
          </Pressable>
        </View>

        <View className="mx-4 mb-4 rounded-2xl bg-white/5 px-4 py-3">
          <Text className="text-xs text-white/50">
            {scrub === null ? 'Current exposure' : 'Drag the chart to read'}
          </Text>
          <Text className="text-3xl font-bold" style={{ color: ACCENT.amber }}>
            {formatTime(activeAdjusted)}
          </Text>
          <Text className="text-sm text-white/60">
            metered {formatTime(activeMetered)} → adjusted{' '}
            {formatTime(activeAdjusted)}
          </Text>
        </View>

        <View className="px-4">
          <View style={{ width: chartW, height: chartH }}>
            <Svg width={chartW} height={chartH}>
              {grid.x.map((x) => (
                <Line
                  key={`gx-${x}`}
                  x1={x}
                  y1={PADDING.top}
                  x2={x}
                  y2={baseY}
                  stroke="#ffffff"
                  strokeOpacity={0.07}
                />
              ))}
              {grid.y.map((y) => (
                <Line
                  key={`gy-${y}`}
                  x1={PADDING.left}
                  y1={y}
                  x2={chartW - PADDING.right}
                  y2={y}
                  stroke="#ffffff"
                  strokeOpacity={0.07}
                />
              ))}

              <Line
                x1={PADDING.left}
                y1={baseY}
                x2={chartW - PADDING.right}
                y2={baseY}
                stroke="#ffffff"
                strokeOpacity={0.25}
              />
              <Line
                x1={PADDING.left}
                y1={PADDING.top}
                x2={PADDING.left}
                y2={baseY}
                stroke="#ffffff"
                strokeOpacity={0.25}
              />

              {ticks.x.map((t) => (
                <SvgText
                  key={`tx-${t.value}`}
                  x={t.px}
                  y={baseY + 16}
                  fill="#ffffff"
                  opacity={0.4}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {t.value}
                </SvgText>
              ))}
              {ticks.y.map((t) => (
                <SvgText
                  key={`ty-${t.value}`}
                  x={PADDING.left - 6}
                  y={t.px + 3}
                  fill="#ffffff"
                  opacity={0.4}
                  fontSize={10}
                  textAnchor="end"
                >
                  {t.value}
                </SvgText>
              ))}

              <Path
                d={curve}
                fill="none"
                stroke={ACCENT.amber}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <Line
                x1={mx}
                y1={PADDING.top}
                x2={mx}
                y2={baseY}
                stroke="#ffffff"
                strokeOpacity={0.4}
                strokeDasharray="4 4"
              />
              <Circle
                cx={mx}
                cy={my}
                r={6}
                fill={ACCENT.amber}
                stroke="#0b0b0c"
                strokeWidth={2}
              />
            </Svg>

            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) =>
                setScrub(meteredAtX(e.nativeEvent.locationX, layout))
              }
              onResponderMove={(e) =>
                setScrub(meteredAtX(e.nativeEvent.locationX, layout))
              }
            />
          </View>
          <Text className="mt-2 text-center text-xs text-white/40">
            Metered seconds — drag to read any exposure
          </Text>
        </View>
      </View>
    </Modal>
  );
}
