import { Text, View } from 'react-native';
import { ACCENT } from '@/theme/accents';
import { pushPullDisplay } from './recipe-format';

interface PushPullBadgeProps {
  /** Push/pull in stops (positive = push, negative = pull). */
  stops: number;
}

/**
 * `▲ +N` for a pushed recipe (amber), `▼ -N` for pulled (blue). Renders nothing
 * at box speed so callers can drop it inline without a guard.
 */
export function PushPullBadge({ stops }: PushPullBadgeProps) {
  const display = pushPullDisplay(stops);
  if (!display) return null;
  const pushed = display.direction === 'push';
  const color = pushed ? ACCENT.amber : ACCENT.blue;
  return (
    <View className="flex-row items-center gap-0.5">
      <Text style={{ color }} className="text-xs">
        {pushed ? '▲' : '▼'}
      </Text>
      <Text style={{ color }} className="text-xs font-semibold">
        {display.label}
      </Text>
    </View>
  );
}
