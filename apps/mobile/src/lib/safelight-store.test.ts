import { createMMKV } from 'react-native-mmkv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTROL_KINDS } from './control-kinds';
import { nextSafelightStamp } from './safelight-reconcile';
import {
  CHANGED_AT_KEY,
  createSafelightStore,
  getSafelight,
  KEY,
  type SafelightStorage,
  setSafelight,
  storage,
  subscribeSafelight,
} from './safelight-store';
import type { SharedDefaults } from './shared-defaults';

beforeEach(() => {
  storage.clearAll();
});

describe('safelight store', () => {
  it('is off by default', () => {
    expect(getSafelight()).toBe(false);
  });

  it('round-trips and persists synchronously', () => {
    setSafelight(true);
    expect(getSafelight()).toBe(true);
    expect(storage.getBoolean(KEY)).toBe(true);
    setSafelight(false);
    expect(getSafelight()).toBe(false);
  });

  it('reads a value written by an earlier launch', () => {
    storage.set(KEY, true);
    expect(getSafelight()).toBe(true);
  });

  it('notifies subscribers only on a change, and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSafelight(listener);
    setSafelight(true);
    setSafelight(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setSafelight(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

/** An App Group stand-in that records what the store does to it. */
function fakeShared(initial: { on?: boolean; changedAt?: number } = {}) {
  const values = new Map<string, boolean | number>();
  if (initial.on !== undefined) values.set(KEY, initial.on);
  if (initial.changedAt !== undefined) {
    values.set(CHANGED_AT_KEY, initial.changedAt);
  }
  const reloads: (string | undefined)[] = [];
  const shared: SharedDefaults = {
    getBool: (key) => {
      const value = values.get(key);
      return value === undefined ? null : value === true;
    },
    setBool: (key, value) => {
      values.set(key, value);
    },
    getNumber: (key) => {
      const value = values.get(key);
      return value === undefined || value === true || value === false
        ? null
        : value;
    },
    setNumber: (key, value) => {
      values.set(key, value);
    },
    reloadControls: (kind) => {
      reloads.push(kind);
    },
  };
  return { shared, values, reloads };
}

/** An AppState stand-in whose `change` events the test sends. */
function fakeAppState() {
  const listeners: ((state: string) => void)[] = [];
  return {
    source: {
      addEventListener: (
        _type: 'change',
        listener: (state: string) => void
      ) => {
        listeners.push(listener);
        return { remove: () => {} };
      },
    },
    emit: (state: string) => {
      for (const listener of listeners) listener(state);
    },
  };
}

let storeId = 0;
function freshStorage() {
  storeId += 1;
  const mmkv = createMMKV({ id: `safelight-store-test-${storeId}` });
  mmkv.clearAll();
  return mmkv;
}

describe('createSafelightStore', () => {
  it('writes MMKV, the App Group value and stamp, then reloads the control', () => {
    const local = freshStorage();
    const { shared, values, reloads } = fakeShared({ on: false, changedAt: 0 });
    const store = createSafelightStore({
      storage: local,
      shared,
      appState: fakeAppState().source,
      now: () => 5_000,
    });
    reloads.length = 0;
    store.set(true);
    expect(local.getBoolean(KEY)).toBe(true);
    expect(local.getNumber(CHANGED_AT_KEY)).toBe(5_000);
    expect(values.get(KEY)).toBe(true);
    expect(values.get(CHANGED_AT_KEY)).toBe(5_000);
    expect(reloads).toEqual([CONTROL_KINDS.safelight]);
  });

  it('stamps past the newest stamp when the clock was set back', () => {
    const local = freshStorage();
    local.set(KEY, false);
    local.set(CHANGED_AT_KEY, 9_000);
    const { shared, values } = fakeShared({ on: false, changedAt: 9_500 });
    const store = createSafelightStore({
      storage: local,
      shared,
      appState: fakeAppState().source,
      now: () => 1_000,
    });
    store.set(true);
    expect(local.getNumber(CHANGED_AT_KEY)).toBe(9_501);
    expect(values.get(CHANGED_AT_KEY)).toBe(9_501);
  });

  it('adopts a newer shared value into both local keys, notifying only on a flip', () => {
    const local = freshStorage();
    local.set(KEY, false);
    local.set(CHANGED_AT_KEY, 1_000);
    const { shared, values, reloads } = fakeShared({
      on: false,
      changedAt: 1_000,
    });
    const app = fakeAppState();
    const store = createSafelightStore({
      storage: local,
      shared,
      appState: app.source,
    });
    const listener = vi.fn();
    store.subscribe(listener);

    // Same value, newer stamp: the stamp is taken, nobody is told, and the
    // control is still refreshed.
    values.set(CHANGED_AT_KEY, 2_000);
    reloads.length = 0;
    store.reconcile();
    expect(local.getNumber(CHANGED_AT_KEY)).toBe(2_000);
    expect(listener).not.toHaveBeenCalled();
    expect(reloads).toEqual([CONTROL_KINDS.safelight]);

    // The control turned it on: adopted on the next app-active.
    values.set(KEY, true);
    values.set(CHANGED_AT_KEY, 3_000);
    app.emit('background');
    expect(store.get()).toBe(false);
    reloads.length = 0;
    app.emit('active');
    expect(store.get()).toBe(true);
    expect(local.getNumber(CHANGED_AT_KEY)).toBe(3_000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(reloads).toEqual([CONTROL_KINDS.safelight]);
  });

  it('on the first run after the upgrade publishes the app value and never flips it', () => {
    const local = freshStorage();
    local.set(KEY, true); // left on before the mirror existed: no stamp
    const { shared, values, reloads } = fakeShared();
    const store = createSafelightStore({
      storage: local,
      shared,
      appState: fakeAppState().source,
    });
    expect(store.get()).toBe(true);
    expect(values.get(KEY)).toBe(true);
    expect(values.get(CHANGED_AT_KEY)).toBe(0);
    expect(reloads).toEqual([CONTROL_KINDS.safelight]);
  });

  it('keeps a control press made after the clock was set back', () => {
    // The app turned it on at T1; the clock goes back; the control (same
    // rule as SafelightControl.swift) turns it off; the app adopts that.
    const local = freshStorage();
    const { shared, values } = fakeShared();
    const app = fakeAppState();
    let clock = 10_000;
    const store = createSafelightStore({
      storage: local,
      shared,
      appState: app.source,
      now: () => clock,
    });
    store.set(true);
    clock = 4_000;
    values.set(KEY, false);
    values.set(
      CHANGED_AT_KEY,
      nextSafelightStamp(clock, [shared.getNumber(CHANGED_AT_KEY)])
    );
    app.emit('active');
    expect(store.get()).toBe(false);
    expect(values.get(KEY)).toBe(false);
  });
});

/** Throws on the first write of `key` once armed: a crash mid-write. */
class CrashOnce extends Error {}

describe('set while the app stays active', () => {
  it('takes a control press first, then applies the change from there', () => {
    const local = freshStorage();
    const { shared, values } = fakeShared({ on: false, changedAt: 1_000 });
    local.set(KEY, false);
    local.set(CHANGED_AT_KEY, 1_000);
    const store = createSafelightStore({
      storage: local,
      shared,
      appState: fakeAppState().source,
      now: () => 1_500,
    });
    const listener = vi.fn();
    store.subscribe(listener);
    // The control turned it on (stamp 3 000, clock behind) with no app-active.
    values.set(KEY, true);
    values.set(CHANGED_AT_KEY, 3_000);
    // Turning it on in the app is then already done: no stale early return,
    // and the press is not overwritten.
    store.set(true);
    expect(store.get()).toBe(true);
    expect(local.getNumber(CHANGED_AT_KEY)).toBe(3_000);
    expect(listener).toHaveBeenCalledTimes(1);
    // Turning it off stamps past the press, not from the stale local view.
    store.set(false);
    expect(store.get()).toBe(false);
    expect(values.get(KEY)).toBe(false);
    expect(values.get(CHANGED_AT_KEY)).toBe(3_001);
  });
});

describe('a crash between the stamp and the value', () => {
  it('in the app copy: the next launch settles both copies on the old value', () => {
    const mmkv = freshStorage();
    const { shared, values } = fakeShared();
    let armed = false;
    const crashing: SafelightStorage = {
      getBoolean: (key) => mmkv.getBoolean(key),
      getNumber: (key) => mmkv.getNumber(key),
      set: (key, value) => {
        if (armed && key === KEY) {
          armed = false;
          throw new CrashOnce('killed before the value');
        }
        mmkv.set(key, value);
      },
    };
    const first = createSafelightStore({
      storage: crashing,
      shared,
      appState: fakeAppState().source,
      now: () => 5_000,
    });
    armed = true;
    expect(() => first.set(true)).toThrow(CrashOnce);
    // The stamp is written, the value is not, the App Group is untouched.
    expect(mmkv.getNumber(CHANGED_AT_KEY)).toBe(5_000);
    expect(first.get()).toBe(false);
    expect(values.get(CHANGED_AT_KEY)).toBe(0);

    // Relaunch: the reconcile publishes the stamp, so the copies agree.
    const app = fakeAppState();
    const second = createSafelightStore({
      storage: mmkv,
      shared,
      appState: app.source,
      now: () => 6_000,
    });
    expect(second.get()).toBe(false);
    expect(values.get(KEY)).toBe(false);
    expect(values.get(CHANGED_AT_KEY)).toBe(5_000);

    // A control press with the clock set back still wins.
    values.set(
      CHANGED_AT_KEY,
      nextSafelightStamp(1_000, [shared.getNumber(CHANGED_AT_KEY)])
    );
    values.set(KEY, true);
    app.emit('active');
    expect(second.get()).toBe(true);
  });

  it('in the App Group copy: the next launch writes the app value again', () => {
    const mmkv = freshStorage();
    const { shared, values } = fakeShared();
    let armed = false;
    const crashingShared: SharedDefaults = {
      ...shared,
      setBool: (key, value) => {
        if (armed && key === KEY) {
          armed = false;
          throw new CrashOnce('killed before the value');
        }
        shared.setBool(key, value);
      },
    };
    const first = createSafelightStore({
      storage: mmkv,
      shared: crashingShared,
      appState: fakeAppState().source,
      now: () => 5_000,
    });
    armed = true;
    expect(() => first.set(true)).toThrow(CrashOnce);
    // Local is done; the App Group has the new stamp over the old value.
    expect(mmkv.getBoolean(KEY)).toBe(true);
    expect(values.get(CHANGED_AT_KEY)).toBe(5_000);
    expect(values.get(KEY)).toBe(false);

    const second = createSafelightStore({
      storage: mmkv,
      shared,
      appState: fakeAppState().source,
      now: () => 6_000,
    });
    expect(second.get()).toBe(true);
    expect(values.get(KEY)).toBe(true);
    expect(values.get(CHANGED_AT_KEY)).toBe(5_000);
  });

  it('in an adopt: the next launch adopts the press again', () => {
    // local (off, 1000), shared (on, 2000): a control press with the app killed.
    const mmkv = freshStorage();
    mmkv.set(KEY, false);
    mmkv.set(CHANGED_AT_KEY, 1_000);
    const { shared, values } = fakeShared({ on: true, changedAt: 2_000 });
    let armed = true;
    const crashing: SafelightStorage = {
      getBoolean: (key) => mmkv.getBoolean(key),
      getNumber: (key) => mmkv.getNumber(key),
      set: (key, value) => {
        if (armed && key === CHANGED_AT_KEY) {
          armed = false;
          throw new CrashOnce('killed before the stamp');
        }
        mmkv.set(key, value);
      },
    };
    expect(() =>
      createSafelightStore({
        storage: crashing,
        shared,
        appState: fakeAppState().source,
      })
    ).toThrow(CrashOnce);
    // The value is adopted, the stamp is still the old one.
    expect(mmkv.getBoolean(KEY)).toBe(true);
    expect(mmkv.getNumber(CHANGED_AT_KEY)).toBe(1_000);

    const second = createSafelightStore({
      storage: mmkv,
      shared,
      appState: fakeAppState().source,
    });
    expect(second.get()).toBe(true);
    expect(mmkv.getNumber(CHANGED_AT_KEY)).toBe(2_000);
    expect(values.get(KEY)).toBe(true);
  });

  it('in the extension before its first value: the shared stamp never moves back', () => {
    // After the upgrade the group is empty; the extension writes stamp 7 000
    // and dies before the value.
    const mmkv = freshStorage();
    mmkv.set(KEY, false);
    const { shared, values } = fakeShared({ changedAt: 7_000 });
    const store = createSafelightStore({
      storage: mmkv,
      shared,
      appState: fakeAppState().source,
    });
    expect(store.get()).toBe(false);
    expect(values.get(KEY)).toBe(false);
    expect(values.get(CHANGED_AT_KEY)).toBe(7_000);
    expect(mmkv.getNumber(CHANGED_AT_KEY)).toBe(7_000);
  });

  it('in the extension: the app adopts the stamp and keeps its value', () => {
    // SafelightControl.swift writes the stamp first: a crash before the value
    // leaves a newer shared stamp over the same old value.
    const mmkv = freshStorage();
    mmkv.set(KEY, false);
    mmkv.set(CHANGED_AT_KEY, 1_000);
    const { shared, values } = fakeShared({ on: false, changedAt: 1_001 });
    const store = createSafelightStore({
      storage: mmkv,
      shared,
      appState: fakeAppState().source,
    });
    expect(store.get()).toBe(false);
    expect(mmkv.getNumber(CHANGED_AT_KEY)).toBe(1_001);
    expect(values.get(KEY)).toBe(false);
  });
});
