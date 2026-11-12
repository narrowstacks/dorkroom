import {
  parseDecimalInput,
  POSITIVE_DIMENSION_MAX,
  POSITIVE_DIMENSION_MIN,
} from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  createRulerState,
  indexAfter,
  labelEveryFor,
  locate,
  majorEveryFor,
  type RulerConfig,
  type RulerEvent,
  rulerReduce,
  type RulerState,
  rulerWindowTicks,
} from './ruler-machine';
import {
  adaptiveFocalStep,
  adaptiveTimeStep,
  formatScrubbed,
  type ScrubStep,
  stepOnce,
} from './scrub-value';

const config = (over: Partial<RulerConfig> = {}): RulerConfig => ({
  step: 1,
  min: 0,
  max: 100,
  parse: parseDecimalInput,
  format: formatScrubbed,
  width: 300,
  ...over,
});

/** Steps from the origin to the grid point `grid`, found by walking. */
function walkIndex(origin: number, grid: number, step: ScrubStep): number {
  let value = origin;
  for (let i = 0; i < 6000; i += 1) {
    if (Math.abs(value - grid) < 1e-7) return i;
    value = stepOnce(value, 1, step).next;
  }
  value = origin;
  for (let i = 0; i < 6000; i += 1) {
    if (Math.abs(value - grid) < 1e-7) return -i;
    value = stepOnce(value, -1, step).next;
  }
  throw new Error(`no index for ${grid}`);
}

/** Where the displayed value really is, in steps from the origin. */
function truePosition(state: RulerState, cfg: RulerConfig): number {
  const parsed = cfg.parse(state.text);
  const value = Math.min(cfg.max, Math.max(cfg.min, parsed ?? 0));
  const { grid, frac } = locate(value, cfg.step);
  return walkIndex(state.origin, grid, cfg.step) + frac;
}

interface RunResult {
  state: RulerState;
  writes: string[];
  states: RulerState[];
}

/** Runs events, checking after each that the indicator is on the displayed
 * value (exactly, at rest; within a step while a drag is live). */
function run(start: string, events: RulerEvent[], cfg = config()): RunResult {
  let state = createRulerState(start, cfg);
  const writes: string[] = [];
  const states: RulerState[] = [];
  for (const event of events) {
    state = rulerReduce(state, event, cfg);
    states.push(state);
    if (state.write !== null) writes.push(state.write);
    expect(state.index).toBeCloseTo(truePosition(state, cfg), 6);
    const indicator = -state.translate / 10;
    if (state.session === null) {
      expect(indicator).toBeCloseTo(state.index, 8);
    } else {
      expect(Math.abs(indicator - state.index)).toBeLessThanOrEqual(1 + 1e-9);
    }
  }
  return { state, writes, states };
}

describe('drag on the grid', () => {
  it('writes the scrubbed text and rests on the new tick', () => {
    const { state, writes } = run('50', [
      { type: 'start' },
      { type: 'move', dx: 30 },
      { type: 'end' },
    ]);
    expect(writes).toEqual(['47']);
    expect(state.text).toBe('47');
    expect(state.translate).toBe(30);
    expect(state.session).toBeNull();
  });

  it('does not move the origin on release', () => {
    const { states } = run('50', [
      { type: 'start' },
      { type: 'move', dx: 40 },
      { type: 'end' },
    ]);
    expect(new Set(states.map((s) => s.originSeq)).size).toBe(1);
    expect(new Set(states.map((s) => s.origin)).size).toBe(1);
  });

  it('continues the next drag from where the last one rested', () => {
    const { state } = run('50', [
      { type: 'start' },
      { type: 'move', dx: 30 },
      { type: 'end' },
      { type: 'start' },
      { type: 'move', dx: 20 },
      { type: 'end' },
    ]);
    expect(state.text).toBe('45');
    expect(state.translate).toBe(50);
  });
});

describe('bounds', () => {
  it('stops the line at the last tick at min', () => {
    const { states, state } = run('2', [
      { type: 'start' },
      { type: 'move', dx: 200 },
      { type: 'end' },
    ]);
    expect(states[1].translate).toBe(20);
    expect(state.text).toBe('0');
    expect(state.translate).toBe(0 + 20);
  });

  it('stops the line at the last tick at max', () => {
    const { states, state } = run('98', [
      { type: 'start' },
      { type: 'move', dx: -300 },
      { type: 'end' },
    ]);
    expect(states[1].translate).toBe(-20);
    expect(state.text).toBe('100');
  });

  it('shows ticks up to the bound for a value typed above max', () => {
    const cfg = config();
    const state = createRulerState('500', cfg);
    expect(state.index).toBe(0);
    const ticks = rulerWindowTicks({
      origin: state.origin,
      step: cfg.step,
      min: cfg.min,
      max: cfg.max,
      lo: state.windowLo,
      hi: state.windowHi,
    });
    expect(ticks.length).toBeGreaterThan(20);
    expect(ticks[ticks.length - 1].value).toBe(100);
    expect(state.origin).toBe(100);
  });

  it('leaves text above max alone when raising it', () => {
    const { writes } = run('500', [
      { type: 'start' },
      { type: 'move', dx: -50 },
      { type: 'end' },
    ]);
    expect(writes).toEqual([]);
  });
});

describe('zero net steps and off-grid values', () => {
  it('restores the exact text and position when dragged back', () => {
    const { state, writes } = run('50', [
      { type: 'start' },
      { type: 'move', dx: 30 },
      { type: 'move', dx: 3 },
      { type: 'end' },
    ]);
    expect(writes).toEqual(['47', '50']);
    expect(state.text).toBe('50');
    expect(state.translate).toBe(0);
  });

  it('keeps an off-grid value off the grid until a step is taken', () => {
    const cfg = config({ step: 0.5, max: 1000 });
    const first = createRulerState('12.3', cfg);
    expect(first.origin).toBe(12);
    expect(first.translate).toBeCloseTo(-6, 8);
    const { state } = run(
      '12.3',
      [{ type: 'start' }, { type: 'move', dx: 4 }, { type: 'end' }],
      cfg
    );
    expect(state.text).toBe('12.3');
    expect(state.translate).toBeCloseTo(-6, 8);
  });

  it('snaps onto the next tick on the first step, both ways', () => {
    const cfg = config({ step: 0.5, max: 1000 });
    const up = run(
      '12.3',
      [{ type: 'start' }, { type: 'move', dx: -10 }, { type: 'end' }],
      cfg
    );
    expect(up.state.text).toBe('12.5');
    expect(up.state.translate).toBe(-10);
    const down = run(
      '12.3',
      [{ type: 'start' }, { type: 'move', dx: 10 }, { type: 'end' }],
      cfg
    );
    expect(down.state.text).toBe('12.0');
    expect(down.state.translate).toBe(0);
  });
});

describe('adaptive steps', () => {
  const cfg = config({ step: adaptiveTimeStep, min: 0.1, max: 3600 });

  it('crosses 10 s going up and keeps the line on the value', () => {
    const { state } = run(
      '9.9',
      [{ type: 'start' }, { type: 'move', dx: -30 }, { type: 'end' }],
      cfg
    );
    expect(state.text).toBe('11.0');
    expect(state.index).toBe(3);
  });

  it('crosses 10 s going down and keeps the line on the value', () => {
    const { state } = run(
      '11.0',
      [{ type: 'start' }, { type: 'move', dx: 30 }, { type: 'end' }],
      cfg
    );
    expect(state.text).toBe('9.9');
    expect(state.index).toBe(-3);
  });

  it('crosses 60 s both ways', () => {
    const up = run(
      '59.5',
      [{ type: 'start' }, { type: 'move', dx: -20 }, { type: 'end' }],
      cfg
    );
    expect(up.state.text).toBe('61');
    const down = run(
      '61',
      [{ type: 'start' }, { type: 'move', dx: 20 }, { type: 'end' }],
      cfg
    );
    expect(down.state.text).toBe('59.5');
  });
});

describe('changes from outside', () => {
  it('keeps the origin for a typed value near it and moves only the line', () => {
    const { state, states } = run('50', [{ type: 'external', text: '75' }]);
    expect(states[0].originSeq).toBe(
      createRulerState('50', config()).originSeq
    );
    expect(state.origin).toBe(50);
    expect(state.index).toBe(25);
    expect(state.translate).toBe(-250);
    expect(state.write).toBeNull();
  });

  it('re-origins for a typed value beyond the cap', () => {
    const cfg = config({ max: 100000 });
    const { state, states } = run(
      '50',
      [{ type: 'external', text: '9000' }],
      cfg
    );
    expect(states[0].originSeq).toBe(createRulerState('50', cfg).originSeq + 1);
    expect(state.origin).toBe(9000);
    expect(state.translate).toBe(0);
  });

  it('rests a value typed between two ticks at its fractional index', () => {
    const cfg = config({ step: 0.5, max: 1000 });
    const { state } = run('12', [{ type: 'external', text: '14.3' }], cfg);
    expect(state.origin).toBe(12);
    expect(state.index).toBeCloseTo(4.6, 8);
    expect(state.translate).toBeCloseTo(-46, 8);
  });

  it('ends the drag when the value changes from outside mid-drag', () => {
    const { state, states } = run('50', [
      { type: 'start' },
      { type: 'move', dx: 30 },
      { type: 'external', text: '80' },
      { type: 'move', dx: 40 },
    ]);
    expect(states[2].session).toBeNull();
    expect(states[2].write).toBeNull();
    // The still-down finger's later moves do nothing until a new start.
    expect(state.text).toBe('80');
    expect(state.write).toBeNull();
    expect(state.index).toBe(30);
  });

  it('re-origins when the step or bounds change', () => {
    const cfg = config();
    const state = createRulerState('50', cfg);
    const same = rulerReduce(state, { type: 'config' }, cfg);
    expect(same.originSeq).toBe(state.originSeq);
    const next = rulerReduce(state, { type: 'config' }, { ...cfg, step: 0.5 });
    expect(next.originSeq).toBe(state.originSeq + 1);
  });
});

describe('nudge (VoiceOver)', () => {
  it('raises and lowers by one step and rests on the new tick', () => {
    const up = run('50', [{ type: 'nudge', direction: 1 }]);
    expect(up.state.text).toBe('51');
    expect(up.state.translate).toBe(-10);
    const down = run('50', [{ type: 'nudge', direction: -1 }]);
    expect(down.state.text).toBe('49');
  });
});

describe('window', () => {
  it('is empty until the strip is measured, then fills', () => {
    const unmeasured = createRulerState('50', config({ width: 0 }));
    expect(unmeasured.windowHi).toBeLessThan(unmeasured.windowLo);
    const measured = rulerReduce(unmeasured, { type: 'layout' }, config());
    expect(measured.windowHi - measured.windowLo).toBeGreaterThan(60);
  });

  it('extends before the overscan runs out, without moving any tick', () => {
    const cfg = config({ max: 1000 });
    const { states } = run(
      '500',
      [
        { type: 'start' },
        { type: 'move', dx: -200 },
        { type: 'move', dx: -400 },
      ],
      cfg
    );
    const [begin, , far] = states;
    expect(far.windowHi).toBeGreaterThan(begin.windowHi);
    const at = (s: RulerState, value: number) =>
      rulerWindowTicks({
        origin: s.origin,
        step: cfg.step,
        min: cfg.min,
        max: cfg.max,
        lo: s.windowLo,
        hi: s.windowHi,
      }).find((t) => t.value === value)?.x;
    expect(at(begin, 510)).toBe(at(far, 510));
    expect(at(far, 510)).toBe(100);
  });

  it('keeps the shown position inside the window after a fast flick', () => {
    const cfg = config({ max: 1000 });
    const { state } = run(
      '500',
      [{ type: 'start' }, { type: 'move', dx: -900 }, { type: 'end' }],
      cfg
    );
    expect(state.index).toBe(90);
    expect(state.windowHi).toBeGreaterThanOrEqual(90 + 15);
    expect(state.windowLo).toBeLessThanOrEqual(90 - 15);
  });
});

describe('rulerWindowTicks', () => {
  const win = (
    step: ScrubStep,
    over: Partial<Parameters<typeof rulerWindowTicks>[0]> = {}
  ) =>
    rulerWindowTicks({
      origin: 0,
      step,
      min: -5,
      max: 5,
      lo: -30,
      hi: 30,
      ...over,
    });
  const labels = (ticks: ReturnType<typeof rulerWindowTicks>) =>
    ticks.filter((t) => t.label !== null).map((t) => t.label);

  it('stops cleanly at the bounds', () => {
    const ticks = win(1);
    expect(ticks.map((t) => t.value)).toEqual([
      -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5,
    ]);
    expect(ticks[0].x).toBe(-50);
  });

  it('labels whole stops at 0 and the bounds', () => {
    expect(labels(win(1))).toEqual(['-5', '0', '5']);
  });

  it('labels half stops every two stops', () => {
    expect(labels(win(0.5))).toEqual(['-4', '-2', '0', '2', '4']);
  });

  it('labels thirds every two stops', () => {
    expect(labels(win(1 / 3, { lo: -60, hi: 60 }))).toEqual([
      '-4',
      '-2',
      '0',
      '2',
      '4',
    ]);
  });

  it('labels quarter inches at whole inches', () => {
    const ticks = win(0.25, { min: 0.1, max: 10, origin: 2, lo: -8, hi: 8 });
    expect(labels(ticks)).toEqual(['1', '2', '3', '4']);
  });

  it('labels half centimetres at even centimetres', () => {
    const ticks = win(0.5, { min: 0.1, max: 30, origin: 10, lo: -12, hi: 12 });
    expect(labels(ticks)).toEqual(['4', '6', '8', '10', '12', '14', '16']);
  });

  it('puts majors on multiples of 5 steps for a tenth step', () => {
    const ticks = win(0.1, { min: 0, max: 100, origin: 10, lo: -12, hi: 12 });
    expect(ticks.filter((t) => t.major).map((t) => t.value)).toEqual([
      9, 9.5, 10, 10.5, 11,
    ]);
  });

  it('walks an adaptive step across its boundary', () => {
    const ticks = win(adaptiveTimeStep, {
      min: 0.1,
      max: 3600,
      origin: 9.9,
      lo: -6,
      hi: 6,
    });
    expect(ticks.map((t) => t.value)).toEqual([
      9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10, 10.5, 11, 11.5, 12, 12.5,
    ]);
  });

  it('gives a tick the same x whatever the window', () => {
    const wide = win(1, { min: -100, max: 100 });
    const narrow = win(1, { min: -100, max: 100, lo: -3, hi: 3 });
    for (const t of narrow) {
      expect(wide.find((w) => w.value === t.value)?.x).toBe(t.x);
    }
  });
});

describe('helpers', () => {
  it('picks majors and label spacing from the step', () => {
    expect(majorEveryFor(1 / 3)).toBe(3);
    expect(majorEveryFor(0.5)).toBe(2);
    expect(majorEveryFor(0.25)).toBe(4);
    expect(majorEveryFor(0.1)).toBe(5);
    expect(labelEveryFor(5)).toBe(1);
    expect(labelEveryFor(4)).toBe(1);
    expect(labelEveryFor(3)).toBe(2);
    expect(labelEveryFor(2)).toBe(2);
    expect(labelEveryFor(1)).toBe(5);
  });

  it('indexAfter takes the first step to the next tick', () => {
    expect(indexAfter(3, 2)).toBe(5);
    expect(indexAfter(3, -2)).toBe(1);
    expect(indexAfter(2.4, 1)).toBe(3);
    expect(indexAfter(2.4, -1)).toBe(2);
    expect(indexAfter(2.4, 0)).toBe(2.4);
  });
});

describe('ticks stay put across changes from outside', () => {
  const xOf = (s: RulerState, cfg: RulerConfig) =>
    new Map(
      rulerWindowTicks({
        origin: s.origin,
        step: cfg.step,
        min: cfg.min,
        max: cfg.max,
        lo: s.windowLo,
        hi: s.windowHi,
      }).map((t) => [t.value, t.x])
    );

  const sameWhereOverlapping = (
    start: string,
    typed: string,
    cfg: RulerConfig
  ) => {
    const { states } = run(start, [{ type: 'external', text: typed }], cfg);
    const before = xOf(createRulerState(start, cfg), cfg);
    const after = xOf(states[0], cfg);
    expect(states[0].originSeq).toBe(createRulerState(start, cfg).originSeq);
    let shared = 0;
    for (const [value, x] of before) {
      const other = after.get(value);
      if (other === undefined) continue;
      shared += 1;
      expect(other).toBe(x);
    }
    expect(shared).toBeGreaterThan(10);
  };

  it('with a constant step', () => {
    sameWhereOverlapping('50', '60', config());
  });

  it('with the adaptive time step, across 10 s and 60 s', () => {
    const cfg = config({ step: adaptiveTimeStep, min: 0.1, max: 3600 });
    sameWhereOverlapping('9.9', '12', cfg);
    sameWhereOverlapping('55', '70', cfg);
  });

  it('with the adaptive focal step, across 100 mm and 500 mm', () => {
    const cfg = config({ step: adaptiveFocalStep, min: 1, max: 2000 });
    sameWhereOverlapping('90', '130', cfg);
    sameWhereOverlapping('450', '520', cfg);
  });
});

describe('echoes of the row own writes', () => {
  const cfg = config({ max: 1000 });
  const drag = (n: number): RulerEvent[] => [
    { type: 'start' },
    ...Array.from({ length: n }, (_, i): RulerEvent => ({
      type: 'move',
      dx: -10 * (i + 1),
    })),
  ];
  const texts = (n: number) => Array.from({ length: n }, (_, i) => `${51 + i}`);
  const echoesOf = (list: string[]): RulerEvent[] =>
    list.map((text) => ({ type: 'external', text }));

  for (const late of [1, 2, 5]) {
    it(`ignores an in-order echo ${late} write(s) late, mid-drag`, () => {
      const { states } = run(
        '50',
        [...drag(5), ...echoesOf(texts(5).slice(0, 5 - late + 1))],
        cfg
      );
      const live = states[5];
      for (const s of states.slice(6)) {
        expect(s.originSeq).toBe(live.originSeq);
        expect(s.text).toBe('55');
        expect(s.index).toBe(5);
        expect(s.session).not.toBeNull();
        expect(s.write).toBeNull();
        expect(s.written).toEqual(live.written);
      }
    });

    it(`settles on the last text once the newest echo follows ${late} late one(s), after the drag ended`, () => {
      const { states, state } = run(
        '50',
        [
          ...drag(5),
          { type: 'end' },
          ...echoesOf([...texts(5).slice(0, 5 - late + 1), '55']),
        ],
        cfg
      );
      for (const s of states.slice(6))
        expect(s.originSeq).toBe(states[5].originSeq);
      expect(state.text).toBe('55');
      expect(state.index).toBe(5);
      expect(state.translate).toBe(-50);
    });
  }

  it('never removes entries during a session', () => {
    const { states } = run(
      '50',
      [...drag(3), ...echoesOf(['51', '52', '53'])],
      cfg
    );
    expect(states[4].written).toEqual(['51', '52', '53']);
    expect(states[6].written).toEqual(['51', '52', '53']);
    expect(states[6].echoSettled).toBe(true);
  });

  it('treats a genuinely new text mid-drag as outside and ends the session', () => {
    const { state, states } = run(
      '50',
      [...drag(3), { type: 'external', text: '80' }],
      cfg
    );
    expect(states[4].session).toBeNull();
    expect(state.text).toBe('80');
    expect(state.index).toBe(30);
    expect(state.written).toEqual([]);
  });

  it('keeps the newest 64 unique writes', () => {
    const { state } = run('0', drag(80), config({ max: 1000 }));
    expect(state.written.length).toBe(64);
    expect(state.written[63]).toBe('80');
    expect(state.written[0]).toBe('17');
  });
});

describe('the same text written more than once in a drag', () => {
  // A = 51, B = 52: the drag writes A, B, A.
  const cfg = config({ max: 1000 });
  const aba: RulerEvent[] = [
    { type: 'start' },
    { type: 'move', dx: -10 },
    { type: 'move', dx: -20 },
    { type: 'move', dx: -10 },
  ];
  const ext = (text: string): RulerEvent => ({ type: 'external', text });

  const cases: Array<[string, RulerEvent[], RulerEvent[]]> = [
    ['in-order echoes mid-drag', [ext('51'), ext('52'), ext('51')], []],
    ['a batched echo mid-drag', [ext('51')], []],
    [
      'no echo until after the end, in order',
      [],
      [ext('51'), ext('52'), ext('51')],
    ],
    ['a batched echo after the end', [], [ext('51')]],
  ];
  for (const [name, during, after] of cases) {
    it(`finishes on A with ${name}`, () => {
      const mid = run('50', [...aba, ...during], cfg);
      if (during.length > 0) {
        expect(mid.state.session).not.toBeNull();
        expect(mid.state.text).toBe('51');
        expect(mid.state.index).toBe(1);
        expect(mid.state.write).toBeNull();
      }
      const { state, states } = run(
        '50',
        [...aba, ...during, { type: 'end' }, ...after],
        cfg
      );
      expect(state.text).toBe('51');
      expect(state.index).toBe(1);
      expect(state.translate).toBe(-10);
      expect(state.written).toEqual([]);
      expect(new Set(states.map((s) => s.originSeq)).size).toBe(1);
    });

    it(`takes a later typed B as an outside edit after ${name}`, () => {
      const { state } = run(
        '50',
        [...aba, ...during, { type: 'end' }, ...after, ext('52')],
        cfg
      );
      expect(state.text).toBe('52');
      expect(state.index).toBe(2);
    });
  }

  it('clears the record at the end when the newest echo already came back', () => {
    const { states } = run('50', [...aba, ext('51'), { type: 'end' }], cfg);
    expect(states[3].written).toEqual(['51', '52']);
    expect(states[5].written).toEqual([]);
  });

  it('keeps the record at the end while the newest echo is outstanding', () => {
    const { states } = run('50', [...aba, { type: 'end' }], cfg);
    expect(states[4].written).toEqual(['51', '52']);
  });
});

describe('a drag that starts outside the bounds', () => {
  const cfg = config({ step: adaptiveTimeStep, min: 0.1, max: 3600 });
  const drag = (text: string, dx: number) =>
    run(text, [{ type: 'start' }, { type: 'move', dx }, { type: 'end' }], cfg);

  it('lands on the minimum first when raised', () => {
    expect(drag('0.01', -10).state.text).toBe('0.1');
    expect(drag('0.01', -20).state.text).toBe('0.2');
  });

  it('does nothing when lowered further below the minimum', () => {
    const { state, writes } = drag('0.01', 30);
    expect(state.text).toBe('0.01');
    expect(writes).toEqual([]);
  });

  it('lands on the maximum first when lowered', () => {
    expect(drag('99999', 10).state.text).toBe('3600');
    expect(drag('99999', 20).state.text).toBe('3599');
  });

  it('does nothing when raised further above the maximum', () => {
    const { state, writes } = drag('99999', -30);
    expect(state.text).toBe('99999');
    expect(writes).toEqual([]);
  });

  it('steps from the bound itself on a nudge', () => {
    const up = run('0.01', [{ type: 'nudge', direction: 1 }], cfg);
    expect(up.state.text).toBe('0.1');
    const down = run('99999', [{ type: 'nudge', direction: -1 }], cfg);
    expect(down.state.text).toBe('3600');
    expect(run('0.01', [{ type: 'nudge', direction: -1 }], cfg).writes).toEqual(
      []
    );
  });
});

describe('a bound that is off the step grid', () => {
  // Resize: POSITIVE_DIMENSION_MIN is 0.1, the grid is 0.25 in or 0.5 cm.
  for (const [step, frac] of [
    [0.25, 0.4],
    [0.5, 0.2],
  ] as const) {
    const cfg = config({ step, min: 0.1, max: 100 });

    it(`adds a minor unlabelled tick at 0.1 on a ${step} grid`, () => {
      const ticks = rulerWindowTicks({
        origin: 2,
        step,
        min: 0.1,
        max: 100,
        lo: -30,
        hi: 30,
      });
      const bound = ticks.find((t) => t.value === 0.1);
      expect(bound).toBeDefined();
      expect(bound?.major).toBe(false);
      expect(bound?.label).toBeNull();
      const below = (2 - 0) / step;
      expect(bound?.index).toBeCloseTo(-below + frac, 8);
      expect(ticks.some((t) => t.value < 0.1)).toBe(false);
      expect(ticks.filter((t) => t.value === 0.1)).toHaveLength(1);
    });

    it(`rests a drag, a nudge and a typed 0.1 on the same index (${step})`, () => {
      const typed = run('1', [{ type: 'external', text: '0.1' }], cfg).state;
      const dragged = run(
        '1',
        [{ type: 'start' }, { type: 'move', dx: 500 }, { type: 'end' }],
        cfg
      ).state;
      expect(dragged.index).toBeCloseTo(typed.index, 8);
      expect(dragged.translate).toBeCloseTo(typed.translate, 8);
      const nudged = run(
        `${step}`,
        [{ type: 'nudge', direction: -1 }],
        cfg
      ).state;
      const typedFromStep = run(
        `${step}`,
        [{ type: 'external', text: '0.1' }],
        cfg
      ).state;
      expect(nudged.index).toBeCloseTo(typedFromStep.index, 8);
    });

    it(`steps back off 0.1 to the first grid tick (${step})`, () => {
      const { state } = run(
        '0.1',
        [{ type: 'start' }, { type: 'move', dx: -10 }, { type: 'end' }],
        cfg
      );
      expect(state.text).toBe(step === 0.25 ? '0.25' : '0.5');
      expect(Number.isInteger(state.index)).toBe(true);
    });
  }

  it('limits the drag range to the off-grid bound', () => {
    const cfg = config({ step: 0.25, min: 0.1, max: 100 });
    const state = createRulerState('1', cfg);
    // 1 is 4 steps above 0; 0.1 is 0.4 above 0, so 3.6 steps below the origin.
    expect(state.maxTranslate).toBeCloseTo(36, 8);
  });
});

describe('the end of a drag', () => {
  const cases: Array<[string, number[]]> = [
    ['one large move with no intermediate ones', [-137]],
    ['moves landing exactly on a step boundary', [-5, 5, -15, 15, -25]],
    ['a move past the upper bound', [-5000]],
    ['a move past the lower bound', [5000]],
    ['a fast out and back', [-300, 40, -13]],
  ];
  for (const [name, dxs] of cases) {
    it(`rests on the tick of the written text: ${name}`, () => {
      // The row sends the final dx as one more move, then the end.
      const last = dxs[dxs.length - 1];
      const { state } = run('50', [
        { type: 'start' },
        ...dxs.map((dx): RulerEvent => ({ type: 'move', dx })),
        { type: 'move', dx: last },
        { type: 'end' },
      ]);
      expect(state.session).toBeNull();
      expect(state.translate).toBeCloseTo(-state.index * 10, 8);
      // `run` already proves the index is the position of the text.
      expect(state.text).toBe(
        run('50', [
          { type: 'start' },
          { type: 'move', dx: last },
          { type: 'end' },
        ]).state.text
      );
    });
  }

  it('returns exactly to the start when the finger returns to touch-down', () => {
    const { state, writes } = run('50', [
      { type: 'start' },
      { type: 'move', dx: -40 },
      { type: 'move', dx: 0 },
      { type: 'end' },
    ]);
    expect(state.text).toBe('50');
    expect(state.translate).toBe(0);
    expect(writes).toEqual(['54', '50']);
  });
});

describe('events from outside never write', () => {
  it('returns no write for external, config and layout, even mid-drag', () => {
    const cfg = config();
    let state = createRulerState('50', cfg);
    state = rulerReduce(state, { type: 'start' }, cfg);
    state = rulerReduce(state, { type: 'move', dx: -30 }, cfg);
    expect(state.write).toBe('53');
    const events: Array<[RulerEvent, RulerConfig]> = [
      [{ type: 'external', text: '53' }, cfg],
      [{ type: 'external', text: '20' }, cfg],
      [{ type: 'external', text: 'abc' }, cfg],
      [{ type: 'config' }, { ...cfg, step: 0.5 }],
      [{ type: 'layout' }, { ...cfg, width: 500 }],
    ];
    for (const [event, using] of events) {
      state = rulerReduce(state, event, using);
      expect(state.write).toBeNull();
    }
  });
});

describe('an empty field', () => {
  const cfg = config({ step: adaptiveTimeStep, min: 0.1, max: 3600 });

  it('forgets a drag that returned to its start', () => {
    let state = createRulerState('', cfg);
    const startIndex = state.index;
    state = rulerReduce(state, { type: 'start' }, cfg);
    for (const dx of [-10, -20, -30, -40]) {
      state = rulerReduce(state, { type: 'move', dx }, cfg);
    }
    expect(state.text).toBe('0.5');
    state = rulerReduce(state, { type: 'move', dx: 0 }, cfg);
    state = rulerReduce(state, { type: 'end' }, cfg);
    expect(state.text).toBe('');
    expect(state.lastParsed).toBeNull();
    expect(state.index).toBe(startIndex);
    // One more step goes where the line says: from 0.1 to 0.2.
    state = rulerReduce(state, { type: 'start' }, cfg);
    state = rulerReduce(state, { type: 'move', dx: -10 }, cfg);
    expect(state.text).toBe('0.2');
    expect(state.index).toBe(startIndex + 1);
  });

  it('lands on the tick the line shows first on a nudge', () => {
    const up = rulerReduce(
      createRulerState('', cfg),
      { type: 'nudge', direction: 1 },
      cfg
    );
    expect(up.text).toBe('0.1');
    expect(up.write).toBe('0.1');
    const down = rulerReduce(
      createRulerState('abc', cfg),
      { type: 'nudge', direction: -1 },
      cfg
    );
    expect(down.text).toBe('0.1');
  });
});

describe('the newest echo arriving in a drag that has not written yet', () => {
  const cfg = config({ max: 1000 });
  const ext = (text: string): RulerEvent => ({ type: 'external', text });

  it('follows it, restarts the drag from it and keeps the record', () => {
    const events: RulerEvent[] = [
      { type: 'start' },
      { type: 'move', dx: -10 },
      { type: 'move', dx: -20 },
      { type: 'end' },
      ext('51'),
      { type: 'start' },
      ext('52'),
    ];
    const { states, state } = run('50', events, cfg);
    // A late echo after the end moved the ruler back to 51.
    expect(states[4].text).toBe('51');
    expect(states[4].written).toEqual(['51', '52']);
    expect(state.session).not.toBeNull();
    expect(state.text).toBe('52');
    expect(state.index).toBe(2);
    expect(state.write).toBeNull();
    expect(state.written).toEqual(['51', '52']);
    // A one-step drag goes from 52.
    const next = rulerReduce(state, { type: 'move', dx: -10 }, cfg);
    expect(next.write).toBe('53');
    expect(next.index).toBe(3);
  });

  it('only marks the echo settled when it equals the current text', () => {
    const { state } = run(
      '50',
      [
        { type: 'start' },
        { type: 'move', dx: -10 },
        { type: 'end' },
        { type: 'start' },
        ext('51'),
      ],
      cfg
    );
    expect(state.text).toBe('51');
    expect(state.echoSettled).toBe(true);
  });

  it('keeps the in-session rule once the drag has written', () => {
    const { state } = run(
      '50',
      [
        { type: 'start' },
        { type: 'move', dx: -10 },
        { type: 'move', dx: -20 },
        { type: 'external', text: '51' },
      ],
      cfg
    );
    expect(state.text).toBe('52');
    expect(state.index).toBe(2);
  });
});

describe('a nudge on a cleared field whose last value was off the grid', () => {
  it('rests the line on the rounded text it wrote', () => {
    const cfg = config({ step: 1, min: 0.1, max: 3600 });
    let state = createRulerState('10.5', cfg);
    state = rulerReduce(state, { type: 'external', text: '' }, cfg);
    state = rulerReduce(state, { type: 'nudge', direction: 1 }, cfg);
    expect(state.text).toBe('11');
    expect(state.index).toBeCloseTo(truePosition(state, cfg), 8);
    expect(Number.isInteger(state.index)).toBe(true);
    state = rulerReduce(state, { type: 'external', text: '11' }, cfg);
    state = rulerReduce(state, { type: 'start' }, cfg);
    state = rulerReduce(state, { type: 'move', dx: -20 }, cfg);
    expect(state.write).toBe('13');
    state = rulerReduce(state, { type: 'end' }, cfg);
    expect(state.index).toBeCloseTo(truePosition(state, cfg), 8);
    expect(state.translate).toBeCloseTo(-state.index * 10, 8);
  });
});

describe('Resize at its off-grid minimum, with the screen config', () => {
  // resize-screen.tsx: step 0.25 in imperial and 0.5 in metric, bounds from
  // POSITIVE_DIMENSION_MIN / _MAX, no unit conversion of the bound.
  for (const [unit, step] of [
    ['inches', 0.25],
    ['centimetres', 0.5],
  ] as const) {
    it(`has a tick for the minimum, under the line when it rests there (${unit})`, () => {
      const cfg = config({
        step,
        min: POSITIVE_DIMENSION_MIN,
        max: POSITIVE_DIMENSION_MAX,
        width: 340,
      });
      for (const start of ['0.1', '6.75', '1']) {
        const typed = run(
          start,
          [{ type: 'external', text: '0.1' }],
          cfg
        ).state;
        const dragged = run(
          start,
          [{ type: 'start' }, { type: 'move', dx: 5000 }, { type: 'end' }],
          cfg
        ).state;
        for (const state of [typed, dragged]) {
          const ticks = rulerWindowTicks({
            origin: state.origin,
            step,
            min: cfg.min,
            max: cfg.max,
            lo: state.windowLo,
            hi: state.windowHi,
          });
          const under = ticks.filter(
            (t) => Math.abs(t.x + state.translate) < 1e-6
          );
          expect(under.map((t) => t.value)).toEqual([POSITIVE_DIMENSION_MIN]);
          // The first grid tick above it is a fraction of a step away.
          const next = ticks.find((t) => t.value === step);
          expect(next).toBeDefined();
        }
      }
    });
  }
});
