import {
  formatAperture,
  formatShutterSpeed,
  type LightMeterSolution,
  type MeterPriority,
} from '@dorkroom/logic';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

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
  /** Tap a setting to open its selector. */
  onSelectAperture: () => void;
  onSelectShutter: () => void;
  onSelectIso: () => void;
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

/**
 * One exposure setting as a labelled column. Tap a selectable setting to pick a
 * value (▾ marks it); the locked (priority) setting shows a lock; the calculated
 * one is yellow.
 */
function Stat({
  caption,
  value,
  calculated = false,
  locked = false,
  stopError,
  onPress,
}: {
  caption: string;
  value: string;
  calculated?: boolean;
  locked?: boolean;
  stopError?: number;
  onPress?: () => void;
}) {
  const error = stopError === undefined ? null : formatStopError(stopError);
  const selectable = onPress !== undefined;
  const body = (
    <View className="items-center" style={{ gap: 3 }}>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Text
          style={[MONO, SHADOW]}
          className="text-xs uppercase tracking-widest text-white/55"
        >
          {caption}
        </Text>
        {locked ? (
          <SymbolView
            name="lock.fill"
            size={12}
            tintColor="rgba(255,255,255,0.75)"
          />
        ) : null}
      </View>
      <View className="flex-row items-baseline" style={{ gap: 3 }}>
        <Text
          style={[MONO, SHADOW]}
          className={
            calculated
              ? 'text-2xl font-bold text-yellow-300'
              : 'text-2xl font-normal text-white'
          }
        >
          {value}
        </Text>
        {selectable ? (
          <Text style={[MONO, SHADOW]} className="text-xs text-white/50">
            ▾
          </Text>
        ) : null}
        {error ? (
          <Text style={[MONO, SHADOW]} className={`text-sm ${error.tone}`}>
            {error.text}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!selectable) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      {body}
    </Pressable>
  );
}

/**
 * The metered result strip and the meter's control surface: scene EV (display
 * only) plus hold-to-pick aperture / shutter / ISO. Holding aperture or shutter
 * locks it (sets priority); the calculated one is yellow.
 */
export function MeterReadout({
  ev,
  priority,
  iso,
  aperture,
  shutterSpeed,
  solution,
  onSelectAperture,
  onSelectShutter,
  onSelectIso,
}: MeterReadoutProps) {
  const apertureLocked = priority === 'aperture';
  const shutterLocked = priority === 'shutter';

  const apertureLabel = apertureLocked
    ? formatAperture(aperture)
    : solution.isValid
      ? solution.solvedLabel
      : '—';
  const shutterLabel = shutterLocked
    ? formatShutterSpeed(shutterSpeed)
    : solution.isValid
      ? solution.solvedLabel
      : '—';
  const evLabel = ev === null ? '——' : ev.toFixed(1);

  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-end justify-between">
        <Stat caption="EV" value={evLabel} />
        <Stat
          caption="aperture"
          value={apertureLabel}
          calculated={!apertureLocked}
          locked={apertureLocked}
          stopError={
            !apertureLocked && solution.isValid
              ? solution.solvedStopError
              : undefined
          }
          onPress={onSelectAperture}
        />
        <Stat
          caption="shutter"
          value={shutterLabel}
          calculated={!shutterLocked}
          locked={shutterLocked}
          stopError={
            !shutterLocked && solution.isValid
              ? solution.solvedStopError
              : undefined
          }
          onPress={onSelectShutter}
        />
        <Stat caption="ISO" value={String(iso)} onPress={onSelectIso} />
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
