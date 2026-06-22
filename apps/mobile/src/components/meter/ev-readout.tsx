import { Text, View } from 'react-native';

/** Large live EV display; shows a metering placeholder until a value arrives. */
export function EvReadout({ ev }: { ev: number | null }) {
  return (
    <View className="items-center">
      <Text className="text-xs uppercase tracking-wide text-white/50">
        EV @ ISO 100
      </Text>
      <Text className="text-4xl font-bold text-white">
        {ev === null ? 'metering…' : ev.toFixed(1)}
      </Text>
    </View>
  );
}
