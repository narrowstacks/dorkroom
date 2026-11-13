// Native half of the Process Timer Live Activity: expo-widgets behind the
// `LiveActivityNative` interface, and the one controller the app drives.
// `syncLiveActivity()` is the only thing the rest of the app calls. The
// lifecycle rules live in `live-activity-controller.ts` and are tested there.
// Native, so verify in the Simulator or on device (a development build with the
// expo-widgets config plugin is required; Expo Go has no widget extension).
import { requireOptionalNativeModule } from 'expo';
import type { LiveActivity } from 'expo-widgets';
import { AppState } from 'react-native';
import { getSafelight, subscribeSafelight } from '@/lib/safelight-store';
import { backgroundAlerts } from './background-alerts-native';
import { createFirstActive } from './first-active';
import {
  type ActivityHandle,
  createLiveActivityController,
  createTitleResolver,
  type EndPolicy,
  type LiveActivityController,
  type LiveActivityNative,
  NOOP_NATIVE,
  selectNative,
  UNAVAILABLE_WARNING,
} from './live-activity-controller';
import {
  createInteractionHandler,
  createTimerActionRunner,
} from './live-activity-interaction';
import type { TimerActivityProps } from './live-activity-props';
import { listPresets } from './presets-storage';
import { timerStore } from './timer-store';
import type { TimerAction } from './types';

/** Names the layout stored for the extension. */
const ACTIVITY_NAME = 'ProcessTimer';

/**
 * Pause/Resume and Skip on the Lock Screen and in the expanded island. Turn off
 * to ship a display-only activity (the buttons are not drawn).
 */
const SHOW_CONTROLS = true;

/** Lets the rest of the app (the alert effect, the idle clean-up) wait for the first foreground. */
export const firstActive = createFirstActive(AppState);

// `expo-widgets` calls `requireNativeModule` when it is imported, which throws on
// a dev client built without it, so it (and the widget file, which imports the
// native views of `@expo/ui`) are required lazily, only once the native module
// is known to exist. The Babel `'widget'` transform works on the widget file
// wherever it is required from.
type WidgetsModule = typeof import('expo-widgets');
type WidgetFile = typeof import('./live-activity-widget');

function loadWidgets(): { widgets: WidgetsModule; file: WidgetFile } | null {
  if (!requireOptionalNativeModule('ExpoWidgets')) return null;
  try {
    const widgets: WidgetsModule = require('expo-widgets');
    const file: WidgetFile = require('./live-activity-widget');
    return { widgets, file };
  } catch {
    return null;
  }
}

function wrap(
  widgets: WidgetsModule,
  activity: LiveActivity<TimerActivityProps>
): ActivityHandle {
  return {
    id: activity.getId(),
    update: (props, staleAtMs) =>
      activity.update(
        props,
        staleAtMs === null ? undefined : new Date(staleAtMs)
      ),
    end: (policy: EndPolicy, finalProps) =>
      activity.end(
        policy.kind === 'immediate'
          ? 'immediate'
          : widgets.after(new Date(policy.atMs)),
        finalProps ?? undefined
      ),
  };
}

function createNative(
  widgets: WidgetsModule,
  layout: WidgetFile['timerLiveActivity']
): LiveActivityNative {
  const factory = widgets.createLiveActivity<TimerActivityProps>(
    ACTIVITY_NAME,
    layout
  );
  return {
    start: (props, url, staleAtMs) =>
      wrap(
        widgets,
        factory.start(
          props,
          url,
          staleAtMs === null ? undefined : new Date(staleAtMs)
        )
      ),
    list: () => factory.getInstances().map((a) => wrap(widgets, a)),
  };
}

const findPresetName = (id: string): string | null => {
  try {
    return listPresets().find((p) => p.id === id)?.name ?? null;
  } catch {
    return null;
  }
};

interface LiveActivityRuntime {
  controller: LiveActivityController;
  titleOf: (presetId: string) => string | null;
}

interface RuntimeActions {
  /** Report the store's timer to the activity: the one path for every caller. */
  sync: () => void;
  /** A timer control pressed outside the timer screen (see `runTimerAction`). */
  runAction: (action: TimerAction) => Promise<void>;
}

/**
 * The actions over a runtime's controller. They hold no state of their own, so
 * building them again (each Fast Refresh) over the same controller behaves the
 * same.
 */
function runtimeActions(
  controller: LiveActivityController,
  titleOf: (presetId: string) => string | null
): RuntimeActions {
  const sync = () => {
    const { timer, selectedPresetId, anchorMs } = timerStore.getSnapshot();
    controller.sync({
      timer,
      asOfMs: anchorMs,
      title: titleOf(selectedPresetId),
      safelight: getSafelight(),
    });
  };
  const runAction = createTimerActionRunner({
    store: timerStore,
    alerts: backgroundAlerts,
    activity: { sync, flushNow: controller.flushNow },
  });
  return { sync, runAction };
}

function createRuntime(): LiveActivityRuntime {
  const loaded = loadWidgets();
  const choice = loaded
    ? selectNative(loaded.file.timerLiveActivity, () =>
        createNative(loaded.widgets, loaded.file.timerLiveActivity)
      )
    : { native: NOOP_NATIVE, warning: UNAVAILABLE_WARNING };
  if (choice.warning !== null && __DEV__) console.warn(choice.warning);
  const controller = createLiveActivityController({
    native: choice.native,
    controls: SHOW_CONTROLS,
  });
  const runtime: LiveActivityRuntime = {
    controller,
    titleOf: createTitleResolver(findPresetName),
  };
  const { sync } = runtimeActions(runtime.controller, runtime.titleOf);

  // The red look follows the mode as soon as it is switched, even while paused.
  subscribeSafelight(sync);

  // A run does not survive the app being killed, so an activity found at launch
  // belongs to a run that no longer exists. Ended only once the app is in front:
  // iOS can also launch it in the background for a Lock Screen button press, and
  // then the activity is still the user's.
  firstActive.onFirstActive(() => void controller.endOrphans());

  // A button on the activity runs `LiveActivityUserInteraction` in the app's
  // process, which posts this event to JS (the Swift side holds background time
  // meanwhile, see plugins/with-widget-interaction-hold). It reaches JS only
  // while the process is alive.
  if (loaded && choice.warning === null) {
    try {
      const handle = createInteractionHandler({
        owns: controller.owns,
        store: timerStore,
        alerts: backgroundAlerts,
        activity: { sync, flushNow: controller.flushNow },
      });
      loaded.widgets.addUserInteractionListener((event) => {
        handle(event).catch(() => {
          // The alerts or the activity could not be updated; the next state
          // change retries, and the timer itself already changed.
        });
      });
    } catch {
      // An older dev client without the event: the buttons simply do nothing.
    }
  }
  return runtime;
}

declare global {
  // Fast Refresh re-evaluates this module; a second controller would end a live
  // run's activity as an "orphan" and double the listeners. Development only.
  var __dorkroomLiveActivity: LiveActivityRuntime | undefined;
}

let cached: LiveActivityRuntime | undefined;

function getRuntime(): LiveActivityRuntime {
  if (!__DEV__) return (cached ??= createRuntime());
  return (globalThis.__dorkroomLiveActivity ??= createRuntime());
}

const live = getRuntime();
const actions = runtimeActions(live.controller, live.titleOf);

/** Report the store's timer to the Live Activity. Safe to call as often as you like. */
export const syncLiveActivity: () => void = actions.sync;

/**
 * Pause, resume or skip from outside the timer screen (the tab bar accessory),
 * by the same steps as a Live Activity button: the timer, then the alerts, then
 * the activity at once. The timer changes before this returns; the promise
 * settles once the alerts and the activity are done, and never rejects (a
 * failed alert or activity update is retried by the next state change).
 */
export function runTimerAction(action: TimerAction): Promise<void> {
  return actions.runAction(action).catch(() => {});
}
