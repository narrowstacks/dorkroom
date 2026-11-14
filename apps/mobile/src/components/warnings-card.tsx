import { Text, View } from 'react-native';
import { Surface } from '@/components/surface';
import { useWarningLine } from '@/theme/use-phase-accent';

interface WarningsCardProps {
  warnings: string[];
}

/** Renders calculator warnings; nothing when there are none. */
export function WarningsCard({ warnings }: WarningsCardProps) {
  const line = useWarningLine();
  if (warnings.length === 0) return null;
  return (
    <Surface className="gap-2" style={{ borderWidth: 1, borderColor: line }}>
      {warnings.map((warning) => (
        <View key={warning} className="flex-row gap-2">
          <Text className="text-amber-400">⚠</Text>
          <Text className="flex-1 text-sm text-ink-80">{warning}</Text>
        </View>
      ))}
    </Surface>
  );
}
