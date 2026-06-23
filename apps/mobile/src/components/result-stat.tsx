import { Text, View } from 'react-native';
import { ACCENT, type AccentColor } from '@/theme/accents';

interface ResultStatProps {
  label: string;
  value: string;
  helper?: string;
  accent?: AccentColor;
}

export function ResultStat({ label, value, helper, accent }: ResultStatProps) {
  return (
    <View className="gap-0.5">
      <Text className="text-sm text-white/60">{label}</Text>
      <Text
        className="text-4xl font-bold"
        style={{ color: accent ? ACCENT[accent] : '#ffffff' }}
      >
        {value}
      </Text>
      {helper ? <Text className="text-sm text-white/50">{helper}</Text> : null}
    </View>
  );
}
