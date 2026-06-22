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
  ignoreMinBorder: boolean;
  onToggleOffset: (value: boolean) => void;
  onHorizontalChange: (value: number) => void;
  onVerticalChange: (value: number) => void;
  onToggleIgnoreMinBorder: (value: boolean) => void;
}

export function PositionSection({
  enableOffset,
  horizontalOffset,
  verticalOffset,
  ignoreMinBorder,
  onToggleOffset,
  onHorizontalChange,
  onVerticalChange,
  onToggleIgnoreMinBorder,
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
          {/* Lets offsets push past the minimum border into the print margins. */}
          <ToggleRow
            label="Ignore min border"
            value={ignoreMinBorder}
            onChange={onToggleIgnoreMinBorder}
          />
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
