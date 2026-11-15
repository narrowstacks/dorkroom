import { router } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { HubRollRow } from '@/components/hub/hub-roll-row';
import { SectionLabel } from '@/components/section-label';
import { useRolls } from '@/hooks/use-film-log';
import { rollLabel } from '@/lib/film-log-options';
import { toHref } from '@/lib/href';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import { openToolPath } from '@/lib/open-tool-path';
import {
  recipesPathForRoll,
  rollsToDevelop,
  rollToDevelopLine,
} from '@/lib/roll-lifecycle';
import { usePhaseHue } from '@/theme/use-phase-accent';

const MAX_ROWS = 3;

/**
 * Shot rolls waiting for the tank, at the top of Develop, oldest first. A row
 * opens Recipes filtered to the roll's film and EI and carries the roll, so a
 * run started from there offers to save to it. Rendered only when there is
 * one; more than three end in a link to the film log's To develop list.
 */
export function UndevelopedRollsCard() {
  const hue = usePhaseHue();
  const rolls = useRolls();
  const waiting = useMemo(() => rollsToDevelop(rolls), [rolls]);
  if (waiting.length === 0) return null;
  const shown = waiting.slice(0, MAX_ROWS);
  const more = waiting.length - shown.length;
  return (
    <GlassCard className="gap-1">
      <SectionLabel>To develop</SectionLabel>
      {shown.map((roll, index) => {
        const title = rollLabel(roll);
        const detail = rollToDevelopLine(roll);
        return (
          <Fragment key={roll.id}>
            {index > 0 ? <View className="h-px bg-edge" /> : null}
            <HubRollRow
              title={title}
              detail={detail}
              onPress={() =>
                router.push(toHref(recipesPathForRoll(roll, Date.now())))
              }
              accessibilityLabel={`${title}, ${detail}`}
              accessibilityHint="Opens recipes for this roll"
            />
          </Fragment>
        );
      })}
      {more > 0 ? (
        <>
          <View className="h-px bg-edge" />
          <Pressable
            onPress={() =>
              openToolPath(
                `/shoot/film-log?filter=to-develop&${LINK_OPENED_PARAM}=${Date.now()}`
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`${more} more ${more === 1 ? 'roll' : 'rolls'} to develop`}
            accessibilityHint="Opens the film log"
            className="min-h-11 justify-center active:opacity-60"
          >
            <Text className="text-sm font-medium" style={{ color: hue }}>
              {more} more
            </Text>
          </Pressable>
        </>
      ) : null}
    </GlassCard>
  );
}
