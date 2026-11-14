// Native half of the Home Screen / Lock Screen widgets: expo-widgets behind
// `WidgetNative`, the three `Widget` objects, and what pushes their timelines.
// Constructing a `Widget` writes its layout string to the App Group, so all
// three are built ONCE when this module loads (at app start, through
// `TimerRunEffects`), before any is placed: without a stored layout the system
// draws a "No layout found" box. The widgets read only what is pushed here;
// the film log itself stays in the app's own container.
//
// When each pushes (all also at load and whenever the app becomes active):
// - the roll: when the film log's rolls or cameras, or the Meter's roll, change
//   (MMKV value listeners, coalesced so a burst of writes is parsed once);
// - last answers: when a tool records a result (`last-result-store`);
// - the timer: from `TimerRunEffects`, on every render and on foreground, like
//   the Live Activity, and at once after a Live Activity button press
//   (`flushTimerWidget`, from `createTimerActionRunner`); the pusher sends only
//   when the schedule changed.
// Identical props or schedules are never pushed again (`widget-sync.ts`).
//
// Native, so verify in the Simulator or on device (a development build with
// the expo-widgets config plugin is required).
import { requireOptionalNativeModule } from 'expo';
import { AppState } from 'react-native';
import {
  getCameras,
  getRolls,
  KEYS as FILM_LOG_KEYS,
  storage as filmLogStorage,
} from '@/lib/film-log-storage';
import {
  getLastResults,
  KEY as LAST_RESULTS_KEY,
  storage as lastResultStorage,
} from '@/lib/last-result-store';
import { METER_ROLL_KEY } from '@/lib/meter-roll';
import { meterStorage } from '@/lib/meter-settings';
import { getLastRun } from '@/lib/timer/last-run';
import { createTitleResolver } from '@/lib/timer/live-activity-controller';
import { listPresets } from '@/lib/timer/presets-storage';
import { timerStore } from '@/lib/timer/timer-store';
import {
  TIMER_WIDGET_NAME,
  timerScheduleChanged,
  timerWidgetEntries,
  type TimerWidgetProps,
  type TimerWidgetSchedule,
  timerWidgetSchedule,
} from '@/lib/timer/widget-timeline';
import {
  buildLastResultWidgetProps,
  LAST_RESULT_WIDGET_NAME,
  type LastResultWidgetProps,
} from './last-result-widget-props';
import {
  buildRollWidgetProps,
  ROLL_WIDGET_NAME,
  type RollWidgetProps,
} from './roll-widget-props';
import { widgetPalette } from './widget-palette';
import {
  createCoalescer,
  createWidgetPusher,
  platformScheduler,
  propsChanged,
  selectWidgetNative,
  snapshotTimeline,
  type WidgetEntry,
  type WidgetPusher,
  WIDGETS_UNAVAILABLE_WARNING,
} from './widget-sync';

/**
 * Film log and last-result writes come in bursts (a form saves several keys):
 * they are coalesced for this long and the store parsed once, after the burst.
 */
const DATA_DEBOUNCE_MS = 300;
/** The Live Activity's debounce: a pause and a quick resume collapse into one push. */
const TIMER_DEBOUNCE_MS = 200;

// `expo-widgets` calls `requireNativeModule` when it is imported, which throws
// on a dev client built without it, so it and the layout files (which import
// the native views of `@expo/ui`) are required lazily, only once the native
// module is known to exist (as `live-activity.ts` does).
type WidgetsModule = typeof import('expo-widgets');
interface Layouts {
  roll: (typeof import('./roll-widget'))['rollWidget'];
  lastResult: (typeof import('./last-result-widget'))['lastResultWidget'];
  timer: (typeof import('./timer-widget'))['timerWidget'];
}

function loadWidgets(): { widgets: WidgetsModule; layouts: Layouts } | null {
  if (!requireOptionalNativeModule('ExpoWidgets')) return null;
  try {
    const widgets: WidgetsModule = require('expo-widgets');
    const roll: typeof import('./roll-widget') = require('./roll-widget');
    const lastResult: typeof import('./last-result-widget') = require('./last-result-widget');
    const timer: typeof import('./timer-widget') = require('./timer-widget');
    return {
      widgets,
      layouts: {
        roll: roll.rollWidget,
        lastResult: lastResult.lastResultWidget,
        timer: timer.timerWidget,
      },
    };
  } catch {
    return null;
  }
}

/** One push per widget: stores the timeline in the App Group and reloads it. */
interface WidgetsNative {
  roll: (entries: WidgetEntry<RollWidgetProps>[]) => void;
  lastResult: (entries: WidgetEntry<LastResultWidgetProps>[]) => void;
  timer: (entries: WidgetEntry<TimerWidgetProps>[]) => void;
}

/** Stands in when widgets cannot be used: every push is dropped. */
const NOOP_WIDGETS: WidgetsNative = {
  roll: () => {},
  lastResult: () => {},
  timer: () => {},
};

function createNative(widgets: WidgetsModule, layouts: Layouts): WidgetsNative {
  // Each constructor stores its layout in the App Group, so no widget ever
  // shows "No layout found" once the app has run.
  const roll = new widgets.Widget(ROLL_WIDGET_NAME, layouts.roll);
  const lastResult = new widgets.Widget(
    LAST_RESULT_WIDGET_NAME,
    layouts.lastResult
  );
  const timer = new widgets.Widget(TIMER_WIDGET_NAME, layouts.timer);
  return {
    roll: (entries) => roll.updateTimeline(entries),
    lastResult: (entries) => lastResult.updateTimeline(entries),
    timer: (entries) => timer.updateTimeline(entries),
  };
}

interface WidgetsRuntime {
  roll: WidgetPusher<RollWidgetProps, RollWidgetProps>;
  lastResult: WidgetPusher<LastResultWidgetProps, LastResultWidgetProps>;
  timer: WidgetPusher<TimerWidgetSchedule, TimerWidgetProps>;
  titleOf: (presetId: string) => string | null;
  /** The end of the run as last offered while running, for "Done"'s time. */
  runEndMs: number | null;
}

const findPresetName = (id: string): string | null => {
  try {
    return listPresets().find((p) => p.id === id)?.name ?? null;
  } catch {
    return null;
  }
};

function syncRoll(runtime: WidgetsRuntime): void {
  const props = buildRollWidgetProps({
    rolls: getRolls(),
    cameras: getCameras(),
    meterRollId: meterStorage.getString(METER_ROLL_KEY),
  });
  runtime.roll.offer(props, () => snapshotTimeline(props, Date.now()));
}

function syncLastResult(runtime: WidgetsRuntime): void {
  const props = buildLastResultWidgetProps(getLastResults());
  runtime.lastResult.offer(props, () => snapshotTimeline(props, Date.now()));
}

const TIMER_PALETTE = widgetPalette('teal');

function syncTimer(runtime: WidgetsRuntime): void {
  const { timer, selectedPresetId, anchorMs } = timerStore.getSnapshot();
  // The last run is read only when idle (it is all the idle state shows), so a
  // running timer's 4 Hz renders never parse it.
  const lastRun = timer.status === 'idle' ? getLastRun() : null;
  // A run seen running and then completed ended at its scheduled end, which
  // may be before the app noticed (the Live Activity's controller does the same).
  const finishedAtMs =
    timer.status === 'completed' && runtime.runEndMs !== null
      ? Math.min(runtime.runEndMs, anchorMs)
      : null;
  const schedule = timerWidgetSchedule(
    { timer, title: runtime.titleOf(selectedPresetId), lastRun, finishedAtMs },
    anchorMs,
    TIMER_PALETTE
  );
  if (schedule.status === 'running') runtime.runEndMs = schedule.runEndMs;
  else if (schedule.status !== 'done') runtime.runEndMs = null;
  runtime.timer.offer(schedule, () => timerWidgetEntries(schedule, Date.now()));
}

function createRuntime(): WidgetsRuntime {
  const loaded = loadWidgets();
  const choice = loaded
    ? selectWidgetNative(
        [loaded.layouts.roll, loaded.layouts.lastResult, loaded.layouts.timer],
        () => createNative(loaded.widgets, loaded.layouts),
        NOOP_WIDGETS
      )
    : { native: NOOP_WIDGETS, warning: WIDGETS_UNAVAILABLE_WARNING };
  if (choice.warning !== null && __DEV__) console.warn(choice.warning);
  const scheduler = platformScheduler();
  const runtime: WidgetsRuntime = {
    roll: createWidgetPusher({
      push: choice.native.roll,
      changed: propsChanged,
      scheduler,
      // The listener below already coalesces the burst.
      debounceMs: 0,
    }),
    lastResult: createWidgetPusher({
      push: choice.native.lastResult,
      changed: propsChanged,
      scheduler,
      debounceMs: 0,
    }),
    timer: createWidgetPusher({
      push: choice.native.timer,
      changed: timerScheduleChanged,
      scheduler,
      debounceMs: TIMER_DEBOUNCE_MS,
    }),
    titleOf: createTitleResolver(findPresetName),
    runEndMs: null,
  };
  const rollSoon = createCoalescer(
    () => syncRoll(runtime),
    DATA_DEBOUNCE_MS,
    scheduler
  );
  const lastResultSoon = createCoalescer(
    () => syncLastResult(runtime),
    DATA_DEBOUNCE_MS,
    scheduler
  );

  const rollKeys: readonly string[] = [
    FILM_LOG_KEYS.rolls,
    FILM_LOG_KEYS.cameras,
  ];
  filmLogStorage.addOnValueChangedListener((key) => {
    if (rollKeys.includes(key)) rollSoon();
  });
  meterStorage.addOnValueChangedListener((key) => {
    if (key === METER_ROLL_KEY) rollSoon();
  });
  lastResultStorage.addOnValueChangedListener((key) => {
    if (key === LAST_RESULTS_KEY) lastResultSoon();
  });
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') return;
    syncRoll(runtime);
    syncLastResult(runtime);
    syncTimer(runtime);
  });

  syncRoll(runtime);
  syncLastResult(runtime);
  syncTimer(runtime);
  return runtime;
}

declare global {
  // Fast Refresh re-evaluates this module; a second runtime would double the
  // storage listeners. Development only.
  var __dorkroomWidgets: WidgetsRuntime | undefined;
}

let cached: WidgetsRuntime | undefined;

function getRuntime(): WidgetsRuntime {
  if (!__DEV__) return (cached ??= createRuntime());
  return (globalThis.__dorkroomWidgets ??= createRuntime());
}

const runtime = getRuntime();

/** Push the roll in the camera if it changed. Safe to call as often as you like. */
export const syncRollWidget = (): void => syncRoll(runtime);
/** Push the recorded last answers if they changed. */
export const syncLastResultWidget = (): void => syncLastResult(runtime);
/** Push the timer's timeline if its schedule changed (never on a tick). */
export const syncTimerWidget = (): void => syncTimer(runtime);
/**
 * Push a pending timer change at once, skipping the debounce. A Live Activity
 * button runs in a short background window, so it syncs and flushes the widget
 * itself (`createTimerActionRunner`) instead of waiting for a React render.
 */
export const flushTimerWidget = (): void => runtime.timer.flushNow();
