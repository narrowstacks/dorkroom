// Background alerts for a running timer (expo-notifications). iOS suspends JS
// when the app is backgrounded, so the only way to be told a stage ended is a
// local notification scheduled ahead of time. While the app is backgrounded we
// schedule one per upcoming cue (`upcomingCues`); on return, or when the run
// stops, every one is cancelled. Native, so verify in the Simulator or on device.
//
// If the app is killed while backgrounded the scheduled alerts still fire (iOS
// owns them), but the run itself is not restored on relaunch.
import * as Notifications from 'expo-notifications';
import { createCueAlertQueue } from './cue-alert-queue';
import type { TimerCue } from './cues';

const SOUNDS = {
  stage: 'cue-stage.wav',
  agitate: 'cue-agitate.wav',
} satisfies Record<TimerCue['kind'], string>;

/** Foregrounded notifications stay quiet: the in-app cues already cover that. */
export function installNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for permission in context, the first time a run starts. Returns whether
 * alerts can be delivered. A refusal is final until the user changes it in
 * Settings, so later calls only read the status and never prompt again.
 */
export async function ensureAlertPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true },
    });
    return requested.granted;
  } catch {
    return false;
  }
}

const alertQueue = createCueAlertQueue({
  cancelAll: () => Notifications.cancelAllScheduledNotificationsAsync(),
  scheduleAt: (cue, date) =>
    Notifications.scheduleNotificationAsync({
      content: { title: cue.title, body: cue.body, sound: SOUNDS[cue.kind] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    }),
});

/** Replace any pending alerts with one per cue. Rejects when iOS refuses. */
export const scheduleCueAlerts = alertQueue.schedule;

/** Clear every pending alert. Rejects when iOS refuses. */
export const cancelCueAlerts = alertQueue.cancel;
