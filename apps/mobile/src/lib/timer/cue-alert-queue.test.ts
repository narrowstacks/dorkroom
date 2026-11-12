import { describe, expect, it } from 'vitest';
import { createCueAlertQueue, type CueNotifications } from './cue-alert-queue';
import type { TimerCue } from './cues';

const T0 = 1_800_000_000_000;
const CUE: TimerCue = {
  kind: 'stage',
  offsetSeconds: 60,
  stageIndex: 0,
  title: 'Stop bath',
  body: 'Developer is done',
};

/** Records each call; the next `failNext` call of that kind rejects. */
function fakeNotifications() {
  const log: string[] = [];
  const failNext = { cancelAll: false, scheduleAt: false };
  const native: CueNotifications = {
    cancelAll: async () => {
      log.push('cancelAll');
      if (failNext.cancelAll) {
        failNext.cancelAll = false;
        throw new Error('refused');
      }
    },
    scheduleAt: async (_cue, date) => {
      log.push(`scheduleAt:${date.getTime() - T0}`);
      if (failNext.scheduleAt) {
        failNext.scheduleAt = false;
        throw new Error('refused');
      }
      return `id-${log.length}`;
    },
  };
  return { native, log, failNext };
}

describe('cue alert queue', () => {
  it('replaces pending alerts with one per cue, dated from now', async () => {
    const fake = fakeNotifications();
    await createCueAlertQueue(fake.native).schedule([CUE], T0);
    expect(fake.log).toEqual(['cancelAll', 'scheduleAt:60000']);
  });

  it('rejects when iOS refuses a schedule, and the next queued call still runs', async () => {
    const fake = fakeNotifications();
    const alerts = createCueAlertQueue(fake.native);
    fake.failNext.scheduleAt = true;
    const failed = alerts.schedule([CUE], T0);
    const next = alerts.cancel();
    await expect(failed).rejects.toThrow('refused');
    await expect(next).resolves.toBeUndefined();
    expect(fake.log).toEqual(['cancelAll', 'scheduleAt:60000', 'cancelAll']);
  });

  it('rejects when iOS refuses a cancel, and the next queued call still runs', async () => {
    const fake = fakeNotifications();
    const alerts = createCueAlertQueue(fake.native);
    fake.failNext.cancelAll = true;
    const failed = alerts.cancel();
    const next = alerts.schedule([CUE], T0);
    await expect(failed).rejects.toThrow('refused');
    await expect(next).resolves.toBeUndefined();
    expect(fake.log).toEqual(['cancelAll', 'cancelAll', 'scheduleAt:60000']);
  });
});
