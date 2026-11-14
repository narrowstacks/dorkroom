import type { ReactNode } from 'react';
import { Surface } from '@/components/surface';
import type { AccentColor } from '@/theme/accents';
import { useAccentLine } from '@/theme/use-phase-accent';

interface ResultCardProps {
  accent: AccentColor;
  children: ReactNode;
  className?: string;
}

/** A flat surface with an accent outline. */
export function ResultCard({ accent, children, className }: ResultCardProps) {
  const borderColor = useAccentLine(accent, '40');
  return (
    <Surface className={className} style={{ borderWidth: 1, borderColor }}>
      {children}
    </Surface>
  );
}
