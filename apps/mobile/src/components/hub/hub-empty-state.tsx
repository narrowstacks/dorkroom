import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Surface } from '@/components/surface';
import { useRolls } from '@/hooks/use-film-log';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { toHref } from '@/lib/href';
import {
  hubEmptyPlacement,
  hubEmptyState,
  hubRollCounts,
} from '@/lib/hub-rolls';
import { openToolPath } from '@/lib/open-tool-path';
import type { Phase } from '@/lib/tools';

/**
 * The quiet line a hub shows where its roll card is absent: one sentence on a
 * compact flat surface and at most one plain action, wrapping at large text
 * sizes. The counts come from the cards' own selectors (`hubRollCounts`).
 * Shoot's takes the roll card's slot above the tools (`placement="above"`);
 * Develop's and Print's follow the tools, so nothing pushes a tool down.
 * Print's "To develop: N" opens the Develop hub the way other cross-tab links
 * do (`openToolPath`).
 */
export function HubEmptyState({
  phase,
  placement,
}: {
  phase: Phase;
  placement: 'above' | 'below';
}) {
  const rolls = useRolls();
  const { roll } = useMeterRoll();
  if (hubEmptyPlacement(phase) !== placement) return null;
  const state = hubEmptyState(phase, hubRollCounts(rolls, roll));
  if (!state) return null;
  const { action } = state;
  return (
    <Surface compact>
      <View className="flex-row flex-wrap items-center justify-between gap-x-3">
        <Text className="shrink py-2 text-sm text-ink-60">{state.message}</Text>
        {action ? (
          <Button
            variant="plain"
            label={action.label}
            onPress={() =>
              phase === 'shoot'
                ? router.push(toHref(action.path))
                : openToolPath(action.path)
            }
          />
        ) : null}
      </View>
    </Surface>
  );
}
