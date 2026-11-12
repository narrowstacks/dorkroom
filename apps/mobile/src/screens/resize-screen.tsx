import {
  EXPOSURE_TIME_MAX_SECONDS,
  EXPOSURE_TIME_MIN_SECONDS,
  getDisplayUnitLabel,
  type MeasurementUnit,
  parseDecimalInput,
  POSITIVE_DIMENSION_MAX,
  POSITIVE_DIMENSION_MIN,
  resizeCalculatorLink,
  useResizeCalculator,
} from '@dorkroom/logic';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { InsetGroup } from '@/components/inset-group';
import { Readout } from '@/components/readout';
import { AspectPreview } from '@/components/resize/aspect-preview';
import { convertResizeLengths } from '@/components/resize/units';
import { Screen } from '@/components/screen';
import { ScrubRow } from '@/components/scrub/scrub-row';
import { adaptiveTimeStep } from '@/components/scrub/scrub-value';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ShareButton } from '@/components/share-button';
import { useLinkOverrides } from '@/hooks/use-link-overrides';
import { useMeasurementUnit } from '@/hooks/use-measurement-unit';
import { buildResizeShare } from '@/lib/share-text';
import { spokenSeconds } from '@/lib/spoken-time';

const num = (s: string) => parseDecimalInput(s) || 0;

function ResizeScreenBody() {
  const { overrides } = useLinkOverrides(resizeCalculatorLink);
  const {
    isEnlargerHeightMode,
    setIsEnlargerHeightMode,
    originalWidth,
    setOriginalWidth,
    originalLength,
    setOriginalLength,
    newWidth,
    setNewWidth,
    newLength,
    setNewLength,
    originalHeight,
    setOriginalHeight,
    newHeight,
    setNewHeight,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
  } = useResizeCalculator({ overrides });

  // The global preference, not a screen-local override: like web, where the
  // one Imperial/Metric toggle drives every page, flipping it here also flips
  // Settings and Border.
  const [measurementUnit, setMeasurementUnit] = useMeasurementUnit();
  const unit = getDisplayUnitLabel(measurementUnit);

  // The unit the length fields' text is currently in. The hook seeds inch
  // defaults, so this starts imperial; whenever the preference differs (on
  // first render for a metric user, or after a toggle here or in Settings)
  // every length is converted during render, so a number is never shown under
  // the wrong label.
  const [fieldsUnit, setFieldsUnit] = useState<MeasurementUnit>('imperial');
  if (fieldsUnit !== measurementUnit) {
    const converted = convertResizeLengths(
      {
        originalWidth,
        originalLength,
        newWidth,
        newLength,
        originalHeight,
        newHeight,
      },
      fieldsUnit,
      measurementUnit
    );
    setFieldsUnit(measurementUnit);
    setOriginalWidth(converted.originalWidth);
    setOriginalLength(converted.originalLength);
    setNewWidth(converted.newWidth);
    setNewLength(converted.newLength);
    setOriginalHeight(converted.originalHeight);
    setNewHeight(converted.newHeight);
  }

  const stopsHelper = (() => {
    const diff = Number.parseFloat(stopsDifference);
    if (!Number.isFinite(diff) || diff === 0) return 'same size';
    return diff > 0 ? 'larger, add exposure' : 'smaller, remove exposure';
  })();

  const lengthStep = measurementUnit === 'imperial' ? 0.25 : 0.5;
  const dimension = (
    label: string,
    value: string,
    onChangeText: (text: string) => void
  ) => (
    <ScrubRow
      key={label}
      label={label}
      unit={unit}
      accent="rose"
      value={value}
      onChangeText={onChangeText}
      step={lengthStep}
      min={POSITIVE_DIMENSION_MIN}
      max={POSITIVE_DIMENSION_MAX}
    />
  );

  const readout = newTime ? (
    <Readout
      accent="rose"
      label="New time"
      value={newTime}
      unit="s"
      accessibilityValueText={`${spokenSeconds(newTime)}, ${stopsDifference} stops, ${stopsHelper}`}
      facts={[`${stopsDifference} stops`, stopsHelper]}
      note={
        !isAspectRatioMatched && !isEnlargerHeightMode ? (
          <Text className="text-amber-500">⚠ Aspect ratios do not match.</Text>
        ) : undefined
      }
    />
  ) : (
    <Readout
      accent="rose"
      label="New time"
      value={null}
      note={<Text className="text-ink-60">Enter dimensions and a time.</Text>}
    />
  );

  return (
    <Screen header={readout}>
      <SegmentedControl
        accent="rose"
        options={[
          { label: 'Print size', value: false },
          { label: 'Enlarger height', value: true },
        ]}
        value={isEnlargerHeightMode}
        onChange={setIsEnlargerHeightMode}
      />

      <View className="gap-2">
        <SectionLabel>Units</SectionLabel>
        <SegmentedControl
          accent="rose"
          options={[
            { label: 'Inches', value: 'imperial' },
            { label: 'Centimeters', value: 'metric' },
          ]}
          value={measurementUnit}
          onChange={setMeasurementUnit}
        />
      </View>

      <InsetGroup>
        {/* Arrays, not fragments: InsetGroup only divides its direct children. */}
        {isEnlargerHeightMode
          ? [
              dimension('Original height', originalHeight, setOriginalHeight),
              dimension('New height', newHeight, setNewHeight),
            ]
          : [
              dimension('Original width', originalWidth, setOriginalWidth),
              dimension('Original length', originalLength, setOriginalLength),
              dimension('New width', newWidth, setNewWidth),
              dimension('New length', newLength, setNewLength),
            ]}
        <ScrubRow
          label="Original time"
          unit="s"
          accent="rose"
          value={originalTime}
          onChangeText={setOriginalTime}
          step={adaptiveTimeStep}
          speakValue={spokenSeconds}
          min={EXPOSURE_TIME_MIN_SECONDS}
          max={EXPOSURE_TIME_MAX_SECONDS}
        />
      </InsetGroup>

      {isEnlargerHeightMode ? null : (
        <AspectPreview
          origW={num(originalWidth)}
          origL={num(originalLength)}
          newW={num(newWidth)}
          newL={num(newLength)}
        />
      )}

      {newTime ? (
        <ShareButton
          message={buildResizeShare({
            title: isEnlargerHeightMode ? 'Enlarger Resize' : 'Print Resize',
            original: isEnlargerHeightMode
              ? `${originalHeight} ${unit} column`
              : `${originalWidth}×${originalLength} ${unit}`,
            target: isEnlargerHeightMode
              ? `${newHeight} ${unit} column`
              : `${newWidth}×${newLength} ${unit}`,
            originalTime,
            newTime,
            stopsDifference,
          })}
        />
      ) : null}
    </Screen>
  );
}

export function ResizeScreen() {
  const { prefillId } = useLinkOverrides(resizeCalculatorLink);
  // Re-mounts on a new link: the shared hooks apply overrides on mount only.
  return <ResizeScreenBody key={prefillId} />;
}
