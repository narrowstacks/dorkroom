// Pure half of the widget sync: when to push a widget's timeline, what the
// timeline holds, and which native object to push it to. A push writes the App
// Group and asks WidgetKit to reload that widget, and WidgetKit budgets
// reloads, so a push happens only when what the widget would show changed,
// never on a tick or an identical write. The native call is passed in as
// `push`, so this is testable.

/** One timeline entry, as expo-widgets' `Widget.updateTimeline` takes it. */
export interface WidgetEntry<P> {
  date: Date;
  props: P;
}

export interface Scheduler {
  setTimeout: (run: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

/**
 * How far ahead the keep-alive copy of the last entry is dated: a year. No
 * layout depends on the time of day, so a copy that far out shows the same
 * thing and only postpones `.atEnd`'s reload request; any launch or change
 * pushes a fresh timeline long before it is reached.
 */
export const KEEP_ALIVE_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Drops the entries that are wholly in the past at `nowMs`: the entry current
 * at `nowMs` (the last one dated at or before it) is kept, with everything
 * after it. WidgetKit's snapshot (the gallery preview) shows the FIRST entry,
 * so it is the current one, never a finished stage. Entries must be in date
 * order.
 */
export function dropPastEntries<P>(
  entries: readonly WidgetEntry<P>[],
  nowMs: number
): WidgetEntry<P>[] {
  let current = 0;
  entries.forEach((entry, i) => {
    if (entry.date.getTime() <= nowMs) current = i;
  });
  return entries.slice(current);
}

/**
 * Appends a copy of the last entry dated `KEEP_ALIVE_MS` after the later of
 * its own date and `nowMs`. expo-widgets' timelines use the `.atEnd` policy:
 * once every entry is in the past WidgetKit asks for a new timeline, gets the
 * same one, and asks again. A last entry a year out postpones that end; the
 * app pushes a new timeline long before it is reached.
 */
export function withKeepAlive<P>(
  entries: readonly WidgetEntry<P>[],
  nowMs: number
): WidgetEntry<P>[] {
  const last = entries[entries.length - 1];
  if (last === undefined) return [];
  const from = Math.max(last.date.getTime(), nowMs);
  return [
    ...entries,
    { date: new Date(from + KEEP_ALIVE_MS), props: last.props },
  ];
}

/** A widget that shows one thing until the app changes it: now, and the keep-alive. */
export function snapshotTimeline<P>(props: P, nowMs: number): WidgetEntry<P>[] {
  return withKeepAlive([{ date: new Date(nowMs), props }], nowMs);
}

/** Two snapshot keys (the props) differ when their JSON does. */
export function propsChanged<K>(prev: K | null, next: K): boolean {
  return prev === null || JSON.stringify(prev) !== JSON.stringify(next);
}

export interface WidgetPusher<K, P> {
  /**
   * Offer what the widget should show now, as a KEY (what decides whether the
   * widget changed: a snapshot's props, the timer's schedule) and how to build
   * the timeline from it. Cheap when the key did not change (one comparison;
   * `build` is not called); otherwise the timeline is built and pushed after
   * the debounce, and a later offer in that window replaces it.
   */
  offer: (key: K, build: () => WidgetEntry<P>[]) => void;
  /**
   * Push a pending offer at once, skipping the debounce (still nothing when
   * the key matches what was pushed). For work that must reach the widget
   * before iOS can suspend the app again: a Live Activity button press.
   */
  flushNow: () => void;
}

export interface WidgetPusherOptions<K, P> {
  /** Stores the entries in the App Group and reloads the widget. May throw. */
  push: (entries: WidgetEntry<P>[]) => void;
  changed: (prev: K | null, next: K) => boolean;
  scheduler: Scheduler;
  debounceMs: number;
}

export function createWidgetPusher<K, P>(
  options: WidgetPusherOptions<K, P>
): WidgetPusher<K, P> {
  const { push, changed, scheduler, debounceMs } = options;
  let sent: K | null = null;
  let pending: { key: K; build: () => WidgetEntry<P>[] } | null = null;
  let timer: number | null = null;

  const flushNow = () => {
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = null;
    const offer = pending;
    pending = null;
    if (offer === null || !changed(sent, offer.key)) return;
    try {
      push(offer.build());
      sent = offer.key;
    } catch {
      // No App Group or no layout: the next change tries again.
      sent = null;
    }
  };

  return {
    offer: (key, build) => {
      if (!changed(pending?.key ?? sent, key)) return;
      pending = { key, build };
      // Not restarted by later offers, so a steady stream (a 4 Hz timer
      // render) cannot hold a push back for good.
      if (timer === null) timer = scheduler.setTimeout(flushNow, debounceMs);
    },
    flushNow,
  };
}

/**
 * Runs `run` once, `ms` after the first of a burst of calls. The roll widget
 * uses it so a burst of film log writes is parsed once, after the burst.
 */
export function createCoalescer(
  run: () => void,
  ms: number,
  scheduler: Scheduler
): () => void {
  let timer: number | null = null;
  return () => {
    if (timer !== null) return;
    timer = scheduler.setTimeout(() => {
      timer = null;
      run();
    }, ms);
  };
}

/** The platform's timers, keyed by our own ids so the handle type never leaks. */
export function platformScheduler(): Scheduler {
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

export const WIDGETS_UNAVAILABLE_WARNING =
  'Home Screen widgets disabled: this JS bundle or dev client lacks expo-widgets support. ' +
  'Restart Metro with --clear (the widget directive was not compiled) or rebuild the dev client.';

export interface WidgetsChoice<N> {
  native: N;
  /** Set when the stand-in was chosen; the caller logs it in development. */
  warning: string | null;
}

/** A layout as it is at runtime: a string once compiled, else the plain function. */
export type WidgetLayoutSource = string | object;

/**
 * The real native object, or the no-op stand-in so a stale bundler or an older
 * dev client cannot crash the app at startup. Every layout must be a STRING by
 * now (the Babel `'widget'` transform ran); a function means it did not, and
 * `create` (which would throw on it) is not even tried.
 */
export function selectWidgetNative<N>(
  layouts: readonly WidgetLayoutSource[],
  create: () => N,
  noop: N
): WidgetsChoice<N> {
  const fallback: WidgetsChoice<N> = {
    native: noop,
    warning: WIDGETS_UNAVAILABLE_WARNING,
  };
  if (layouts.some((layout) => layout instanceof Function)) return fallback;
  try {
    const chosen: WidgetsChoice<N> = { native: create(), warning: null };
    return chosen;
  } catch {
    return fallback;
  }
}
