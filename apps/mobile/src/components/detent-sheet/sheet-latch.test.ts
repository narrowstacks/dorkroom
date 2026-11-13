import { describe, expect, it } from 'vitest';
import {
  acquireLatch,
  dragOwnsClose,
  type LatchState,
  OPEN_LATCH,
  releaseCommit,
} from './sheet-latch';

interface RunResult {
  accepted: string[];
  state: LatchState;
}

/** Runs attempts in order and returns which were accepted, and the end state. */
function run(
  ...attempts: ('cancel' | 'commit' | 'drag' | 'refuse')[]
): RunResult {
  let state = OPEN_LATCH;
  const accepted: string[] = [];
  for (const attempt of attempts) {
    if (attempt === 'refuse') {
      state = releaseCommit(state);
      continue;
    }
    const result = acquireLatch(state, attempt);
    state = result.state;
    if (result.accepted) accepted.push(attempt);
  }
  return { accepted, state };
}

describe('sheet latch', () => {
  it('is single use: only the first attempt is accepted', () => {
    expect(run('commit', 'commit').accepted).toEqual(['commit']);
    expect(run('cancel', 'cancel', 'commit').accepted).toEqual(['cancel']);
  });

  it('lets a refused commit release it for another attempt', () => {
    expect(run('commit', 'refuse', 'commit').accepted).toEqual([
      'commit',
      'commit',
    ]);
    expect(run('commit', 'refuse', 'cancel').accepted).toEqual([
      'commit',
      'cancel',
    ]);
  });

  it('does not release a close that holds it', () => {
    expect(run('cancel', 'refuse', 'commit').accepted).toEqual(['cancel']);
    expect(run('drag', 'refuse', 'commit').accepted).toEqual(['drag']);
  });

  it('never delivers a close after an accepted commit', () => {
    const { state } = run('commit', 'cancel', 'drag');
    expect(state.owner).toBe('commit');
    expect(dragOwnsClose(state)).toBe(false);
  });

  it('delivers only the close when a drag dismiss is followed by a commit', () => {
    const { accepted, state } = run('drag', 'commit');
    expect(accepted).toEqual(['drag']);
    expect(dragOwnsClose(state)).toBe(true);
  });

  it('keeps a cancel from being delivered again by the drag slide-out', () => {
    expect(dragOwnsClose(run('cancel').state)).toBe(false);
  });
});
