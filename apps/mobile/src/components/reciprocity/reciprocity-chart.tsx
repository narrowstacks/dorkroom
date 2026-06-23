import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';
import {
  buildCurve,
  type ChartPoint,
  computeChartLayout,
  scaleX,
  scaleY,
} from './chart-geometry';
import { ReciprocityChartModal } from './reciprocity-chart-modal';

const W = 320;
const H = 130;
const PADDING = { top: 12, right: 14, bottom: 14, left: 14 };

interface ReciprocityChartProps {
  originalTime: number;
  adjustedTime: number;
  factor: number;
  filmName: string;
  formatTime: (seconds: number) => string;
}

function toPath(points: ChartPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Compact, tappable preview of the reciprocity curve showing just the current
 * point. Tap to open the full interactive chart.
 */
export function ReciprocityChart({
  originalTime,
  adjustedTime,
  factor,
  filmName,
  formatTime,
}: ReciprocityChartProps) {
  const [open, setOpen] = useState(false);
  const layout = computeChartLayout({
    originalTime,
    adjustedTime,
    factor,
    width: W,
    height: H,
    padding: PADDING,
  });
  const curve = toPath(buildCurve(layout, factor, 80));
  const cx = scaleX(originalTime, layout);
  const cy = scaleY(adjustedTime, layout);
  const baseY = H - PADDING.bottom;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-white/60">Reciprocity curve</Text>
        <Text className="text-xs text-white/40">Tap to explore</Text>
      </View>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Expand reciprocity chart"
      >
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Line
            x1={PADDING.left}
            y1={baseY}
            x2={W - PADDING.right}
            y2={baseY}
            stroke="#ffffff"
            strokeOpacity={0.15}
          />
          <Path
            d={curve}
            fill="none"
            stroke={ACCENT.amber}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1={cx}
            y1={baseY}
            x2={cx}
            y2={cy}
            stroke="#ffffff"
            strokeOpacity={0.3}
            strokeDasharray="3 3"
          />
          <Circle cx={cx} cy={cy} r={5} fill={ACCENT.amber} />
        </Svg>
      </Pressable>

      <Text className="text-xs text-white/50">
        metered {formatTime(originalTime)} → adjusted {formatTime(adjustedTime)}
      </Text>

      <ReciprocityChartModal
        visible={open}
        onClose={() => setOpen(false)}
        originalTime={originalTime}
        adjustedTime={adjustedTime}
        factor={factor}
        filmName={filmName}
        formatTime={formatTime}
      />
    </View>
  );
}
