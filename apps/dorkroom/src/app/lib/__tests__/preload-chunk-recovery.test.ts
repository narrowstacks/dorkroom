import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isSpeculativeImportInFlight,
  lazyPage,
  speculativeImport,
} from '../lazy-page';
import {
  handleVitePreloadError,
  wasRecentPreloadReload,
} from '../preload-chunk-recovery';

/** Mirrors how Vite's own preload helper constructs the event it dispatches. */
function dispatchPreloadError(): Event {
  const event = new Event('vite:preloadError', { cancelable: true });
  handleVitePreloadError(event);
  return event;
}

/**
 * Replaces the global `sessionStorage` with one whose `getItem`/`setItem`
 * throw, the way a locked-down embed or a full quota would. `vi.stubGlobal`
 * swaps the global binding itself rather than a prototype method, which is
 * the reliable way to do this: happy-dom's `Storage` doesn't dispatch through
 * `Storage.prototype` the way a plain class would, so spying on the
 * prototype silently does nothing once the real storage has been touched.
 */
function stubUnavailableSessionStorage(): void {
  vi.stubGlobal('sessionStorage', {
    getItem: () => {
      throw new Error('sessionStorage is unavailable');
    },
    setItem: () => {
      throw new Error('sessionStorage is unavailable');
    },
  });
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('handleVitePreloadError', () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});
  });

  it('reloads once and prevents the default action', () => {
    const event = dispatchPreloadError();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not reload again, and does not prevent the default action, within the guard window', () => {
    dispatchPreloadError(); // schedules the first reload
    reloadSpy.mockClear();

    // Vite's own helper re-throws the original chunk error when the event's
    // default action isn't prevented, so this is what lets the real error
    // surface instead of being silently swallowed while the guard cools down.
    const secondEvent = dispatchPreloadError();

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(secondEvent.defaultPrevented).toBe(false);
  });

  it('reloads again, and prevents the default action, once the guard window has elapsed', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    dispatchPreloadError();
    reloadSpy.mockClear();

    vi.setSystemTime(now + 10_001);
    const event = dispatchPreloadError();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not reload or prevent the default action when sessionStorage is unavailable', () => {
    stubUnavailableSessionStorage();

    const event = dispatchPreloadError();

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

/**
 * A page chunk that 404s the way a stale one does in a build: Vite's preload
 * helper fires `vite:preloadError` from inside the import, before the import
 * rejects to whoever asked for it.
 */
function stalePage() {
  const events: Event[] = [];
  const page = lazyPage<object>(() =>
    Promise.resolve().then(() => {
      events.push(dispatchPreloadError());
      throw new Error('Failed to fetch dynamically imported module');
    })
  );
  return { page, events };
}

/** Lets the stale import fire its event and settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('handleVitePreloadError during a page preload (#354)', () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});
  });

  it('does not reload for a hover, and a click afterwards does', async () => {
    const { page, events } = stalePage();

    page.preload(true);
    expect(isSpeculativeImportInFlight()).toBe(true);
    await settle();

    expect(events).toHaveLength(1);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(events[0]?.defaultPrevented).toBe(false);
    // Settled, so the count is back to zero and cannot hold off a reload.
    expect(isSpeculativeImportInFlight()).toBe(false);

    page.preload(false);
    await settle();

    expect(events).toHaveLength(2);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(events[1]?.defaultPrevented).toBe(true);
  });

  it('reloads when a click joins a hover preload still in flight', async () => {
    const { page, events } = stalePage();

    page.preload(true);
    page.preload(false);
    expect(isSpeculativeImportInFlight()).toBe(false);
    await settle();

    expect(events).toHaveLength(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reload for a stale non-page chunk loaded on hover', async () => {
    const events: Event[] = [];
    const loadModule = speculativeImport(() =>
      Promise.resolve().then(() => {
        events.push(dispatchPreloadError());
        throw new Error('Failed to fetch dynamically imported module');
      })
    );

    loadModule(true).catch(() => undefined);
    await settle();
    expect(events).toHaveLength(1);
    expect(reloadSpy).not.toHaveBeenCalled();

    loadModule(false).catch(() => undefined);
    await settle();
    expect(events).toHaveLength(2);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reload for a hover import that fails after a long delay', async () => {
    vi.useFakeTimers();
    const events: Event[] = [];
    const loadModule = speculativeImport(
      () =>
        new Promise<never>((_resolve, reject) =>
          setTimeout(() => {
            events.push(dispatchPreloadError());
            reject(new Error('Failed to fetch dynamically imported module'));
          }, 60_000)
        )
    );

    loadModule(true).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(events).toHaveLength(1);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(events[0]?.defaultPrevented).toBe(false);
    expect(isSpeculativeImportInFlight()).toBe(false);
  });

  it('leaves the count at zero after a hover preload succeeds', async () => {
    const page = lazyPage<object>(() =>
      Promise.resolve({ default: () => null })
    );

    page.preload(true);
    page.preload(true);
    expect(isSpeculativeImportInFlight()).toBe(true);
    await settle();

    expect(isSpeculativeImportInFlight()).toBe(false);
  });
});

describe('wasRecentPreloadReload', () => {
  it('is false when no reload has ever been scheduled', () => {
    expect(wasRecentPreloadReload()).toBe(false);
  });

  it('is true immediately after a reload is scheduled', () => {
    vi.spyOn(window.location, 'reload').mockImplementation(() => {});

    dispatchPreloadError();

    expect(wasRecentPreloadReload()).toBe(true);
  });

  it('is false once its own (shorter) window has elapsed', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    vi.spyOn(window.location, 'reload').mockImplementation(() => {});

    dispatchPreloadError();
    vi.setSystemTime(now + 2_001);

    expect(wasRecentPreloadReload()).toBe(false);
  });

  it('is false when sessionStorage is unavailable', () => {
    stubUnavailableSessionStorage();

    expect(wasRecentPreloadReload()).toBe(false);
  });
});
