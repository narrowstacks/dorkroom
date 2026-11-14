// A dev client built before expo-widgets was added has no `ExpoWidgets` native
// module, and expo-widgets throws the moment it is imported. Loading
// `widgets.ts` there must not throw: it checks for the module first, warns once
// in development, and every sync is a silent no-op.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { WIDGETS_UNAVAILABLE_WARNING } from './widget-sync';
// `expo` and `expo-widgets` resolve to src/test stand-ins (vitest.config.ts):
// the first reports every native module missing, the second throws if imported.

describe('widgets.ts without the ExpoWidgets native module', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeAll(() => {
    vi.stubGlobal('__DEV__', true);
  });

  it('loads, warns once, and every sync is a no-op', async () => {
    const widgets = await import('./widgets');
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual([WIDGETS_UNAVAILABLE_WARNING]);

    const { timerStore } = await import('@/lib/timer/timer-store');
    const { addRoll } = await import('@/lib/film-log-storage');
    expect(() => widgets.syncRollWidget()).not.toThrow();
    expect(() => widgets.syncLastResultWidget()).not.toThrow();
    timerStore.dispatch({ type: 'START' });
    expect(() => widgets.syncTimerWidget()).not.toThrow();
    timerStore.dispatch({ type: 'RESET' });
    expect(() => widgets.syncTimerWidget()).not.toThrow();
    // a film log write reaches the listener, which must not throw either
    expect(() =>
      addRoll({
        cameraId: 'c',
        process: 'bw',
        status: 'active',
        startedAt: new Date(0).toISOString(),
      })
    ).not.toThrow();
    // still exactly one warning
    expect(warn.mock.calls).toHaveLength(1);
  });
});
