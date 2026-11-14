import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { HubRollRow } from '@/components/hub/hub-roll-row';
import { LabeledGroup } from '@/components/labeled-group';
import { useRolls } from '@/hooks/use-film-log';
import { rollLabel, spokenText } from '@/lib/film-log-options';
import { toHref } from '@/lib/href';
import { LINK_OPENED_PARAM } from '@/lib/link-prefill';
import { openToolPath } from '@/lib/open-tool-path';
import {
  recipesPathForRoll,
  rollsToDevelop,
  rollToDevelopLine,
} from '@/lib/roll-lifecycle';

const MAX_ROWS = 3;

/**
 * Shot rolls waiting for the tank, at the top of Develop, oldest first, as one
 * flat group. A row opens Recipes filtered to the roll's film and EI and
 * carries the roll, so a run started from there offers to save to it. Rendered
 * only when there is one; more than three end in a link to the film log's To
 * develop list.
 */
export function UndevelopedRollsCard() {
  const rolls = useRolls();
  const waiting = useMemo(() => rollsToDevelop(rolls), [rolls]);
  if (waiting.length === 0) return null;
  const shown = waiting.slice(0, MAX_ROWS);
  const more = waiting.length - shown.length;
  return (
    <LabeledGroup title="To develop">
      {shown.map((roll) => {
        const title = rollLabel(roll);
        const detail = rollToDevelopLine(roll);
        return (
          <HubRollRow
            key={roll.id}
            title={title}
            detail={detail}
            onPress={() =>
              router.push(toHref(recipesPathForRoll(roll, Date.now())))
            }
            accessibilityLabel={`${title}, ${spokenText(detail)}`}
            accessibilityHint="Opens recipes for this roll"
          />
        );
      })}
      {more > 0 ? (
        <View key="more" className="items-start">
          <Button
            variant="plain"
            className="self-start"
            label={`${more} more`}
            onPress={() =>
              openToolPath(
                `/shoot/film-log?filter=to-develop&${LINK_OPENED_PARAM}=${Date.now()}`
              )
            }
            accessibilityLabel={`${more} more ${more === 1 ? 'roll' : 'rolls'} to develop`}
            accessibilityHint="Opens the film log"
          />
        </View>
      ) : null}
    </LabeledGroup>
  );
}
