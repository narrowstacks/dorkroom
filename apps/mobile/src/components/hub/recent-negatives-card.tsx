import { Fragment, useMemo } from 'react';
import { View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { HubRollRow } from '@/components/hub/hub-roll-row';
import { SectionLabel } from '@/components/section-label';
import { useRolls } from '@/hooks/use-film-log';
import { rollLabel, shotCountLabel } from '@/lib/film-log-options';
import { openToolPath } from '@/lib/open-tool-path';
import { developedInLabel, recentDevelopedRolls } from '@/lib/roll-lifecycle';

const MAX_ROWS = 3;

/**
 * The rolls developed most recently, at the top of Print: the Printing stage
 * of a roll is this list, not a stored status. A row opens the roll in the
 * Shoot tab, where the film log lives. Rendered only when there is one.
 */
export function RecentNegativesCard() {
  const rolls = useRolls();
  const recent = useMemo(() => recentDevelopedRolls(rolls, MAX_ROWS), [rolls]);
  if (recent.length === 0) return null;
  return (
    <GlassCard className="gap-1">
      <SectionLabel>Recent negatives</SectionLabel>
      {recent.map((roll, index) => {
        const title = rollLabel(roll);
        const detail = [
          developedInLabel(roll.development),
          shotCountLabel(roll.shots.length),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Fragment key={roll.id}>
            {index > 0 ? <View className="h-px bg-edge" /> : null}
            <HubRollRow
              title={title}
              detail={detail}
              onPress={() => openToolPath(`/shoot/film-log/roll/${roll.id}`)}
              accessibilityLabel={`${title}, ${detail}`}
              accessibilityHint="Opens the roll in Shoot"
            />
          </Fragment>
        );
      })}
    </GlassCard>
  );
}
