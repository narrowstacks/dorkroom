import type { LiveActivityComponent } from 'expo-widgets';
// The Live Activity lifecycle for a Process Timer run, with the native calls
// behind a small interface so it is testable with a fake. One activity at a
// time, started with a run, updated only when the schedule changes (never on a
// tick), and ended on reset or completion. Everything is serialised through one
// queue so a start can never be overtaken by the end that follows it.
import {
  activityPropsChanged,
  buildActivityProps,
  dismissalFor,
  LIVE_ACTIVITY_URL,
  staleDateFor,
  type TimerActivityProps,
} from './live-activity-props';
import type { TimerState } from './types';

export type EndPolicy = { kind: 'immediate' } | { kind: 'after'; atMs: number };

export interface ActivityHandle {
  id: string;
  update: (
    props: TimerActivityProps,
    staleAtMs: number | null
  ) => Promise<void>;
  end: (
    policy: EndPolicy,
    finalProps: TimerActivityProps | null
  ) => Promise<void>;
}

export interface LiveActivityNative {
  /** Throws when Live Activities are unavailable or switched off by the user. */
  start: (
    props: TimerActivityProps,
    url: string,
    staleAtMs: number | null
  ) => ActivityHandle;
  /** Activities of this type that are still on screen, from any earlier process. */
  list: () => ActivityHandle[];
}

export interface SyncInput {
  timer: TimerState;
  /** The wall-clock time `timer` describes. */
  asOfMs: number;
  title: string | null;
  safelight: boolean;
}

export interface Scheduler {
  setTimeout: (run: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface LiveActivityControllerOptions {
  native: LiveActivityNative;
  /** Draw the Pause/Resume and Skip buttons. */
  controls: boolean;
  now?: () => number;
  scheduler?: Scheduler;
  /** Updates closer together than this collapse into the latest one. */
  debounceMs?: number;
}

export interface LiveActivityController {
  /** Report the timer. Cheap: call on any change; it only talks to iOS when the schedule changed. */
  sync: (input: SyncInput) => void;
  /**
   * Send the queued update at once instead of after the debounce, and resolve
   * when iOS has it. For work that must finish before the app can be suspended.
   */
  flushNow: () => Promise<void>;
  /** End every activity left from an earlier process. Resolves when done. */
  endOrphans: () => Promise<void>;
  /** Whether `id` is the activity this controller is driving. */
  owns: (id: string) => boolean;
  /** Resolves once every queued native call has finished (for tests). */
  idle: () => Promise<void>;
}

/** The platform's timers, keyed by our own ids so the handle type never leaks. */
function platformScheduler(): Scheduler {
  const handles = new Map<number, ReturnType<typeof setTimeout>>();
  let next = 0;
  return {
    setTimeout: (run, ms) => {
      next += 1;
      const id = next;
      handles.set(
        id,
        setTimeout(() => {
          handles.delete(id);
          run();
        }, ms)
      );
      return id;
    },
    clearTimeout: (id) => {
      const handle = handles.get(id);
      if (handle !== undefined) clearTimeout(handle);
      handles.delete(id);
    },
  };
}

export const DEFAULT_DEBOUNCE_MS = 200;

export function createLiveActivityController(
  options: LiveActivityControllerOptions
): LiveActivityController {
  const {
    native,
    controls,
    now = Date.now,
    scheduler = platformScheduler(),
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options;

  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void> | void): void => {
    const run = async () => {
      try {
        await task();
      } catch {
        // iOS refused or the activity is gone; the timer works without it.
      }
    };
    queue = queue.then(run, run);
  };

  let handle: ActivityHandle | null = null;
  let sent: TimerActivityProps | null = null;
  let runId: string | null = null;
  /** Starting failed or the user dismissed it: leave it be until the next run. */
  let suppressed = false;
  let pending: TimerActivityProps | null = null;
  let pendingTimer: number | null = null;

  const clearPending = () => {
    if (pendingTimer !== null) scheduler.clearTimeout(pendingTimer);
    pendingTimer = null;
    pending = null;
  };

  const flush = () => {
    pendingTimer = null;
    const props = pending;
    pending = null;
    const target = handle;
    if (props === null || target === null) return;
    if (!activityPropsChanged(sent, props)) return;
    sent = props;
    enqueue(async () => {
      try {
        await target.update(props, staleDateFor(props));
      } catch {
        // The activity was dismissed from the Lock Screen: do not bring it back.
        if (handle === target) {
          handle = null;
          sent = null;
          suppressed = true;
        }
      }
    });
  };

  const finishRun = () => {
    clearPending();
    handle = null;
    sent = null;
  };

  const sync = (input: SyncInput): void => {
    const { timer, asOfMs } = input;

    if (timer.status === 'idle' || timer.stages.length === 0) {
      const ending = handle;
      finishRun();
      runId = null;
      suppressed = false;
      if (ending) enqueue(() => ending.end({ kind: 'immediate' }, null));
      return;
    }

    if (timer.status === 'completed') {
      const ending = handle;
      // A run that was last shown running ended at its scheduled end, which may
      // be before the app noticed. One last shown paused cannot have run out on
      // its own (the shown end is a stale estimate): Skip finished it now.
      const last = pending ?? sent;
      const finishedAt =
        last?.status === 'running' ? Math.min(last.endMs, asOfMs) : asOfMs;
      finishRun();
      if (!ending) return;
      const props = buildActivityProps({
        timer,
        asOfMs,
        runId: runId ?? String(asOfMs),
        title: input.title,
        safelight: input.safelight,
        controls,
      });
      const policy = dismissalFor(finishedAt, now());
      enqueue(() => ending.end(policy, props));
      return;
    }

    if (runId === null) runId = String(asOfMs);
    const props = buildActivityProps({
      timer,
      asOfMs,
      runId,
      title: input.title,
      safelight: input.safelight,
      controls,
    });
    if (props === null || suppressed) return;

    if (handle === null) {
      try {
        handle = native.start(props, LIVE_ACTIVITY_URL, staleDateFor(props));
        sent = props;
      } catch {
        // Switched off in Settings, or not supported: silent, once per run.
        suppressed = true;
      }
      return;
    }

    if (!activityPropsChanged(pending ?? sent, props)) return;
    pending = props;
    if (pendingTimer !== null) scheduler.clearTimeout(pendingTimer);
    pendingTimer = scheduler.setTimeout(flush, debounceMs);
  };

  return {
    sync,
    flushNow: () => {
      if (pendingTimer !== null) scheduler.clearTimeout(pendingTimer);
      flush();
      return queue;
    },
    owns: (id) => handle !== null && handle.id === id,
    endOrphans: () => {
      // Listed now, not when the queue gets to it: an activity this process
      // starts in between must never be mistaken for a leftover.
      let orphans: ActivityHandle[] = [];
      try {
        orphans = native.list();
      } catch {
        // Unsupported or disabled: there is nothing to end.
      }
      enqueue(async () => {
        await Promise.all(
          orphans.map((orphan) =>
            orphan.end({ kind: 'immediate' }, null).catch(() => {
              // Already gone.
            })
          )
        );
      });
      return queue;
    },
    idle: () => queue,
  };
}

/** What stands in when Live Activities cannot be used at all: nothing starts, nothing is listed. */
export const NOOP_NATIVE: LiveActivityNative = {
  start: () => {
    throw new Error('Live Activities are not available in this build');
  },
  list: () => [],
};

export const UNAVAILABLE_WARNING =
  'Live Activity disabled: this JS bundle or dev client lacks expo-widgets support. ' +
  'Restart Metro with --clear (the widget directive was not compiled) or rebuild the dev client.';

/** The widget layout as it is at runtime: a string once compiled, else the plain function. */
export type WidgetLayoutSource =
  string | LiveActivityComponent<TimerActivityProps>;

export interface NativeChoice {
  native: LiveActivityNative;
  /** Set when the no-op stand-in was chosen; the caller logs it in development. */
  warning: string | null;
}

/**
 * Pick the real native object, or the no-op one so a stale bundler or an older
 * dev client can never crash the app at startup. The widget layout must be a
 * STRING by now (the Babel transform ran); a function means the transform did
 * not, and `create` (which would throw on it) is not even tried.
 */
export function selectNative(
  layout: WidgetLayoutSource,
  create: () => LiveActivityNative
): NativeChoice {
  if (layout instanceof Function) {
    return { native: NOOP_NATIVE, warning: UNAVAILABLE_WARNING };
  }
  try {
    return { native: create(), warning: null };
  } catch {
    return { native: NOOP_NATIVE, warning: UNAVAILABLE_WARNING };
  }
}

/** Memoises the preset-name lookup on the selected id (the lookup parses storage). */
export function createTitleResolver(
  find: (presetId: string) => string | null
): (presetId: string) => string | null {
  let lastId: string | null = null;
  let lastTitle: string | null = null;
  return (presetId) => {
    if (presetId === lastId) return lastTitle;
    lastId = presetId;
    lastTitle = presetId ? find(presetId) : null;
    return lastTitle;
  };
}
