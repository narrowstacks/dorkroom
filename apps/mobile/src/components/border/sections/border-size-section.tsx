import {
  SLIDER_MAX_BORDER,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import { View } from 'react-native';
import { formatInches } from '../format';
import { SliderRow } from '../slider-row';

interface BorderSizeSectionProps {
  minBorder: number;
  onChange: (value: number) => void;
}

export function BorderSizeSection({
  minBorder,
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
        displayValue={formatInches(minBorder)}
        onChange={onChange}
      />
    </View>
  );
}
