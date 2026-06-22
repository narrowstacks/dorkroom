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
  iso: number;
  aperture: number;
  shutterSpeed: number;
  solution: LightMeterSolution;
}

/** One exposure setting on its own fixed line; the calculated one is emphasized. */
function SettingRow({
  label,
  value,
  calculated,
}: {
  label: string;
  value: string;
  calculated: boolean;
}) {
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
  isLocked,
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
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Text
          style={[MONO, SHADOW]}
          className="text-sm tracking-widest text-white/70"
        >
          EV {evLabel}
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
      <SettingRow
        label="f"
        value={apertureLabel}
        calculated={apertureCalculated}
      />
      <SettingRow
        label="sec"
        value={shutterLabel}
        calculated={shutterCalculated}
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
