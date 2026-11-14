import { useMemo } from 'react';
import { HubRollRow } from '@/components/hub/hub-roll-row';
import { LabeledGroup } from '@/components/labeled-group';
import { useRolls } from '@/hooks/use-film-log';
import { rollLabel } from '@/lib/film-log-options';
import { recentNegativeLabel, recentNegativeLine } from '@/lib/hub-rolls';
import { openToolPath } from '@/lib/open-tool-path';
import { recentDevelopedRolls } from '@/lib/roll-lifecycle';

const MAX_ROWS = 3;

/**
 * The rolls developed most recently, at the top of Print, as one flat group:
 * the Printing stage of a roll is this list, not a stored status. A row opens
 * the roll in the Shoot tab, where the film log lives. Rendered only when
 * there is one.
 */
export function RecentNegativesCard() {
  const rolls = useRolls();
  const recent = useMemo(() => recentDevelopedRolls(rolls, MAX_ROWS), [rolls]);
  if (recent.length === 0) return null;
  const now = new Date();
  return (
    <LabeledGroup title="Recent negatives">
      {recent.map((roll) => (
        <HubRollRow
          key={roll.id}
          title={rollLabel(roll)}
          detail={recentNegativeLine(roll, now)}
          onPress={() => openToolPath(`/shoot/film-log/roll/${roll.id}`)}
          accessibilityLabel={recentNegativeLabel(roll, now)}
          accessibilityHint="Opens the roll in Shoot"
        />
      ))}
    </LabeledGroup>
  );
}
