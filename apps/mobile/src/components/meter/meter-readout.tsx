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
  priority: MeterPriority;
  iso: number;
  aperture: number;
  shutterSpeed: number;
  solution: LightMeterSolution;
}

/** Formats the snap error in stops: "+0.4" over, "−0.3" under, "✓" if exact. */
function formatStopError(stops: number): { text: string; tone: string } {
  const rounded = Math.round(stops * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { text: '✓', tone: 'text-white/45' };
  const sign = rounded > 0 ? '+' : '−';
  return {
    text: `${sign}${Math.abs(rounded).toFixed(1)}`,
    tone: rounded > 0 ? 'text-amber-400' : 'text-sky-400',
  };
}

/** One exposure setting as a labelled column; the calculated one is emphasized. */
function Stat({
  caption,
  value,
  calculated = false,
  stopError,
}: {
  caption: string;
  value: string;
  calculated?: boolean;
  stopError?: number;
}) {
  const error = stopError === undefined ? null : formatStopError(stopError);
  return (
    <View className="items-center" style={{ gap: 3 }}>
      <Text
        style={[MONO, SHADOW]}
        className="text-[10px] uppercase tracking-widest text-white/55"
      >
        {caption}
      </Text>
      <View className="flex-row items-baseline" style={{ gap: 4 }}>
        <Text
          style={[MONO, SHADOW]}
          className={
            calculated
              ? 'text-xl font-bold text-rose-300'
              : 'text-xl font-normal text-white'
          }
        >
          {value}
        </Text>
        {error ? (
          <Text style={[MONO, SHADOW]} className={`text-xs ${error.tone}`}>
            {error.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The metered result as a horizontal strip: scene EV plus each exposure setting.
 * The setting the meter calculates (shutter in aperture-priority, aperture in
 * shutter-priority) is bolded and accented, with its snap error in stops.
 */
export function MeterReadout({
  ev,
  priority,
  iso,
  aperture,
  shutterSpeed,
  solution,
}: MeterReadoutProps) {
  const apertureCalculated = priority === 'shutter';
  const shutterCalculated = priority === 'aperture';

  const apertureLabel = apertureCalculated
    ? solution.isValid
      ? solution.solvedLabel
      : '—'
    : formatAperture(aperture);
  const shutterLabel = shutterCalculated
    ? solution.isValid
      ? solution.solvedLabel
      : '—'
    : formatShutterSpeed(shutterSpeed);
  const evLabel = ev === null ? '——' : ev.toFixed(1);

  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-end justify-between">
        <Stat caption="EV" value={evLabel} />
        <Stat
          caption="aperture"
          value={apertureLabel}
          calculated={apertureCalculated}
          stopError={
            apertureCalculated && solution.isValid
              ? solution.solvedStopError
              : undefined
          }
        />
        <Stat
          caption="shutter"
          value={shutterLabel}
          calculated={shutterCalculated}
          stopError={
            shutterCalculated && solution.isValid
              ? solution.solvedStopError
              : undefined
          }
        />
        <Stat caption="ISO" value={String(iso)} />
      </View>
      {solution.outOfRange ? (
        <Text
          style={[MONO, SHADOW]}
          className="text-center text-xs text-amber-400"
        >
          out of range (1/8000s–30s)
        </Text>
      ) : null}
    </View>
  );
}
