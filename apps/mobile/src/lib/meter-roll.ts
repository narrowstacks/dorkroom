// The roll the light meter logs shots to: the user's pick among their active
// rolls (persisted), else the first active roll. `useMeterRoll` is the React
// face; `currentMeterRollId` reads the same thing outside React, for the
// "Log a frame" link.
import { getRolls } from '@/lib/film-log-storage';
import { meterStorage } from '@/lib/meter-settings';

export const METER_ROLL_KEY = 'meterRollId';

/** The stored roll when it is still active, else the first active roll. Pure. */
export function pickMeterRoll<T extends { id: string; status: string }>(
  rolls: readonly T[],
  storedId: string | undefined
): T | undefined {
  const active = rolls.filter((r) => r.status === 'active');
  return active.find((r) => r.id === storedId) ?? active[0];
}

/** The id of the roll the meter logs to now, or undefined when no roll is active. */
export function currentMeterRollId(): string | undefined {
  return pickMeterRoll(getRolls(), meterStorage.getString(METER_ROLL_KEY))?.id;
}
