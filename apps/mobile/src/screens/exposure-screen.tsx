import { useExposureCalculator } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { Stepper } from '@/components/stepper';
import { buildExposureShare } from '@/lib/share-text';

export function ExposureScreen() {
  const {
    originalTime,
    setOriginalTime,
    stops,
    setStops,
    adjustStops,
    calculation,
    formatTime,
    presets,
  } = useExposureCalculator();

  const stopsValue = calculation?.stopsValue ?? (Number.parseFloat(stops) || 0);
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

  return (
    <Screen>
      <GlassCard className="gap-4">
        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
        <View className="gap-2">
          <SectionLabel>Stop adjustment</SectionLabel>
          <PresetChipRow
            options={presets.map((p) => ({ label: p.label, value: p.stops }))}
            value={stopsValue}
            onSelect={(v) => setStops(String(v))}
          />
        </View>
        <LabeledTextField
          label="Custom stops"
          value={stops}
          onChangeText={setStops}
          keyboardType="default"
        />
        <Stepper
          value={`${signed(stopsValue)} stops`}
          onDecrement={() => adjustStops(-1 / 3)}
          onIncrement={() => adjustStops(1 / 3)}
        />
      </GlassCard>

      {calculation ? (
        <ResultCard accent="blue" className="gap-3">
          <ResultStat
            accent="blue"
            label="New time"
            value={formatTime(calculation.newTimeValue)}
            helper={`${signed(calculation.stopsValue)} stops`}
          />
          <FormulaRow
            formula={`${originalTime} × 2^${calculation.stopsValue.toFixed(2)} = ${formatTime(
              calculation.newTimeValue
            )}`}
          />
          <View>
            <ResultRow
              label={
                calculation.addedTime >= 0
                  ? 'Added exposure'
                  : 'Removed exposure'
              }
              value={formatTime(Math.abs(calculation.addedTime))}
            />
            <ResultRow
              label="Change"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
            <ResultRow
              label="Multiplier"
              value={`×${(2 ** calculation.stopsValue).toFixed(3)}`}
            />
            <ResultRow
              label="Original time"
              value={formatTime(calculation.originalTimeValue)}
            />
          </View>
          <ShareButton
            message={buildExposureShare({
              originalTime,
              newTime: formatTime(calculation.newTimeValue),
              stops: calculation.stopsValue,
              multiplier: 2 ** calculation.stopsValue,
              addedTime: formatTime(Math.abs(calculation.addedTime)),
              addedLabel: calculation.addedTime >= 0 ? 'Added' : 'Removed',
              percentageIncrease: calculation.percentageIncrease,
            })}
          />
        </ResultCard>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter a valid time and stops.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
