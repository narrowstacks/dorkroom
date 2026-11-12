import { router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
import { ActiveRollCard } from '@/components/hub/active-roll-card';
import {
  chunkPairs,
  hubWidth,
  TILE_GAP,
  tileSecondaryLine,
  tileWidth,
} from '@/components/hub/hub-layout';
import { ToolTile } from '@/components/hub/tool-tile';
import { Screen, SCREEN_PADDING } from '@/components/screen';
import { toHref } from '@/lib/href';
import { useLastResults } from '@/lib/last-result-store';
import { type Phase, toolsForPhase } from '@/lib/tools';

/**
 * The first screen of a phase tab: a two-column grid with one tile per tool,
 * each showing its last result (or what it is for). The phase name is the
 * stack header's large title; Shoot adds the active roll above the grid.
 */
export function PhaseHub({ phase }: { phase: Phase }) {
  const results = useLastResults();
  const rows = chunkPairs(toolsForPhase(phase));
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
        {rows.map((row) => (
          <View
            key={row.map((tool) => tool.id).join()}
            style={{ flexDirection: 'row', gap: TILE_GAP }}
          >
            {row.map((tool) => (
              <ToolTile
                key={tool.id}
                tool={tool}
                secondary={tileSecondaryLine(tool, results)}
                width={width}
                onPress={() => router.push(toHref(tool.route))}
              />
            ))}
            {row.length === 1 ? <View style={{ width }} /> : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}
