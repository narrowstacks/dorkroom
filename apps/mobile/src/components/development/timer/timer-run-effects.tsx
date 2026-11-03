import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { agitationStateAt, agitationWindows } from '@/lib/timer/agitation';
import { playCue } from '@/lib/timer/cue-audio';
import { upcomingCues } from '@/lib/timer/cues';
import {
  cancelCueAlerts,
  installNotificationHandler,
  scheduleCueAlerts,
} from '@/lib/timer/timer-alerts';
import { isRunActive, timerStore } from '@/lib/timer/timer-store';

/** How often the display re-samples the wall clock while a run is going. */
const SYNC_INTERVAL_MS = 250;

function KeepAwakeWhileActive() {
  useKeepAwake('process-timer');
  return null;
}

/**
 * Everything a running timer does that must not depend on the timer screen
 * being mounted: re-sampling the clock, haptic and audible cues, keep-awake,
 * and background alerts. Mounted once in the root layout. Renders nothing but
 * the keep-awake holder, so its 4 Hz re-render stays local.
 */
export function TimerRunEffects() {
  const { timer } = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.getSnapshot
  );
  const { status, currentStageIndex, remainingSeconds, stages } = timer;

  useEffect(() => {
    installNotificationHandler();
  }, []);

  // The clock only re-samples Date.now(); the countdown itself is derived from
  // timestamps in the store, so a missed or late interval costs nothing.
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(timerStore.sync, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  // Background alerts: while running, schedule one notification per upcoming
  // cue the moment the app leaves the foreground, and clear them all on return.
  // Anything that is not running (paused, reset, finished) clears them too.
  useEffect(() => {
    if (status !== 'running') {
      void cancelCueAlerts();
      return;
    }
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void cancelCueAlerts();
        return;
      }
      timerStore.sync();
      const { timer: current } = timerStore.getSnapshot();
      void scheduleCueAlerts(upcomingCues(current), Date.now());
    });
    return () => subscription.remove();
  }, [status]);

  // Stage-boundary cues: haptic plus sound. The first render is skipped so
  // loading a preset or remounting does not buzz.
  const prevStageRef = useRef(currentStageIndex);
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const stageChanged = currentStageIndex !== prevStageRef.current;
    const justCompleted =
      status === 'completed' && prevStatusRef.current !== 'completed';
    prevStageRef.current = currentStageIndex;
    prevStatusRef.current = status;

    if (justCompleted) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void playCue('stage');
    } else if (stageChanged && status === 'running') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      void playCue('stage');
    }
  }, [currentStageIndex, status]);

  // Agitation cues: haptic on entering/leaving an agitation window, plus a
  // sound on entering. Tracked with its own refs so a stage change is detected
  // here too and skipped: the stage-boundary cue already fired that tick.
  const prevAgitatingRef = useRef(false);
  const prevAgitationStageRef = useRef(currentStageIndex);
  useEffect(() => {
    const stage = stages[currentStageIndex];
    const pattern = stage?.agitationPattern ?? null;
    const stageChanged = currentStageIndex !== prevAgitationStageRef.current;
    prevAgitationStageRef.current = currentStageIndex;

    if (!pattern || status !== 'running') {
      prevAgitatingRef.current = false;
      return;
    }

    const elapsed = stage.durationSeconds - remainingSeconds;
    const windows = agitationWindows(pattern, stage.durationSeconds);
    const { agitating } = agitationStateAt(windows, elapsed);

    if (stageChanged) {
      prevAgitatingRef.current = agitating;
      return;
    }

    if (agitating && !prevAgitatingRef.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void playCue('agitate');
    } else if (!agitating && prevAgitatingRef.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevAgitatingRef.current = agitating;
  }, [stages, currentStageIndex, remainingSeconds, status]);

  return isRunActive(timer) ? <KeepAwakeWhileActive /> : null;
}
