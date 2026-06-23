import { useCallback, useState } from 'react';
import { getPinnedIds, setPinnedIds } from '@/lib/tab-bar-settings';

export function usePinnedTabs() {
  const [pinned, setPinnedState] = useState(getPinnedIds);
  const setPinned = useCallback((ids: string[]) => {
    setPinnedIds(ids);
    setPinnedState(getPinnedIds());
  }, []);
  return { pinned, setPinned };
}
