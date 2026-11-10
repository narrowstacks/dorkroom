import {
  formatFocalLength,
  lensCalculatorLink,
  MAX_FOCAL_LENGTH_MM,
  MIN_FOCAL_LENGTH_MM,
  SENSOR_FORMATS,
  useLensCalculator,
} from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import { ArrowUpDown } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FormulaRow } from '@/components/formula-row';
import { InsetGroup, InsetRow } from '@/components/inset-group';
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
import { Readout } from '@/components/readout';
import { Screen } from '@/components/screen';
import { ScrubRow } from '@/components/scrub/scrub-row';
import { adaptiveFocalStep } from '@/components/scrub/scrub-value';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { useLinkOverrides } from '@/hooks/use-link-overrides';
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

interface LensScreenBodyProps {
  /** Values the screen was opened with (a Home answer or a deep link). */
  overrides?: ReturnType<typeof lensCalculatorLink.read>;
}

function LensScreenBody({ overrides }: LensScreenBodyProps) {
  const {
    values,
    setFocalLength,
    setSourceFormat,
    setTargetFormat,
    swapFormats,
    calculation,
  } = useLensCalculator({ overrides });
  // The hook stores a number; keep what the user is typing so partial input
  // like "8" or "85," isn't rewritten under their cursor.
  const [draft, setDraft] = useState<string | null>(null);

  // Stable, so the focal-length row bails out while other fields change.
  const onFocalLengthText = useCallback(
    (text: string) => {
      setDraft(text);
      setFocalLength(parseFocalLengthInput(text));
    },
    [setFocalLength]
  );

  const labels = calculation
    ? formatPairLabels(calculation.sourceFormat, calculation.targetFormat)
    : null;

  const onSwap = () => {
    Haptics.selectionAsync();
    swapFormats();
  };

  const readout =
    calculation && labels ? (
      <Readout
        accent="yellow"
        toolId="lens"
        label="Equivalent focal length"
        value={formatFocalLength(calculation.equivalentFocalLength)}
        accessibilityValueText={[
          formatFocalLength(calculation.equivalentFocalLength).replace(
            /\s*mm$/,
            ' millimeters'
          ),
          `on ${labels.target}`,
          `${calculation.fieldOfView.toFixed(1)} degrees diagonal`,
        ].join(', ')}
        facts={[
          `On ${labels.target}`,
          `${calculation.fieldOfView.toFixed(1)}° diagonal`,
        ]}
      />
    ) : (
      <Readout
        accent="yellow"
        toolId="lens"
        label="Equivalent focal length"
        value={null}
        note={
          <Text className="text-white/60">Enter a focal length above 0.</Text>
        }
      />
    );

  return (
    <Screen header={readout}>
      <InsetGroup>
        <ScrubRow
          label="Focal length"
          unit="mm"
          accent="yellow"
          value={focalLengthFieldText(draft, values.focalLength)}
          onChangeText={onFocalLengthText}
          step={adaptiveFocalStep}
          min={MIN_FOCAL_LENGTH_MM}
          max={MAX_FOCAL_LENGTH_MM}
          placeholder="50"
        />
      </InsetGroup>

      <View className="gap-2">
        <SectionLabel>Common focal lengths</SectionLabel>
        <PresetChipRow
          accent="yellow"
          options={FOCAL_LENGTH_PRESETS}
          value={values.focalLength}
          onSelect={(value) => {
            setDraft(null);
            setFocalLength(value);
          }}
        />
      </View>

      <InsetGroup>
        <View className="p-4">
          <PickerField
            label="Source format"
            options={FORMAT_OPTIONS}
            value={values.sourceFormat}
            onChange={setSourceFormat}
          />
        </View>
        <Pressable
          onPress={onSwap}
          accessibilityRole="button"
          accessibilityLabel="Swap source and target formats"
          className="min-h-11 flex-row items-center justify-center gap-2 px-4 py-2"
        >
          <ArrowUpDown size={16} color={tokens.color.textMuted} />
          <Text className="text-white/70">Swap</Text>
        </Pressable>
        <View className="p-4">
          <PickerField
            label="Target format"
            options={FORMAT_OPTIONS}
            value={values.targetFormat}
            onChange={setTargetFormat}
          />
        </View>
      </InsetGroup>

      {calculation && labels ? (
        <>
          <SensorPreview
            source={calculation.sourceFormat}
            target={calculation.targetFormat}
          />
          <InsetGroup>
            <InsetRow
              label="Field of view (diagonal)"
              value={`${calculation.fieldOfView.toFixed(1)}°`}
            />
            <InsetRow
              label="Source crop factor"
              value={`${calculation.sourceFormat.cropFactor.toFixed(2)}×`}
            />
            <InsetRow
              label="Target crop factor"
              value={`${calculation.targetFormat.cropFactor.toFixed(2)}×`}
            />
          </InsetGroup>
          <FormulaRow
            formula={lensFormula(
              formatFocalLength(calculation.focalLength),
              formatFocalLength(calculation.equivalentFocalLength),
              labels
            )}
          />
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
        </>
      ) : null}
    </Screen>
  );
}

export function LensScreen() {
  const { overrides, prefillId } = useLinkOverrides(lensCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <LensScreenBody key={prefillId} overrides={overrides} />;
}
