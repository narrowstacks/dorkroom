// A dev client built before expo-widgets was added has no `ExpoWidgets` native
// module, and expo-widgets calls `requireNativeModule` the moment it is
// imported. Evaluating `live-activity.ts` there must not throw: it checks for
// the module first and falls back to the no-op native object.
import { beforeAll, describe, expect, it, vi } from 'vitest';
// `expo`, `expo-widgets` and `expo-notifications` resolve to src/test stand-ins
// (vitest.config.ts): the first reports every native module missing, the second
// throws if it is imported at all.

describe('live-activity.ts without the ExpoWidgets native module', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeAll(() => {
    vi.stubGlobal('__DEV__', true);
  });

  it('loads, warns once in development, and syncing a run is a silent no-op', async () => {
    const { syncLiveActivity } = await import('./live-activity');
    const { timerStore } = await import('./timer-store');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('--clear');

    expect(() => syncLiveActivity()).not.toThrow();
    timerStore.dispatch({ type: 'START' });
    expect(() => syncLiveActivity()).not.toThrow();
    timerStore.dispatch({ type: 'RESET' });
    expect(() => syncLiveActivity()).not.toThrow();
  });

  it('pauses and resumes the run from outside the timer screen', async () => {
    const { runTimerAction } = await import('./live-activity');
    const { timerStore } = await import('./timer-store');
    timerStore.dispatch({ type: 'START' });
    await runTimerAction({ type: 'PAUSE' });
    expect(timerStore.getSnapshot().timer.status).toBe('paused');
    await runTimerAction({ type: 'RESUME' });
    expect(timerStore.getSnapshot().timer.status).toBe('running');
    timerStore.dispatch({ type: 'RESET' });
  });
});
