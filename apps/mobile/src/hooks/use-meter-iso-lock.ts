import { useCallback, useEffect, useMemo } from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';
import { useRolls } from '@/hooks/use-film-log';
import { LOCK_ISO_TO_ROLL_KEY, meterStorage } from '@/lib/meter-settings';

interface MeterIsoLock {
  /** Rated EI of the active roll, or undefined when there's no active roll. */
  rollIso: number | undefined;
  /** True when the meter ISO is currently pinned to the roll's EI. */
  isoLocked: boolean;
  toggleLock: () => void;
}

/**
 * Locks the meter's ISO to the active roll's rated EI. While locked, the solver
 * ISO is kept equal to the roll EI (scrubbing it snaps back); unlock to meter at
 * a different EI. Lock state is persisted (default on).
 */
export function useMeterIsoLock(
  solverIso: number,
  setSolverIso: (iso: number) => void
): MeterIsoLock {
  const rolls = useRolls();
  const rollIso = useMemo(
    () => rolls.find((r) => r.status === 'active')?.iso,
    [rolls]
  );
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
