import { useCallback, useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import {
  KEY,
  normalizePinnedIds,
  setPinnedIds,
  storage,
} from '@/lib/tab-bar-settings';

export function usePinnedTabs() {
  const [raw] = useMMKVString(KEY, storage);
  const pinned = useMemo(() => normalizePinnedIds(raw), [raw]);
  const setPinned = useCallback((ids: string[]) => setPinnedIds(ids), []);
  return { pinned, setPinned };
}
