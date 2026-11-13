import { useSyncExternalStore } from 'react';
import { isRunActive, timerStore } from '@/lib/timer/timer-store';

const runActive = () => isRunActive(timerStore.getSnapshot().timer);

/**
 * Whether a Process Timer run is going (running or paused). Selects a boolean
 * from the store, so the caller re-renders only when a run starts or ends, not
 * on every tick.
 */
export function useRunActive(): boolean {
  return useSyncExternalStore(timerStore.subscribe, runActive, runActive);
}
