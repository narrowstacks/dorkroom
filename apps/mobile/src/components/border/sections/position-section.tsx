import {
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
} from '@dorkroom/logic';
import { View } from 'react-native';
import { ToggleRow } from '@/components/toggle-row';
import { SliderRow } from '../slider-row';

interface PositionSectionProps {
  enableOffset: boolean;
  horizontalOffset: number;
  verticalOffset: number;
  onToggleOffset: (value: boolean) => void;
  onHorizontalChange: (value: number) => void;
  onVerticalChange: (value: number) => void;
}

export function PositionSection({
  enableOffset,
  horizontalOffset,
  verticalOffset,
  onToggleOffset,
  onHorizontalChange,
  onVerticalChange,
}: PositionSectionProps) {
  return (
    <View className="gap-4">
      <ToggleRow
        label="Enable offsets"
        value={enableOffset}
        onChange={onToggleOffset}
      />
      {enableOffset && (
        <>
          <SliderRow
            label="Horizontal"
            value={horizontalOffset}
            min={OFFSET_SLIDER_MIN}
            max={OFFSET_SLIDER_MAX}
            step={OFFSET_SLIDER_STEP}
            displayValue={horizontalOffset.toFixed(2)}
            onChange={onHorizontalChange}
          />
          <SliderRow
            label="Vertical"
            value={verticalOffset}
            min={OFFSET_SLIDER_MIN}
            max={OFFSET_SLIDER_MAX}
            step={OFFSET_SLIDER_STEP}
            displayValue={verticalOffset.toFixed(2)}
            onChange={onVerticalChange}
          />
        </>
      )}
    </View>
  );
}
