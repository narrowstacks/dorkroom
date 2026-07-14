import { useCallback } from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';
import { useMeterRoll } from '@/hooks/use-meter-roll';
import { LOCK_ISO_TO_ROLL_KEY, meterStorage } from '@/lib/meter-settings';

interface MeterIsoLock {
  /** Rated EI of the meter's selected roll, or undefined when there's none. */
  rollIso: number | undefined;
  /** True when the meter ISO is currently pinned to the roll's EI. */
  isoLocked: boolean;
  /**
   * The EI to pin the solver to, or undefined when unlocked. Pass straight to
   * `useLightMeterSolver`'s `isoOverride`.
   */
  lockedIso: number | undefined;
  /** Flip the lock. Unlocking leaves the solver wherever the lock had it. */
  setLocked: (locked: boolean) => void;
}

/**
 * Locks the meter's ISO to the rated EI of the roll the meter is logging to (the
 * one shown in the roll pill — not merely the first active roll, so a second
 * active roll can't hijack the EI). While locked, the solver derives its ISO from
 * that EI via `lockedIso`; unlock to meter at a different EI. Lock state is
 * persisted (default on).
 *
 * When `linked` is false (the film-log integration is turned off in meter
 * settings) the roll is ignored entirely: `rollIso` is undefined and nothing
 * locks, so the meter ISO is freely scrubbable.
 *
 * This hook deliberately knows nothing about the solver: it reports the EI to pin
 * to, and the screen feeds that into `useLightMeterSolver`. Pushing the EI up into
 * the solver from an effect here would cost an extra render on every change.
 */
export function useMeterIsoLock(linked: boolean): MeterIsoLock {
  const { roll } = useMeterRoll();
  const rollIso = linked ? roll?.iso : undefined;
  const [lockRaw, setLockIso] = useMMKVBoolean(
    LOCK_ISO_TO_ROLL_KEY,
    meterStorage
  );
  const isoLocked = (lockRaw ?? true) && rollIso != null;

  const setLocked = useCallback(
    (locked: boolean) => setLockIso(locked),
    [setLockIso]
  );

  return {
    rollIso,
    isoLocked,
    lockedIso: isoLocked ? rollIso : undefined,
    setLocked,
  };
}
