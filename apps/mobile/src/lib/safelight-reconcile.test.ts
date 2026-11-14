import { describe, expect, it } from 'vitest';
import { nextSafelightStamp, reconcileSafelight } from './safelight-reconcile';

describe('reconcileSafelight', () => {
  it('adopts the shared value when the control changed it more recently', () => {
    expect(
      reconcileSafelight(
        { on: false, changedAt: 1_000 },
        { on: true, changedAt: 2_000 }
      )
    ).toEqual({ kind: 'adopt', on: true, changedAt: 2_000 });
    expect(
      reconcileSafelight(
        { on: true, changedAt: 1_000 },
        { on: false, changedAt: 2_000 }
      )
    ).toEqual({ kind: 'adopt', on: false, changedAt: 2_000 });
  });

  it('adopts a stamped shared value over a local one from before the mirror', () => {
    expect(
      reconcileSafelight(
        { on: true, changedAt: 0 },
        { on: false, changedAt: 5 }
      )
    ).toEqual({ kind: 'adopt', on: false, changedAt: 5 });
  });

  it('publishes the app value when the App Group was never written', () => {
    expect(
      reconcileSafelight(
        { on: true, changedAt: 1_000 },
        { on: null, changedAt: null }
      )
    ).toEqual({ kind: 'publish', on: true, changedAt: 1_000 });
  });

  it('never moves a stamp back when the shared value is missing but its stamp is not', () => {
    // The extension wrote stamp 9 and died before the value.
    expect(
      reconcileSafelight(
        { on: false, changedAt: 0 },
        { on: null, changedAt: 9 }
      )
    ).toEqual({ kind: 'publish', on: false, changedAt: 9 });
    expect(
      reconcileSafelight(
        { on: true, changedAt: 20 },
        { on: null, changedAt: 9 }
      )
    ).toEqual({ kind: 'publish', on: true, changedAt: 20 });
  });

  it('publishes the app value over a shared value with no stamp', () => {
    expect(
      reconcileSafelight(
        { on: false, changedAt: 1_000 },
        { on: true, changedAt: null }
      )
    ).toEqual({ kind: 'publish', on: false, changedAt: 1_000 });
    expect(
      reconcileSafelight(
        { on: false, changedAt: 0 },
        { on: true, changedAt: null }
      )
    ).toEqual({ kind: 'publish', on: false, changedAt: 0 });
  });

  it('publishes the app value over an older, different shared one', () => {
    expect(
      reconcileSafelight(
        { on: true, changedAt: 2_000 },
        { on: false, changedAt: 1_000 }
      )
    ).toEqual({ kind: 'publish', on: true, changedAt: 2_000 });
  });

  it('keeps the app value on a tie', () => {
    expect(
      reconcileSafelight(
        { on: true, changedAt: 1_000 },
        { on: false, changedAt: 1_000 }
      )
    ).toEqual({ kind: 'publish', on: true, changedAt: 1_000 });
  });

  it('does nothing only when value and stamp agree', () => {
    expect(
      reconcileSafelight(
        { on: true, changedAt: 2_000 },
        { on: true, changedAt: 2_000 }
      )
    ).toEqual({ kind: 'none' });
    expect(
      reconcileSafelight(
        { on: false, changedAt: 0 },
        { on: false, changedAt: null }
      )
    ).toEqual({ kind: 'none' });
  });

  it('publishes the app stamp when only the stamps differ', () => {
    // A crash after the app wrote its stamp locally but before the value: the
    // shared stamp must catch up, or a later control press could trail it.
    expect(
      reconcileSafelight(
        { on: true, changedAt: 2_000 },
        { on: true, changedAt: 1_000 }
      )
    ).toEqual({ kind: 'publish', on: true, changedAt: 2_000 });
  });
});

describe('nextSafelightStamp', () => {
  it('is the clock when it is ahead of every stamp seen', () => {
    expect(nextSafelightStamp(5_000.7, [1_000, null, 4_000])).toBe(5_000);
    expect(nextSafelightStamp(5_000, [])).toBe(5_000);
  });

  it('is one past the newest stamp seen when the clock is behind', () => {
    expect(nextSafelightStamp(1_000, [9_000, 9_500.4])).toBe(9_501);
    expect(nextSafelightStamp(1_000, [null, 1_000])).toBe(1_001);
  });

  it('ignores stamps that are missing or not finite', () => {
    expect(nextSafelightStamp(10, [null, Number.NaN])).toBe(10);
  });
});

describe('clock set back, end to end through reconcileSafelight', () => {
  it('the control press after the app change wins', () => {
    // The app changed it at T1 = 10 000; then the clock goes back to 4 000.
    const app = { on: true, changedAt: nextSafelightStamp(10_000, [0, null]) };
    // The extension writes max(now, shared + 1) over the shared stamp T1.
    const control = {
      on: false,
      changedAt: nextSafelightStamp(4_000, [app.changedAt]),
    };
    expect(control.changedAt).toBe(10_001);
    expect(reconcileSafelight(app, control)).toEqual({
      kind: 'adopt',
      on: false,
      changedAt: 10_001,
    });
  });

  it('the app change after a control press wins', () => {
    const control = { on: true, changedAt: 10_000 };
    // The app adopted it, then the clock went back and the user turned it off.
    const app = {
      on: false,
      changedAt: nextSafelightStamp(4_000, [10_000, control.changedAt]),
    };
    expect(reconcileSafelight(app, control)).toEqual({
      kind: 'publish',
      on: false,
      changedAt: 10_001,
    });
  });
});
