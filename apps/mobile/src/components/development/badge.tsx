import { Text, View } from 'react-native';

interface BadgeProps {
  label: string;
  /** `accent` uses the brand rose tint; `neutral` (default) is a subtle pill. */
  tone?: 'neutral' | 'accent';
}

/** A small rounded tag pill (recipe tags, the CUSTOM marker). */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View
      className={`rounded-full px-2.5 py-1 ${
        tone === 'accent' ? 'bg-rose-600/20' : 'bg-white/10'
      }`}
    >
      <Text
        className={`text-xs font-medium ${
          tone === 'accent' ? 'text-rose-300' : 'text-white/70'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
