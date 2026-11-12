import { parseDecimalInput } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import {
  createRulerState,
  positionOf,
  type RulerConfig,
  type RulerEvent,
  rulerReduce,
  type RulerState,
} from './ruler-machine';
import {
  adaptiveTimeStep,
  formatScrubbed,
  resolveScrubStart,
} from './scrub-value';

/**
 * A model of the row and its parent. The parent holds the value in state and
 * commits the machine's writes to the row in order, but late or batched (only
 * the latest of several writes comes back). The sequences mix drags, typing,
 * presets and nudges. Once everything has been delivered, the machine's text
 * must equal the parent's value and the line must rest on that value.
 *
 * Excluded because a user cannot do them: typing or tapping a preset in the
 * same batch as a drag or nudge write that has not been committed yet (the
 * parent commits first, as a real render would), and starting a drag or nudge
 * on a value the row has not yet been given. A preset tapped with a second
 * finger DURING a drag is excluded too: when its text was already written it
 * is indistinguishable from an echo, and `useScrubMachine` re-checks the
 * latest value after the drag ends instead of the reducer.
 */
const configs: RulerConfig[] = [
  {
    step: 1,
    min: 0,
    max: 30,
    parse: parseDecimalInput,
    format: formatScrubbed,
    width: 300,
  },
  {
    step: adaptiveTimeStep,
    min: 0.1,
    max: 3600,
    parse: parseDecimalInput,
    format: formatScrubbed,
    width: 300,
  },
];
const texts = [
  '',
  '5',
  '10',
  '11',
  '12',
  '9',
  '8',
  '7.5',
  'abc',
  '30',
  '0',
  '13',
  '50',
  '9.9',
  '10.5',
];
const DRAGS = [-10, 10, -20, 20, -5, 5, 0];
const RUNS = 1500;

/** A small deterministic generator, so a failure replays. */
function generator(seed: number) {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(next() * items.length)];
  return { next, pick };
}

function simulate(seed: number): string | null {
  const { next, pick } = generator(seed);
  const cfg = pick(configs);
  let parent = pick(texts);
  let committed = parent;
  let machine: RulerState = createRulerState(committed, cfg);
  let finger = false;
  let live = false;
  let dx = 0;
  const reduce = (event: RulerEvent) => {
    machine = rulerReduce(machine, event, cfg);
    if (machine.write !== null) parent = machine.write;
  };
  const commit = () => {
    if (parent === committed) return;
    committed = parent;
    const hadSession = machine.session !== null;
    machine = rulerReduce(machine, { type: 'external', text: committed }, cfg);
    if (hadSession && machine.session === null) live = false;
  };
  for (let k = 0; k < 25; k += 1) {
    const r = next();
    if (r < 0.3) commit();
    else if (r < 0.4 && !finger) {
      commit();
      finger = true;
      live = true;
      dx = 0;
      reduce({ type: 'start' });
    } else if (r < 0.65 && finger) {
      dx += pick(DRAGS);
      if (live) reduce({ type: 'move', dx });
    } else if (r < 0.75 && finger) {
      if (live) {
        reduce({ type: 'move', dx });
        reduce({ type: 'end' });
      }
      finger = false;
      live = false;
    } else if (r < 0.85 && !finger) {
      commit();
      parent = pick(texts);
    } else if (r < 0.92 && !finger) {
      commit();
      reduce({ type: 'nudge', direction: pick([1, -1] as const) });
    }
  }
  commit();
  if (finger && live) {
    reduce({ type: 'move', dx });
    reduce({ type: 'end' });
  }
  commit();
  commit();
  const value = Math.min(
    cfg.max,
    Math.max(
      cfg.min,
      resolveScrubStart({
        parsed: cfg.parse(machine.text),
        lastParsed: machine.lastParsed,
        min: cfg.min,
        max: cfg.max,
      })
    )
  );
  const index = positionOf(machine.origin, value, cfg.step);
  if (machine.text !== parent)
    return `text ${machine.text} vs parent ${parent}`;
  if (machine.session !== null) return 'session left open';
  if (index === null || Math.abs(index - machine.index) > 1e-6) {
    return `index ${machine.index} vs ${index} for ${value}`;
  }
  if (Math.abs(machine.translate + machine.index * 10) > 1e-6) {
    return `translate ${machine.translate} vs index ${machine.index}`;
  }
  return null;
}

describe('the ruler against a parent that echoes late or batched', () => {
  it('ends with the parent value under the line, for many sequences', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= RUNS; seed += 1) {
      const failure = simulate(seed);
      if (failure !== null) failures.push(`seed ${seed}: ${failure}`);
    }
    expect(failures.slice(0, 3)).toEqual([]);
  });
});
