import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  exposureLinkKey,
  exposureSecondsFromParam,
  exposureStages,
  isNewTimerOpening,
  lastHandledExposureKey,
  lastHandledExposureOpened,
  markExposureLinkHandled,
  resetExposureLinkMemory,
  shouldApplyExposureLink,
  timerLinkKey,
  timerOpeningKey,
} from './exposure-link';

describe('exposureStages', () => {
  it('builds one custom stage of whole seconds', () => {
    expect(exposureStages(112.4)).toEqual([
      {
        id: 'exposure',
        kind: 'custom',
        name: 'Exposure',
        durationSeconds: 112,
        temperatureF: null,
        agitation: null,
        agitationPattern: null,
      },
    ]);
  });

  it('rounds to the nearest second and never goes below one', () => {
    expect(exposureStages(112.5)[0].durationSeconds).toBe(113);
    expect(exposureStages(0.2)[0].durationSeconds).toBe(1);
    expect(exposureStages(Number.NaN)[0].durationSeconds).toBe(1);
  });

  it('uses the label as the name, trimmed and capped, else Exposure', () => {
    expect(exposureStages(10, '  Dodge  ')[0].name).toBe('Dodge');
    expect(exposureStages(10, '   ')[0].name).toBe('Exposure');
    expect(exposureStages(10, 'x'.repeat(80))[0].name).toHaveLength(40);
  });
});

describe('exposureSecondsFromParam', () => {
  it('reads a number and is NaN for anything else', () => {
    expect(exposureSecondsFromParam('112')).toBe(112);
    expect(exposureSecondsFromParam(undefined)).toBeNaN();
    expect(exposureSecondsFromParam('')).toBeNaN();
    expect(exposureSecondsFromParam('soon')).toBeNaN();
  });

  it('ignores under 2 s, matching the builder', () => {
    expect(exposureSecondsFromParam('1')).toBeNaN();
    expect(exposureSecondsFromParam('1.9')).toBeNaN();
    expect(exposureSecondsFromParam('2')).toBe(2);
  });

  it('ignores more than 24 hours', () => {
    expect(exposureSecondsFromParam('86400')).toBe(86400);
    expect(exposureSecondsFromParam('86401')).toBeNaN();
  });
});

describe('exposureLinkKey', () => {
  it('is the at marker when there is one', () => {
    expect(exposureLinkKey('7', '112')).toBe('at:7');
  });

  it('is derived from the value when there is no marker', () => {
    expect(exposureLinkKey(undefined, '112')).toBe('exposure:112');
    expect(exposureLinkKey('', '112')).toBe('exposure:112');
  });

  it('is undefined when the link names no exposure', () => {
    expect(exposureLinkKey(undefined, undefined)).toBeUndefined();
    expect(exposureLinkKey(undefined, ' ')).toBeUndefined();
  });
});

const NOW = 1_000_000;

describe('shouldApplyExposureLink', () => {
  beforeEach(resetExposureLinkMemory);
  afterEach(resetExposureLinkMemory);

  const baseKey: string | undefined = `at:${NOW - 1000}`;
  const lastAppliedKey: string | undefined = `at:${NOW - 2000}`;
  const lastOpened: number | undefined = NOW - 2000;
  const base = {
    key: baseKey,
    lastAppliedKey,
    lastOpened,
    now: NOW,
    runActive: false,
    seconds: 112,
  };

  it('applies a new opening when idle', () => {
    expect(shouldApplyExposureLink(base)).toBe(true);
    expect(
      shouldApplyExposureLink({
        ...base,
        lastAppliedKey: undefined,
        lastOpened: undefined,
      })
    ).toBe(true);
  });

  it('applies each distinct opening once', () => {
    expect(shouldApplyExposureLink({ ...base, lastAppliedKey: base.key })).toBe(
      false
    );
  });

  it('never replaces a run in progress', () => {
    expect(shouldApplyExposureLink({ ...base, runActive: true })).toBe(false);
  });

  it('needs a key and a usable time', () => {
    expect(shouldApplyExposureLink({ ...base, key: undefined })).toBe(false);
    expect(shouldApplyExposureLink({ ...base, seconds: Number.NaN })).toBe(
      false
    );
    expect(shouldApplyExposureLink({ ...base, seconds: 0.5 })).toBe(false);
    expect(shouldApplyExposureLink({ ...base, seconds: 1 })).toBe(false);
    expect(shouldApplyExposureLink({ ...base, seconds: 1.9 })).toBe(false);
    expect(shouldApplyExposureLink({ ...base, seconds: 2 })).toBe(true);
  });

  it('never applies an opening older than, or as old as, the newest handled', () => {
    const newest = { lastAppliedKey: 'at:900', lastOpened: 900 };
    expect(shouldApplyExposureLink({ ...base, ...newest, key: 'at:500' })).toBe(
      false
    );
    expect(shouldApplyExposureLink({ ...base, ...newest, key: 'at:900' })).toBe(
      false
    );
    expect(shouldApplyExposureLink({ ...base, ...newest, key: 'at:901' })).toBe(
      true
    );
  });

  it('trusts a normal at, up to a minute ahead of now', () => {
    const key = `at:${NOW + 59_000}`;
    expect(shouldApplyExposureLink({ ...base, key })).toBe(true);
  });

  it('does not order by an at more than a minute ahead of now', () => {
    const future = `at:${NOW + 61_000}`;
    // Identity only: it applies like any key that is not the last one...
    expect(
      shouldApplyExposureLink({
        ...base,
        key: future,
        lastAppliedKey: `at:${NOW + 100_000}`,
        lastOpened: NOW + 100_000,
      })
    ).toBe(true);
    // ...and a trusted later link is not blocked by it.
    markExposureLinkHandled(future, NOW);
    expect(lastHandledExposureOpened()).toBeUndefined();
    expect(
      shouldApplyExposureLink({
        ...base,
        key: `at:${NOW + 10}`,
        lastAppliedKey: lastHandledExposureKey(),
        lastOpened: lastHandledExposureOpened(),
      })
    ).toBe(true);
  });

  it('compares an at-less key by identity, not order', () => {
    expect(
      shouldApplyExposureLink({
        ...base,
        key: 'exposure:60',
        lastAppliedKey: 'at:9',
        lastOpened: 9,
      })
    ).toBe(true);
    expect(
      shouldApplyExposureLink({
        ...base,
        key: 'exposure:60',
        lastAppliedKey: 'exposure:60',
      })
    ).toBe(false);
  });
});

describe('the handled-link memory', () => {
  beforeEach(resetExposureLinkMemory);
  afterEach(resetExposureLinkMemory);

  it('a stale opening does not move the memory back', () => {
    markExposureLinkHandled('at:900', NOW);
    markExposureLinkHandled('at:500', NOW);
    expect(lastHandledExposureKey()).toBe('at:900');
    expect(lastHandledExposureOpened()).toBe(900);
  });

  it('an at-less or untrusted key keeps the order memory', () => {
    markExposureLinkHandled('at:900', NOW);
    markExposureLinkHandled('exposure:60', NOW);
    expect(lastHandledExposureKey()).toBe('exposure:60');
    expect(lastHandledExposureOpened()).toBe(900);
    markExposureLinkHandled(`at:${NOW + 120_000}`, NOW);
    expect(lastHandledExposureOpened()).toBe(900);
  });

  it('two timer screens: a stale re-run applies nothing and the memory stays at the newest', () => {
    const t1 = 100_000;
    const t2 = 200_000;
    /** One screen's effect run, as TimerScreen does it. */
    const run = (at: number, exposure: string) => {
      const key = exposureLinkKey(String(at), exposure);
      const applied = shouldApplyExposureLink({
        key,
        lastAppliedKey: lastHandledExposureKey(),
        lastOpened: lastHandledExposureOpened(),
        now: t2 + 1000,
        runActive: false,
        seconds: exposureSecondsFromParam(exposure),
      });
      markExposureLinkHandled(key, t2 + 1000);
      return applied;
    };
    expect(run(t1, '112')).toBe(true); // instance A, link 1
    expect(run(t2, '60')).toBe(true); // instance B, link 2
    expect(run(t1, '112')).toBe(false); // A re-runs with its stale params
    expect(lastHandledExposureKey()).toBe(`at:${t2}`);
    expect(lastHandledExposureOpened()).toBe(t2);
  });
});

describe('timerLinkKey and timerOpeningKey', () => {
  it('keys a start link by its at, else by kind and value', () => {
    expect(timerLinkKey('9', 'start', 'last')).toBe('at:9');
    expect(timerLinkKey(undefined, 'start', 'last')).toBe('start:last');
    expect(timerLinkKey('9', 'start', undefined)).toBeUndefined();
  });

  it('keys an opening as a start link only without an exposure', () => {
    expect(timerOpeningKey(undefined, undefined, 'last')).toBe('start:last');
    expect(timerOpeningKey('3', undefined, 'last')).toBe('at:3');
    expect(timerOpeningKey(undefined, '60', 'last')).toBe('exposure:60');
    expect(timerOpeningKey('3', undefined, undefined)).toBe('at:3');
    expect(timerOpeningKey(undefined, undefined, undefined)).toBeUndefined();
  });
});

describe('isNewTimerOpening', () => {
  const NOW_MS = 1_000_000;

  it('is new for an unseen key that is not older than the newest handled', () => {
    expect(
      isNewTimerOpening({ key: 'at:5', lastAppliedKey: undefined, now: NOW_MS })
    ).toBe(true);
    expect(
      isNewTimerOpening({
        key: 'at:7',
        lastAppliedKey: 'at:5',
        lastOpened: 5,
        now: NOW_MS,
      })
    ).toBe(true);
  });

  it('is not new for no key, the same key, or an older at', () => {
    expect(
      isNewTimerOpening({
        key: undefined,
        lastAppliedKey: undefined,
        now: NOW_MS,
      })
    ).toBe(false);
    expect(
      isNewTimerOpening({ key: 'at:5', lastAppliedKey: 'at:5', now: NOW_MS })
    ).toBe(false);
    expect(
      isNewTimerOpening({
        key: 'at:4',
        lastAppliedKey: 'at:5',
        lastOpened: 5,
        now: NOW_MS,
      })
    ).toBe(false);
  });

  it('shares the order memory between exposure and start links', () => {
    // A start link handled at 10 makes an exposure link from 8 stale.
    expect(
      isNewTimerOpening({
        key: timerOpeningKey('8', '60', undefined),
        lastAppliedKey: timerOpeningKey('10', undefined, 'last'),
        lastOpened: 10,
        now: NOW_MS,
      })
    ).toBe(false);
  });
});
