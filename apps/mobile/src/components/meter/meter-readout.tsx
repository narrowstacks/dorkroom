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

/** One exposure setting on its own fixed line; the calculated one is emphasized. */
function SettingRow({
  label,
  value,
  calculated,
  stopError,
}: {
  label: string;
  value: string;
  calculated: boolean;
  /** Snap error in stops; shown only on the calculated row. */
  stopError?: number;
}) {
  const error = stopError === undefined ? null : formatStopError(stopError);
  return (
    <View className="flex-row items-baseline" style={{ gap: 10 }}>
      <Text
        style={[MONO, SHADOW]}
        className="w-14 text-xs uppercase tracking-widest text-white/55"
      >
        {label}
      </Text>
      <Text
        style={[MONO, SHADOW]}
        className={
          calculated
            ? 'text-2xl font-bold text-rose-300'
            : 'text-2xl font-normal text-white'
        }
      >
        {value}
      </Text>
      {error ? (
        <Text style={[MONO, SHADOW]} className={`text-sm ${error.tone}`}>
          {error.text}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The metered result, drawn on the feed (no card): the scene EV, then each
 * exposure setting on a fixed line. The setting the meter calculates (shutter in
 * aperture-priority, aperture in shutter-priority) is bolded and accented.
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
    <View style={{ gap: 6 }}>
      <Text
        style={[MONO, SHADOW]}
        className="text-sm tracking-widest text-white/70"
      >
        EV {evLabel}
      </Text>
      <SettingRow
        label="f"
        value={apertureLabel}
        calculated={apertureCalculated}
        stopError={
          apertureCalculated && solution.isValid
            ? solution.solvedStopError
            : undefined
        }
      />
      <SettingRow
        label="sec"
        value={shutterLabel}
        calculated={shutterCalculated}
        stopError={
          shutterCalculated && solution.isValid
            ? solution.solvedStopError
            : undefined
        }
      />
      <SettingRow label="iso" value={String(iso)} calculated={false} />
      {solution.outOfRange ? (
        <Text style={[MONO, SHADOW]} className="text-xs text-amber-400">
          out of range (1/8000s–30s)
        </Text>
      ) : null}
    </View>
  );
}
