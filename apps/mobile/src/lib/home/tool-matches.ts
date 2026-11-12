import type { HomeResultGroup } from '@dorkroom/logic';
import { TOOL_ID_BY_HOME_ROUTE } from '@/lib/home/destination';
import { TOOLS } from '@/lib/tools';

/** Lower-case words of a query; a word under three letters only matches whole. */
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function matchesLabel(label: string, tokens: readonly string[]): boolean {
  const words = wordsOf(label);
  return tokens.some((token) =>
    words.some(
      (word) => word === token || (token.length >= 3 && word.startsWith(token))
    )
  );
}

/**
 * The iOS tools Home lists for a query. The shared search (`@dorkroom/logic`,
 * also the web's) names tools by the web's words, so "exposure" finds Camera
 * Exposure but not the Print tool the web calls Stops. This keeps the shared
 * results first, in their order, then adds any tool whose iOS label matches a
 * query word, in manifest order, with no duplicates. An empty query adds nothing.
 */
export function homeToolIds(
  groups: readonly HomeResultGroup[],
  query: string
): string[] {
  const shared = groups.flatMap((group) =>
    group.key === 'tools'
      ? group.tools.map((route) => TOOL_ID_BY_HOME_ROUTE[route])
      : []
  );
  const tokens = wordsOf(query);
  const byLabel =
    tokens.length === 0
      ? []
      : TOOLS.filter((tool) => matchesLabel(tool.label, tokens)).map(
          (tool) => tool.id
        );
  return [...new Set([...shared, ...byLabel])];
}
