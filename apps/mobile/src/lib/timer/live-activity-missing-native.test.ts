// A dev client built before expo-widgets was added has no `ExpoWidgets` native
// module, and expo-widgets calls `requireNativeModule` the moment it is
// imported. Evaluating `live-activity.ts` there must not throw: it checks for
// the module first and falls back to the no-op native object.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SHARED_DEFAULTS_UNAVAILABLE } from '../shared-defaults';
import { WIDGETS_UNAVAILABLE_WARNING } from '../widgets/widget-sync';
import { UNAVAILABLE_WARNING } from './live-activity-controller';
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
    // Exactly three warnings: the Live Activity's, the safelight mirror's App
    // Group one (there is no DorkroomShared module either) and the Home Screen
    // widgets' (loaded for the button path's widget flush). Any other new
    // warning fails here.
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toHaveLength(3);
    expect(messages).toContain(SHARED_DEFAULTS_UNAVAILABLE);
    expect(messages).toContain(WIDGETS_UNAVAILABLE_WARNING);
    const activity = messages.filter(
      (message) =>
        message !== SHARED_DEFAULTS_UNAVAILABLE &&
        message !== WIDGETS_UNAVAILABLE_WARNING
    );
    expect(activity).toEqual([UNAVAILABLE_WARNING]);
    expect(activity[0]).toContain('--clear');

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

  it('runs the timer action runner with the real widget steps without throwing', async () => {
    // `runTimerAction` swallows every error, so a widget step that threw
    // would pass unnoticed there. Here the runner gets the same widget steps
    // the app wires in and stand-ins for the rest: any throw rejects.
    const { TIMER_WIDGET, syncLiveActivity } = await import('./live-activity');
    const { createTimerActionRunner } =
      await import('./live-activity-interaction');
    const { timerStore } = await import('./timer-store');
    const steps: string[] = [];
    const run = createTimerActionRunner({
      store: timerStore,
      alerts: { ensure: async () => {} },
      activity: { sync: syncLiveActivity, flushNow: async () => {} },
      widget: {
        sync: () => {
          TIMER_WIDGET.sync();
          steps.push('widget-sync');
        },
        flushNow: () => {
          TIMER_WIDGET.flushNow();
          steps.push('widget-flush');
        },
      },
    });
    timerStore.dispatch({ type: 'START' });
    await expect(run({ type: 'PAUSE' })).resolves.toBeUndefined();
    await expect(run({ type: 'NEXT_STAGE' })).resolves.toBeUndefined();
    await expect(run({ type: 'RESUME' })).resolves.toBeUndefined();
    expect(steps).toEqual([
      'widget-sync',
      'widget-flush',
      'widget-sync',
      'widget-flush',
      'widget-sync',
      'widget-flush',
    ]);
    expect(timerStore.getSnapshot().timer.status).toBe('running');
    timerStore.dispatch({ type: 'RESET' });
  });
});
