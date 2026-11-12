import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import type { AccentColor } from '@/theme/accents';
import { useAccentLine } from '@/theme/use-phase-accent';

interface ResultCardProps {
  accent: AccentColor;
  children: ReactNode;
  className?: string;
}

export function ResultCard({ accent, children, className }: ResultCardProps) {
  const borderColor = useAccentLine(accent, '40');
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: borderColor,
      }}
    >
      <GlassCard className={className}>{children}</GlassCard>
    </View>
  );
}
