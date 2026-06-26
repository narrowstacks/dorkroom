import { useCallback, useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import { useRolls } from '@/hooks/use-film-log';
import { meterStorage } from '@/lib/meter-settings';
import type { FilmRoll } from '@/types/film-log';

const METER_ROLL_KEY = 'meterRollId';

/**
 * The roll the light meter logs shots to. The user picks among their active
 * rolls; the choice is persisted. Falls back to the first active roll when the
 * stored one is gone (finished/deleted) or nothing has been chosen yet.
 */
export function useMeterRoll() {
  const rolls = useRolls();
  const activeRolls = useMemo(
    () => rolls.filter((r) => r.status === 'active'),
    [rolls]
  );
  const [storedId, setStoredId] = useMMKVString(METER_ROLL_KEY, meterStorage);
  const roll: FilmRoll | undefined = useMemo(
    () => activeRolls.find((r) => r.id === storedId) ?? activeRolls[0],
    [activeRolls, storedId]
  );
  const setRoll = useCallback((id: string) => setStoredId(id), [setStoredId]);
  return { roll, activeRolls, setRoll };
}
