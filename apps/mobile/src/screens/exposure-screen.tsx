import {
  exposureCalculatorLink,
  parseDecimalInput,
  useExposureCalculator,
} from '@dorkroom/logic';
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
import { useLinkOverrides } from '@/hooks/use-link-overrides';
import { buildExposureShare } from '@/lib/share-text';

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

interface ExposureScreenBodyProps {
  /** Values the screen was opened with (a Home answer or a deep link). */
  overrides?: ReturnType<typeof exposureCalculatorLink.read>;
}

function ExposureScreenBody({ overrides }: ExposureScreenBodyProps) {
  const {
    originalTime,
    setOriginalTime,
    stops,
    setStops,
    adjustStops,
    calculation,
    formatTime,
    presets,
  } = useExposureCalculator({ overrides });

  const stopsValue = calculation?.stopsValue ?? (parseDecimalInput(stops) || 0);
  // From the times, not 2^stopsValue, so a third reads ×1.260, not ×1.257.
  const multiplier = calculation
    ? calculation.newTimeValue / calculation.originalTimeValue
    : 1;

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
            accent="blue"
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
          label="Stops"
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
            <ResultRow label="Multiplier" value={`×${multiplier.toFixed(3)}`} />
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
              multiplier,
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

export function ExposureScreen() {
  const { overrides, prefillId } = useLinkOverrides(exposureCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <ExposureScreenBody key={prefillId} overrides={overrides} />;
}
