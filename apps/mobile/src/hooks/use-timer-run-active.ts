import { useSyncExternalStore } from 'react';
import { isRunActive, timerStore } from '@/lib/timer/timer-store';

const getRunActive = () => isRunActive(timerStore.getSnapshot().timer);

/**
 * Whether a timer run is counting down or paused. A boolean selector, so the
 * caller re-renders when a run starts or ends, not on every tick.
 */
export function useTimerRunActive(): boolean {
  return useSyncExternalStore(timerStore.subscribe, getRunActive, getRunActive);
}
