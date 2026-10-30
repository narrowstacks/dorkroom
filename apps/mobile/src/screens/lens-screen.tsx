import {
  formatFocalLength,
  SENSOR_FORMATS,
  useLensCalculator,
} from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import { ArrowUpDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import {
  buildSensorFormatOptions,
  focalLengthFieldText,
  type FormatPairLabels,
  formatPairLabels,
  parseFocalLengthInput,
} from '@/components/lens/format';
import { SensorPreview } from '@/components/lens/sensor-preview';
import { PickerField } from '@/components/picker-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { buildLensShare } from '@/lib/share-text';
import { tokens } from '@/theme/tokens';

const FORMAT_OPTIONS = buildSensorFormatOptions(SENSOR_FORMATS);

const FOCAL_LENGTH_PRESETS = [24, 35, 50, 85, 135].map((value) => ({
  label: `${value}mm`,
  value,
}));

const lensFormula = (
  focal: string,
  equivalent: string,
  labels: FormatPairLabels
) => `${focal} on ${labels.source} = ${equivalent} on ${labels.target}`;

export function LensScreen() {
  const {
    values,
    setFocalLength,
    setSourceFormat,
    setTargetFormat,
    swapFormats,
    calculation,
  } = useLensCalculator();
  // The hook stores a number; keep what the user is typing so partial input
  // like "8" or "85," isn't rewritten under their cursor.
  const [draft, setDraft] = useState<string | null>(null);

  const onFocalLengthText = (text: string) => {
    setDraft(text);
    setFocalLength(parseFocalLengthInput(text));
  };

  const labels = calculation
    ? formatPairLabels(calculation.sourceFormat, calculation.targetFormat)
    : null;

  const onSwap = () => {
    Haptics.selectionAsync();
    swapFormats();
  };

  return (
    <Screen>
      <GlassCard className="gap-4">
        <LabeledTextField
          label="Focal length (mm)"
          value={focalLengthFieldText(draft, values.focalLength)}
          onChangeText={onFocalLengthText}
          keyboardType="decimal-pad"
          placeholder="50"
        />
        <View className="gap-2">
          <SectionLabel>Common focal lengths</SectionLabel>
          <PresetChipRow
            accent="emerald"
            options={FOCAL_LENGTH_PRESETS}
            value={values.focalLength}
            onSelect={(value) => {
              setDraft(null);
              setFocalLength(value);
            }}
          />
        </View>

        <PickerField
          label="Source format"
          options={FORMAT_OPTIONS}
          value={values.sourceFormat}
          onChange={setSourceFormat}
        />
        <Pressable
          onPress={onSwap}
          accessibilityRole="button"
          accessibilityLabel="Swap source and target formats"
          className="min-h-11 flex-row items-center justify-center gap-2 self-center rounded-full bg-white/10 px-4 py-2"
        >
          <ArrowUpDown size={16} color={tokens.color.textMuted} />
          <Text className="text-white/70">Swap</Text>
        </Pressable>
        <PickerField
          label="Target format"
          options={FORMAT_OPTIONS}
          value={values.targetFormat}
          onChange={setTargetFormat}
        />
      </GlassCard>

      {calculation && labels ? (
        <ResultCard accent="emerald" className="gap-3">
          <ResultStat
            accent="emerald"
            label="Equivalent focal length"
            value={formatFocalLength(calculation.equivalentFocalLength)}
            helper={`On ${labels.target}`}
          />
          <FormulaRow
            formula={lensFormula(
              formatFocalLength(calculation.focalLength),
              formatFocalLength(calculation.equivalentFocalLength),
              labels
            )}
          />
          <SensorPreview
            source={calculation.sourceFormat}
            target={calculation.targetFormat}
          />
          <View>
            <ResultRow
              label="Field of view (diagonal)"
              value={`${calculation.fieldOfView.toFixed(1)}°`}
            />
            <ResultRow
              label="Source crop factor"
              value={`${calculation.sourceFormat.cropFactor.toFixed(2)}×`}
            />
            <ResultRow
              label="Target crop factor"
              value={`${calculation.targetFormat.cropFactor.toFixed(2)}×`}
            />
          </View>
          <ShareButton
            message={buildLensShare({
              focalLength: formatFocalLength(calculation.focalLength),
              sourceFormat: calculation.sourceFormat.name,
              equivalentFocalLength: formatFocalLength(
                calculation.equivalentFocalLength
              ),
              targetFormat: calculation.targetFormat.name,
              fieldOfView: calculation.fieldOfView,
              sourceCropFactor: calculation.sourceFormat.cropFactor,
              targetCropFactor: calculation.targetFormat.cropFactor,
            })}
          />
        </ResultCard>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter a focal length above 0.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
