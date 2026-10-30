import {
  type MeasurementUnit,
  SLIDER_MAX_BORDER,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import { View } from 'react-native';
import { formatLength } from '../format';
import { SliderRow } from '../slider-row';

interface BorderSizeSectionProps {
  minBorder: number;
  unit: MeasurementUnit;
  onChange: (value: number) => void;
}

export function BorderSizeSection({
  minBorder,
  unit,
  onChange,
}: BorderSizeSectionProps) {
  return (
    <View className="gap-2">
      <SliderRow
        label="Minimum border"
        value={minBorder}
        min={SLIDER_MIN_BORDER}
        max={SLIDER_MAX_BORDER}
        step={SLIDER_STEP_BORDER}
        displayValue={formatLength(minBorder, unit)}
        onChange={onChange}
        minLabel={formatLength(SLIDER_MIN_BORDER, unit)}
        maxLabel={formatLength(SLIDER_MAX_BORDER, unit)}
      />
    </View>
  );
}
