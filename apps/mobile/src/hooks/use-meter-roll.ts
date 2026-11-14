import { useCallback, useMemo } from 'react';
import { useMMKVString } from 'react-native-mmkv';
import { useRolls } from '@/hooks/use-film-log';
import { METER_ROLL_KEY, pickMeterRoll } from '@/lib/meter-roll';
import { meterStorage } from '@/lib/meter-settings';
import type { FilmRoll } from '@/schemas/film-log.schema';

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
    () => pickMeterRoll(activeRolls, storedId),
    [activeRolls, storedId]
  );
  const setRoll = useCallback((id: string) => setStoredId(id), [setStoredId]);
  return { roll, activeRolls, setRoll };
}
