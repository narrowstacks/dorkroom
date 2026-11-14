import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useHomeSearchData } from '@/hooks/use-home-search-data';
import { parseRecentIds } from '@/lib/recent-list';
import {
  getRecipeHistoryRaw,
  subscribeRecipeHistory,
} from '@/lib/recent-store';
import { recipeSyncAction } from '@/lib/spotlight-index';
// Importing it starts the roll indexing (shortly after start, and on film log changes).
import {
  pruneRecipeSpotlight,
  recipesNeedCatalog,
  syncRecipeSpotlight,
} from '@/lib/spotlight-sync';

/**
 * Indexes the recently opened recipes in Spotlight, named from the catalog the
 * Home search reads (the same persisted query cache). Mounted once in the root
 * layout, inside the query provider; renders nothing. The catalog queries run
 * only when the record says a recent recipe is missing or due for a re-send,
 * so most launches load nothing here; recipes that left the recent list are
 * removed without it. Nothing is sent until the whole catalog has loaded with
 * something in it, so a slow, failed or empty load never empties the index
 * (`recipeSyncAction`).
 */
export function SpotlightEffects() {
  const raw = useSyncExternalStore(
    subscribeRecipeHistory,
    getRecipeHistoryRaw,
    getRecipeHistoryRaw
  );
  const recipeIds = useMemo(() => parseRecentIds(raw), [raw]);
  // Read once per change of the recent list, not on every render.
  const needsCatalog = useMemo(
    () => recipesNeedCatalog(recipeIds),
    [recipeIds]
  );
  const { data } = useHomeSearchData(needsCatalog);
  const { films, developers, combinations } = data;

  useEffect(() => {
    const action = recipeSyncAction(recipeIds, needsCatalog, {
      films,
      developers,
      combinations,
    });
    if (action.kind === 'clear') syncRecipeSpotlight([]);
    else if (action.kind === 'prune') pruneRecipeSpotlight(action.keep);
    else if (action.kind === 'sync') syncRecipeSpotlight(action.items);
  }, [needsCatalog, recipeIds, films, developers, combinations]);

  return null;
}
