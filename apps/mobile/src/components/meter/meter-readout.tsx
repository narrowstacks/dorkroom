import {
  formatAperture,
  formatShutterSpeed,
  type LightMeterSolution,
  type MeterPriority,
} from '@dorkroom/logic';
import { Text, View } from 'react-native';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

interface MeterReadoutProps {
  ev: number | null;
  isLocked: boolean;
  priority: MeterPriority;
  aperture: number;
  shutterSpeed: number;
  solution: LightMeterSolution;
}

/**
 * The metered result, drawn straight on the feed (no card): the scene EV as an
 * instrument-style readout, then the locked setting and the value it solves to.
 */
export function MeterReadout({
  ev,
  isLocked,
  priority,
  aperture,
  shutterSpeed,
  solution,
}: MeterReadoutProps) {
  const lockedLabel =
    priority === 'aperture'
      ? formatAperture(aperture)
      : formatShutterSpeed(shutterSpeed);
  const solvedLabel = solution.isValid ? solution.solvedLabel : '—';
  const evLabel = ev === null ? '——' : ev.toFixed(1);

  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Text
          style={[MONO, SHADOW]}
          className="text-sm tracking-widest text-white/70"
        >
          EV
        </Text>
        {isLocked ? (
          <Text style={[MONO, SHADOW]} className="text-xs text-rose-400">
            ● LOCKED
          </Text>
        ) : (
          <Text style={[MONO, SHADOW]} className="text-xs text-white/50">
            metering
          </Text>
        )}
      </View>
      <Text style={[MONO, SHADOW]} className="text-6xl font-bold text-white">
        {evLabel}
      </Text>
      <View className="flex-row items-end" style={{ gap: 8 }}>
        <Text
          style={[MONO, SHADOW]}
          className="text-2xl font-semibold text-white"
        >
          {lockedLabel}
        </Text>
        <Text style={[MONO, SHADOW]} className="pb-1 text-lg text-rose-400">
          →
        </Text>
        <Text
          style={[MONO, SHADOW]}
          className="text-2xl font-semibold text-white"
        >
          {solvedLabel}
        </Text>
      </View>
      {solution.outOfRange ? (
        <Text style={[MONO, SHADOW]} className="text-xs text-amber-400">
          out of range (1/8000s–30s)
        </Text>
      ) : null}
    </View>
  );
}
