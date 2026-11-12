import Slider from '@react-native-community/slider';
import { Text, View } from 'react-native';
import { usePhaseHue } from '@/theme/use-phase-accent';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}

/** A labelled slider with a live value readout. */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: SliderRowProps) {
  const hue = usePhaseHue();
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-ink-60">{label}</Text>
        <Text className="text-base font-semibold text-white">
          {displayValue}
        </Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={hue}
        maximumTrackTintColor="rgba(255,255,255,0.2)"
        thumbTintColor="#f5f5f4"
        accessibilityLabel={label}
      />
    </View>
  );
}
