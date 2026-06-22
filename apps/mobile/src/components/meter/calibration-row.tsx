import { Pressable, Text, View } from 'react-native';

/** Adjusts the light-meter calibration offset in ±⅓-stop steps. */
export function CalibrationRow({
  offset,
  onChange,
}: {
  offset: number;
  onChange: (delta: number) => void;
}) {
  const sign = offset > 0 ? '+' : '';
  const label = offset === 0 ? '0 EV' : `${sign}${offset.toFixed(2)} EV`;
  return (
    <View className="gap-2">
      <Text className="text-sm text-white/60">Calibration</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => onChange(-1 / 3)}
          accessibilityRole="button"
          accessibilityLabel="Decrease calibration by one third stop"
          className="flex-1 items-center rounded-xl bg-white/10 py-3"
        >
          <Text className="text-white">- ⅓</Text>
        </Pressable>
        <Text className="min-w-20 text-center text-base font-semibold text-white">
          {label}
        </Text>
        <Pressable
          onPress={() => onChange(1 / 3)}
          accessibilityRole="button"
          accessibilityLabel="Increase calibration by one third stop"
          className="flex-1 items-center rounded-xl bg-white/10 py-3"
        >
          <Text className="text-white">+ ⅓</Text>
        </Pressable>
      </View>
    </View>
  );
}
