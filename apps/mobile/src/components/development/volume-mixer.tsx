import {
  calculateVolumes,
  convertDisplayToMl,
  convertMlToDisplay,
  formatDilutionDescription,
  formatVolume,
  getDefaultVolumeMl,
  getVolumePrecision,
  getVolumeStepSize,
  getVolumeUnitLabel,
  isStockDilution,
  parseDilution,
  type VolumeUnit,
} from '@dorkroom/logic';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { ResultRow } from '@/components/result-row';
import { SegmentedControl } from '@/components/segmented-control';
import { Stepper } from '@/components/stepper';

interface VolumeMixerProps {
  /** Resolved dilution string for the recipe, e.g. "1+1", "1:50", "Stock". */
  dilutionString: string;
}

const UNIT_OPTIONS: { label: string; value: VolumeUnit }[] = [
  { label: 'ml', value: 'ml' },
  { label: 'fl oz', value: 'floz' },
];

// Common tank sizes, in ml.
const VOLUME_PRESETS_ML = [250, 290, 500, 1000] as const;

function formatDisplay(ml: number, unit: VolumeUnit): string {
  return convertMlToDisplay(ml, unit).toFixed(getVolumePrecision(unit));
}

/**
 * Interactive developer/water mixer. All math comes from @dorkroom/logic
 * (dilution-parser + volume-conversion); this component only holds the input
 * state (total volume + unit).
 */
export function VolumeMixer({ dilutionString }: VolumeMixerProps) {
  const [unit, setUnit] = useState<VolumeUnit>('ml');
  const [text, setText] = useState(() =>
    formatDisplay(getDefaultVolumeMl(), 'ml')
  );

  const displayValue = Number.parseFloat(text);
  const safeDisplay = Number.isFinite(displayValue) ? displayValue : 0;
  const volumeMl = convertDisplayToMl(safeDisplay, unit);

  const parsed = useMemo(() => parseDilution(dilutionString), [dilutionString]);
  const stock = useMemo(
    () => isStockDilution(dilutionString),
    [dilutionString]
  );
  const volumes = useMemo(
    () => (parsed && !stock ? calculateVolumes(volumeMl, parsed) : null),
    [parsed, stock, volumeMl]
  );

  const onToggleUnit = (next: VolumeUnit) => {
    if (next === unit) return;
    // Preserve the actual volume across the unit switch.
    setText(formatDisplay(volumeMl, next));
    setUnit(next);
  };

  const step = (direction: 1 | -1) => {
    const next = Math.max(0, safeDisplay + direction * getVolumeStepSize(unit));
    setText(next.toFixed(getVolumePrecision(unit)));
  };

  const selectPreset = (ml: number) => setText(formatDisplay(ml, unit));

  return (
    <GlassCard className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-white">Volume Mixer</Text>
        <View className="w-32">
          <SegmentedControl
            options={UNIT_OPTIONS}
            value={unit}
            onChange={onToggleUnit}
          />
        </View>
      </View>

      {stock ? (
        <Text className="text-sm text-white/60">
          No mixing needed — use developer stock (undiluted).
        </Text>
      ) : null}

      {!stock && !parsed ? (
        <Text className="text-sm text-amber-300">
          Couldn’t parse dilution “{dilutionString}”.
        </Text>
      ) : null}

      {!stock && parsed ? (
        <>
          <View className="gap-2">
            <LabeledTextField
              label={`Total volume (${getVolumeUnitLabel(unit)})`}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
            />
            <Stepper
              value={`${text} ${getVolumeUnitLabel(unit)}`}
              onDecrement={() => step(-1)}
              onIncrement={() => step(1)}
            />
            <PresetChipRow
              options={VOLUME_PRESETS_ML.map((ml) => ({
                label: formatVolume(ml, unit),
                value: ml,
              }))}
              value={
                VOLUME_PRESETS_ML.find((ml) => Math.abs(ml - volumeMl) < 0.5) as
                  | number
                  | undefined
              }
              onSelect={selectPreset}
            />
          </View>

          <View>
            <ResultRow
              label="Developer"
              value={volumes ? formatVolume(volumes.concentrate, unit) : '—'}
            />
            <ResultRow
              label="Water"
              value={volumes ? formatVolume(volumes.water, unit) : '—'}
            />
            <Text className="mt-1 text-sm text-white/50">
              {formatDilutionDescription(parsed)}
            </Text>
          </View>
        </>
      ) : null}
    </GlassCard>
  );
}
