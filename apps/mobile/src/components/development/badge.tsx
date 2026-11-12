import { Text, View } from 'react-native';
import { useSelectionTint } from '@/theme/use-phase-accent';

interface BadgeProps {
  label: string;
  /** `accent` uses the phase hue's tint; `neutral` (default) is a subtle pill. */
  tone?: 'neutral' | 'accent';
}

/** A small rounded tag pill (recipe tags, the CUSTOM marker). */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const tint = useSelectionTint();
  const accent = tone === 'accent';
  return (
    <View
      className={`rounded-full px-2.5 py-1 ${accent ? '' : 'bg-white/10'}`}
      style={accent ? { backgroundColor: tint.backgroundColor } : undefined}
    >
      <Text
        className={`text-xs font-medium ${accent ? '' : 'text-white/70'}`}
        style={accent ? { color: tint.color } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
