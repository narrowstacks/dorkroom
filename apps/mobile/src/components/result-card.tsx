import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { ACCENT, type AccentColor } from '@/theme/accents';

interface ResultCardProps {
  accent: AccentColor;
  children: ReactNode;
  className?: string;
}

export function ResultCard({ accent, children, className }: ResultCardProps) {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${ACCENT[accent]}40`,
      }}
    >
      <GlassCard className={className}>{children}</GlassCard>
    </View>
  );
}
