// React glue around the pure timer engine: owns the wall-clock that dispatches
// `TICK`, and fires light haptics on stage boundaries / completion. The engine
// (lib/timer/engine.ts) stays pure and is the single source of truth for state;
// this hook only drives it and never reimplements a transition.
//
// NOTE (mob-timer-engine, gated on an EAS rebuild): background alerts, audio, and
// keep-awake wire in LATER. This JS interval is suspended by iOS when the app is
// backgrounded, so the countdown is only accurate while the screen is foregrounded
// — which is fine for in-session testing over Metro.
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createTimerState, timerReducer } from '@/lib/timer/engine';
import type { TimerStage } from '@/lib/timer/types';

/** How often the wall-clock samples elapsed time. */
const TICK_INTERVAL_MS = 250;

export interface UseTimer {
  stages: TimerStage[];
  currentStageIndex: number;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  /** Load a fresh sequence and return to idle. */
  load: (stages: TimerStage[]) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  prev: () => void;
}

export function useTimer(initialStages: TimerStage[]): UseTimer {
  const [state, dispatch] = useReducer(
    timerReducer,
    initialStages,
    createTimerState
  );

  // Wall-clock source: while running, sample the real elapsed delta every tick so
  // the countdown can't drift from accumulated rounding (the engine carries any
  // overflow across stage boundaries).
  const lastSampleRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.status !== 'running') {
      lastSampleRef.current = null;
      return;
    }
    lastSampleRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const previous = lastSampleRef.current ?? now;
      const deltaSeconds = (now - previous) / 1000;
      lastSampleRef.current = now;
      if (deltaSeconds > 0) {
        dispatch({ type: 'TICK', seconds: deltaSeconds });
      }
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.status]);

  // Haptic feedback on stage changes and completion (expo-haptics is already a
  // dependency; this is not a native module add). The first render is skipped so
  // loading a preset doesn't buzz.
  const prevStageRef = useRef(state.currentStageIndex);
  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    const stageChanged = state.currentStageIndex !== prevStageRef.current;
    const justCompleted =
      state.status === 'completed' && prevStatusRef.current !== 'completed';
    prevStageRef.current = state.currentStageIndex;
    prevStatusRef.current = state.status;

    if (justCompleted) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (stageChanged && state.status === 'running') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [state.currentStageIndex, state.status]);

  const load = useCallback(
    (stages: TimerStage[]) => dispatch({ type: 'LOAD', stages }),
    []
  );
  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const skip = useCallback(() => dispatch({ type: 'NEXT_STAGE' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV_STAGE' }), []);

  return {
    stages: state.stages,
    currentStageIndex: state.currentStageIndex,
    remainingSeconds: state.remainingSeconds,
    status: state.status,
    load,
    start,
    pause,
    resume,
    reset,
    skip,
    prev,
  };
}
