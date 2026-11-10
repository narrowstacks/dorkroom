import { Text, View } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SAFELIGHT } from '@/theme/safelight';

export function FormulaRow({ formula }: { formula: string }) {
  const { on } = useSafelight();
  return (
    <View className="rounded-xl bg-black/30 px-4 py-3">
      <Text
        className="font-mono text-sm text-ink-80"
        // The small monospace line reads dim under the mode even at ink-80, so
        // it takes the primary red outright.
        style={on ? { color: SAFELIGHT.text } : undefined}
      >
        {formula}
      </Text>
    </View>
  );
}
