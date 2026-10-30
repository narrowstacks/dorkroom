import {
  computeMaxAllowedMinBorder,
  type MeasurementUnit,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import { View } from 'react-native';
import { formatLength } from '../format';
import { SliderRow } from '../slider-row';

interface BorderSizeSectionProps {
  minBorder: number;
  unit: MeasurementUnit;
  /** Oriented paper size in inches; bounds the slider like the shared schema. */
  paperWidth: number;
  paperHeight: number;
  onChange: (value: number) => void;
}

export function BorderSizeSection({
  minBorder,
  unit,
  paperWidth,
  paperHeight,
  onChange,
}: BorderSizeSectionProps) {
  const maxBorder = computeMaxAllowedMinBorder(paperWidth, paperHeight);
  return (
    <View className="gap-2">
      <SliderRow
        label="Minimum border"
        value={minBorder}
        min={SLIDER_MIN_BORDER}
        max={maxBorder}
        step={SLIDER_STEP_BORDER}
        displayValue={formatLength(minBorder, unit)}
        onChange={onChange}
        minLabel={formatLength(SLIDER_MIN_BORDER, unit)}
        maxLabel={formatLength(maxBorder, unit)}
      />
    </View>
  );
}
