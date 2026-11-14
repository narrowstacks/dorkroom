// React glue between the timer screen and the module-level timer store
// (`lib/timer/timer-store.ts`). The run lives in the store, above any screen,
// so this hook only reads it and dispatches. The clock, haptics, sounds, alerts
// and keep-awake that must keep working while the screen is not mounted live in
// `TimerRunEffects`, mounted once at the root.
import { useCallback, useSyncExternalStore } from 'react';
import { saveLastRun } from '@/lib/timer/last-run';
import { listPresets } from '@/lib/timer/presets-storage';
import { ensureAlertPermission } from '@/lib/timer/timer-alerts';
import { timerStore } from '@/lib/timer/timer-store';
import type { TimerStage } from '@/lib/timer/types';

export interface UseTimer {
  stages: TimerStage[];
  currentStageIndex: number;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  selectedPresetId: string;
  /** Alert permission was refused, so backgrounded runs will be silent. */
  alertsDenied: boolean;
  /** Load a fresh sequence and return to idle. */
  load: (stages: TimerStage[]) => void;
  setSelectedPresetId: (id: string) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  prev: () => void;
}

const presetName = (id: string): string | null => {
  if (id === '') return null;
  try {
    return listPresets().find((p) => p.id === id)?.name ?? null;
  } catch {
    return null;
  }
};

/**
 * Starts the store's run: the one path for the Start button and for "Start last
 * timer" (`start=last`). A run that really started is remembered as the last
 * run. Asked in context: the first start prompts for notifications, later
 * starts only read the status. The run does not wait on the answer.
 */
export function startTimerRun(): void {
  timerStore.dispatch({ type: 'START' });
  const { timer, selectedPresetId } = timerStore.getSnapshot();
  if (timer.status === 'running') {
    saveLastRun(timer.stages, selectedPresetId, presetName(selectedPresetId));
  }
  void ensureAlertPermission().then((granted) =>
    timerStore.setAlertsDenied(!granted)
  );
}

export function useTimer(): UseTimer {
  const { timer, selectedPresetId, alertsDenied } = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.getSnapshot
  );

  const load = useCallback(
    (stages: TimerStage[]) => timerStore.dispatch({ type: 'LOAD', stages }),
    []
  );
  const start = useCallback(() => startTimerRun(), []);
  const pause = useCallback(() => timerStore.dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => timerStore.dispatch({ type: 'RESUME' }), []);
  const reset = useCallback(() => timerStore.dispatch({ type: 'RESET' }), []);
  const skip = useCallback(
    () => timerStore.dispatch({ type: 'NEXT_STAGE' }),
    []
  );
  const prev = useCallback(
    () => timerStore.dispatch({ type: 'PREV_STAGE' }),
    []
  );

  return {
    stages: timer.stages,
    currentStageIndex: timer.currentStageIndex,
    remainingSeconds: timer.remainingSeconds,
    status: timer.status,
    selectedPresetId,
    alertsDenied,
    load,
    setSelectedPresetId: timerStore.setSelectedPresetId,
    start,
    pause,
    resume,
    reset,
    skip,
    prev,
  };
}
