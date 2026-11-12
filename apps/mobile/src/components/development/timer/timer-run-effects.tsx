import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { agitationStateAt, agitationWindows } from '@/lib/timer/agitation';
import { backgroundAlerts } from '@/lib/timer/background-alerts-native';
import { playCue } from '@/lib/timer/cue-audio';
import { firstActive, syncLiveActivity } from '@/lib/timer/live-activity';
import { installNotificationHandler } from '@/lib/timer/timer-alerts';
import { isRunActive, timerStore } from '@/lib/timer/timer-store';

/** How often the display re-samples the wall clock while a run is going. */
const SYNC_INTERVAL_MS = 250;

/** iOS refused an alert change: the claim was released, so the next state change retries it. */
const retryLater = () => {};

type TimerSnapshot = ReturnType<typeof timerStore.getSnapshot>['timer'];

function isAgitating(timer: TimerSnapshot): boolean {
  const stage = timer.stages[timer.currentStageIndex];
  const pattern = stage?.agitationPattern ?? null;
  if (!stage || !pattern || timer.status !== 'running') return false;
  const windows = agitationWindows(pattern, stage.durationSeconds);
  return agitationStateAt(
    windows,
    stage.durationSeconds - timer.remainingSeconds
  ).agitating;
}

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
  const { timer, anchorMs } = useSyncExternalStore(
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

  // The Live Activity follows the schedule, not the clock: the system counts
  // its timers down by itself, so it is told only when something changes. This
  // effect has no dependency list on purpose: the controller compares what it
  // would send with what it last sent, so a tick costs one cheap comparison.
  useEffect(() => {
    syncLiveActivity();
  });

  // Coming back to the front refreshes which stage the activity highlights, and
  // lets a run that finished meanwhile end its activity.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      timerStore.sync();
      syncLiveActivity();
    });
    return () => subscription.remove();
  }, []);

  // Last values the cue effects below have seen. The foreground handler also
  // writes them, so catching up after a background stretch is silent.
  const prevStageRef = useRef(currentStageIndex);
  const prevStatusRef = useRef(status);
  const prevAgitatingRef = useRef(false);
  const prevAgitationStageRef = useRef(currentStageIndex);

  // Background alerts: while running, schedule one notification per upcoming
  // cue the moment the app leaves the foreground, and clear them all on return.
  // Anything that is not running (paused, reset, finished) clears them too.
  // `backgroundAlerts` owns what is scheduled, idempotently, because the Lock
  // Screen buttons settle it from outside React too.
  useEffect(() => {
    if (status !== 'running') {
      // A background launch (iOS starting the app for a Live Activity button)
      // has no run in memory, but alerts already scheduled are still valid:
      // clear them only once the app has really been in front.
      if (status === 'idle' && !firstActive.hasBeenActive()) {
        return firstActive.onFirstActive(
          () => void backgroundAlerts.stop().catch(retryLater)
        );
      }
      void backgroundAlerts.stop().catch(retryLater);
      return;
    }
    // Catch the store up and adopt the result as the cue baseline. Stage ends
    // and agitation starts that pass while the app is not in front are
    // announced by notifications (or not at all while merely inactive), so
    // they must never replay as late beeps once it is.
    const adoptBaseline = () => {
      timerStore.sync();
      const { timer: now } = timerStore.getSnapshot();
      prevStageRef.current = now.currentStageIndex;
      prevStatusRef.current = now.status;
      prevAgitationStageRef.current = now.currentStageIndex;
      prevAgitatingRef.current = isAgitating(now);
    };
    const subscription = AppState.addEventListener('change', (next) => {
      adoptBaseline();
      if (next === 'active') {
        void backgroundAlerts.foreground().catch(retryLater);
        return;
      }
      const snapshot = timerStore.getSnapshot();
      void backgroundAlerts
        .ensure({ timer: snapshot.timer, anchorMs: snapshot.anchorMs })
        .catch(retryLater);
    });
    return () => subscription.remove();
  }, [status]);

  // The run can change while the app is out of the foreground (a Resume or Skip
  // from the Live Activity wakes it briefly, a stage can end while JS still
  // runs): the alerts already scheduled describe the old schedule. No
  // dependency list: `ensure` returns at once in the foreground and when the
  // state is the one it already handled, so a tick costs one key comparison.
  useEffect(() => {
    if (!firstActive.hasBeenActive()) return;
    void backgroundAlerts.ensure({ timer, anchorMs }).catch(retryLater);
  });

  // Stage-boundary cues: haptic plus sound. The first render is skipped so
  // loading a preset or remounting does not buzz.
  useEffect(() => {
    const stageChanged = currentStageIndex !== prevStageRef.current;
    const justCompleted =
      status === 'completed' && prevStatusRef.current !== 'completed';
    prevStageRef.current = currentStageIndex;
    prevStatusRef.current = status;

    // Out of the foreground the cue is the notification's job.
    if (AppState.currentState !== 'active') return;

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

    if (AppState.currentState !== 'active') {
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
