/**
 * The pure state of `DetentSheet`'s single-use latch. One opening ends in
 * exactly one of: Cancel (or the scrim, or the hardware close), an accepted
 * commit, or a dismiss drag. The first to take the latch owns the ending and
 * every later attempt is refused, so a close is never delivered after an
 * accepted commit and a commit never follows a close. A refused commit gives
 * the latch back.
 */
export type LatchOwner = 'none' | 'cancel' | 'commit' | 'drag';

export interface LatchState {
  owner: LatchOwner;
}

export const OPEN_LATCH: LatchState = { owner: 'none' };

export interface AcquireResult {
  state: LatchState;
  accepted: boolean;
}

/** Takes the latch for `owner` if nobody holds it. */
export function acquireLatch(
  state: LatchState,
  owner: Exclude<LatchOwner, 'none'>
): AcquireResult {
  if (state.owner !== 'none') return { state, accepted: false };
  return { state: { owner }, accepted: true };
}

/** Gives the latch back after a refused commit; any other owner keeps it. */
export function releaseCommit(state: LatchState): LatchState {
  return state.owner === 'commit' ? OPEN_LATCH : state;
}

/** Whether the dismiss drag's slide-out may deliver the close. */
export function dragOwnsClose(state: LatchState): boolean {
  return state.owner === 'drag';
}
