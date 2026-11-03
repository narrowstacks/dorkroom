// React glue between the timer screen and the module-level timer store
// (`lib/timer/timer-store.ts`). The run lives in the store, above any screen,
// so this hook only reads it and dispatches. The clock, haptics, sounds, alerts
// and keep-awake that must keep working while the screen is not mounted live in
// `TimerRunEffects`, mounted once at the root.
import { useCallback, useSyncExternalStore } from 'react';
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

export function useTimer(): UseTimer {
  const { timer, selectedPresetId, alertsDenied } = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.getSnapshot
  );

  const load = useCallback(
    (stages: TimerStage[]) => timerStore.dispatch({ type: 'LOAD', stages }),
    []
  );
  const start = useCallback(() => {
    timerStore.dispatch({ type: 'START' });
    // Asked in context: the first start prompts, later starts only read the
    // status. The run does not wait on the answer.
    void ensureAlertPermission().then((granted) =>
      timerStore.setAlertsDenied(!granted)
    );
  }, []);
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
