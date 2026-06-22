import { Pressable, Text, View } from 'react-native';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

interface MeterStepperProps {
  /** The current value, already formatted (e.g. "ISO 400", "CAL +0.3"). */
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
}

/** A compact −/＋ readout drawn on the feed, for ISO and calibration. */
export function MeterStepper({
  label,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: MeterStepperProps) {
  return (
    <View className="flex-row items-center" style={{ gap: 12 }}>
      <Pressable
        onPress={onDecrement}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        hitSlop={12}
      >
        <Text style={[MONO, SHADOW]} className="text-xl font-bold text-white">
          −
        </Text>
      </Pressable>
      <Text
        style={[MONO, SHADOW]}
        className="text-sm font-semibold tracking-wider text-white"
      >
        {label}
      </Text>
      <Pressable
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        hitSlop={12}
      >
        <Text style={[MONO, SHADOW]} className="text-xl font-bold text-white">
          ＋
        </Text>
      </Pressable>
    </View>
  );
}
