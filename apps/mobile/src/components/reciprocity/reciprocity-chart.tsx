import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';
import { buildReciprocityCurve, pointFor } from './chart-geometry';

const WIDTH = 300;
const HEIGHT = 200;
const PADDING = 24;

interface ReciprocityChartProps {
  originalTime: number;
  adjustedTime: number;
  factor: number;
  filmName: string;
}

export function ReciprocityChart({
  originalTime,
  adjustedTime,
  factor,
  filmName,
}: ReciprocityChartProps) {
  const minTime = 1;
  const maxTime = Math.max(240, originalTime * 1.5);
  const params = {
    factor,
    minTime,
    maxTime,
    width: WIDTH,
    height: HEIGHT,
    padding: PADDING,
  };
  const curve = buildReciprocityCurve(params);
  if (curve.length === 0) return null;

  const marker = pointFor(originalTime, params);
  const points = curve.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View className="gap-2">
      <Text className="text-sm text-white/60">
        Reciprocity curve · {filmName}
      </Text>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Line
          x1={PADDING}
          y1={HEIGHT - PADDING}
          x2={WIDTH - PADDING}
          y2={HEIGHT - PADDING}
          stroke="#ffffff"
          strokeOpacity={0.2}
        />
        <Line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={HEIGHT - PADDING}
          stroke="#ffffff"
          strokeOpacity={0.2}
        />
        <Polyline
          points={points}
          fill="none"
          stroke={ACCENT.amber}
          strokeWidth={2}
        />
        <Line
          x1={marker.x}
          y1={HEIGHT - PADDING}
          x2={marker.x}
          y2={marker.y}
          stroke="#ffffff"
          strokeOpacity={0.3}
          strokeDasharray="3 3"
        />
        <Circle cx={marker.x} cy={marker.y} r={5} fill={ACCENT.amber} />
      </Svg>
      <Text className="text-xs text-white/40">
        Metered {Math.round(originalTime)}s → adjusted{' '}
        {Math.round(adjustedTime)}s
      </Text>
    </View>
  );
}
