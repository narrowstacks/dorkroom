import { Text, View } from 'react-native';
import { useDirectionColors } from '@/theme/use-phase-accent';
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
  const direction = useDirectionColors();
  const display = pushPullDisplay(stops);
  if (!display) return null;
  const pushed = display.direction === 'push';
  const color = pushed ? direction.up : direction.down;
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
