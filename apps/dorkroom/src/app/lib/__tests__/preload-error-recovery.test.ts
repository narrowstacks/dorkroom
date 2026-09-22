import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleVitePreloadError } from '../preload-error-recovery';

/** Mirrors how Vite's own preload helper constructs the event it dispatches. */
function dispatchPreloadError(): Event {
  const event = new Event('vite:preloadError', { cancelable: true });
  handleVitePreloadError(event);
  return event;
}

describe('handleVitePreloadError', () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    reloadSpy.mockRestore();
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

    vi.useRealTimers();
  });
});
