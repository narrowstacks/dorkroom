import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleVitePreloadError,
  wasRecentPreloadReload,
} from '../preload-error-recovery';

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
