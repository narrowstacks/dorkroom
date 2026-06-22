import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';

interface WarningsCardProps {
  warnings: string[];
}

/** Renders calculator warnings; nothing when there are none. */
export function WarningsCard({ warnings }: WarningsCardProps) {
  if (warnings.length === 0) return null;
  return (
    <GlassCard className="gap-2">
      {warnings.map((warning) => (
        <View key={warning} className="flex-row gap-2">
          <Text className="text-amber-400">⚠</Text>
          <Text className="flex-1 text-sm text-white/80">{warning}</Text>
        </View>
      ))}
    </GlassCard>
  );
}
