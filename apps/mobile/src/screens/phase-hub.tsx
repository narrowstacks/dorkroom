import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { ActiveRollCard } from '@/components/hub/active-roll-card';
import { HubEmptyState } from '@/components/hub/hub-empty-state';
import {
  hubWidth,
  TILE_GAP,
  tileRows,
  tileSecondaryLine,
  tileWidth,
} from '@/components/hub/hub-layout';
import { RecentNegativesCard } from '@/components/hub/recent-negatives-card';
import { ToolTile } from '@/components/hub/tool-tile';
import { UndevelopedRollsCard } from '@/components/hub/undeveloped-rolls-card';
import { Screen, SCREEN_PADDING } from '@/components/screen';
import { toHref } from '@/lib/href';
import { useLastResults } from '@/lib/last-result-store';
import { type Phase, toolsForPhase } from '@/lib/tools';

/**
 * The first screen of a phase tab: a two-column grid with one tile per tool,
 * each showing its last result (or what it is for). The phase name is the
 * stack header's large title. An odd last tile spans both columns. Above the
 * grid each phase shows where the user's rolls are: Shoot the roll in the
 * camera, Develop the shot rolls waiting for the tank, Print the rolls
 * developed last. Without them, one quiet line: Shoot's replaces its card above the grid, the others follow it.
 */
export function PhaseHub({ phase }: { phase: Phase }) {
  const results = useLastResults();
  const rows = tileRows(toolsForPhase(phase));
  // Capped so a wide iPad window keeps phone-sized tiles, centred.
  const contentWidth = hubWidth(useWindowDimensions().width);
  const width = tileWidth(contentWidth, SCREEN_PADDING);
  return (
    <Screen>
      <View
        style={{
          alignSelf: 'center',
          width: contentWidth - 2 * SCREEN_PADDING,
          gap: TILE_GAP,
        }}
      >
        {phase === 'shoot' ? <ActiveRollCard /> : null}
        <HubEmptyState phase={phase} placement="above" />
        {phase === 'develop' ? <UndevelopedRollsCard /> : null}
        {phase === 'print' ? <RecentNegativesCard /> : null}
        {rows.map((row) => (
          <View
            key={row.items.map((tool) => tool.id).join()}
            style={{ flexDirection: 'row', gap: TILE_GAP }}
          >
            {row.items.map((tool) => (
              <ToolTile
                key={tool.id}
                tool={tool}
                secondary={tileSecondaryLine(tool, results)}
                width={width}
                wide={row.wide}
                onPress={() => router.push(toHref(tool.route))}
              />
            ))}
          </View>
        ))}
        <HubEmptyState phase={phase} placement="below" />
      </View>
    </Screen>
  );
}
