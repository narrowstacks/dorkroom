import { useCallback, useEffect } from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { LOCK_ISO_TO_ROLL_KEY, meterStorage } from '@/lib/meter-settings';

interface MeterIsoLock {
  /** Rated EI of the meter's selected roll, or undefined when there's none. */
  rollIso: number | undefined;
  /** True when the meter ISO is currently pinned to the roll's EI. */
  isoLocked: boolean;
  toggleLock: () => void;
}

/**
 * Locks the meter's ISO to the rated EI of the roll the meter is logging to (the
 * one shown in the roll pill — not merely the first active roll, so a second
 * active roll can't hijack the EI). While locked, the solver ISO is kept equal to
 * that EI (scrubbing it snaps back); unlock to meter at a different EI. Lock
 * state is persisted (default on).
 *
 * When `linked` is false (the film-log integration is turned off in meter
 * settings) the roll is ignored entirely: `rollIso` is undefined and nothing
 * locks, so the meter ISO is freely scrubbable.
 */
export function useMeterIsoLock(
  solverIso: number,
  setSolverIso: (iso: number) => void,
  linked: boolean
): MeterIsoLock {
  const { roll } = useMeterRoll();
  const rollIso = linked ? roll?.iso : undefined;
  const [lockRaw, setLockIso] = useMMKVBoolean(
    LOCK_ISO_TO_ROLL_KEY,
    meterStorage
  );
  const isoLocked = (lockRaw ?? true) && rollIso != null;

  useEffect(() => {
    if (isoLocked && rollIso != null && solverIso !== rollIso) {
      setSolverIso(rollIso);
    }
  }, [isoLocked, rollIso, solverIso, setSolverIso]);

  const toggleLock = useCallback(
    () => setLockIso(!isoLocked),
    [isoLocked, setLockIso]
  );

  return { rollIso, isoLocked, toggleLock };
}
