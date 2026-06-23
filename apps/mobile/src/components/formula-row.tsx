import { Text, View } from 'react-native';

export function FormulaRow({ formula }: { formula: string }) {
  return (
    <View className="rounded-xl bg-black/30 px-4 py-3">
      <Text className="font-mono text-sm text-white/80">{formula}</Text>
    </View>
  );
}
