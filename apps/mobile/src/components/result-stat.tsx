import { Text, View } from 'react-native';
import type { AccentColor } from '@/theme/accents';
import { useAccentColor } from '@/theme/use-phase-accent';

interface ResultStatProps {
  label: string;
  value: string;
  helper?: string;
  accent?: AccentColor;
}

export function ResultStat({ label, value, helper, accent }: ResultStatProps) {
  const accentColor = useAccentColor(accent ?? 'rose');
  return (
    <View className="gap-0.5">
      <Text className="text-sm text-ink-60">{label}</Text>
      <Text
        className="text-4xl font-bold"
        style={{ color: accent ? accentColor : '#ffffff' }}
      >
        {value}
      </Text>
      {helper ? <Text className="text-sm text-ink-50">{helper}</Text> : null}
    </View>
  );
}
