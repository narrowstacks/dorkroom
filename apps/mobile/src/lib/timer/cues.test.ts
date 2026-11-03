import { describe, expect, it } from 'vitest';
import { AGITATION_PRESETS } from './agitation';
import { MAX_SCHEDULED_CUES, upcomingCues } from './cues';
import { createTimerState, timerReducer } from './engine';
import type { TimerStage, TimerState } from './types';

const stage = (
  id: string,
  durationSeconds: number,
  agitationPattern: TimerStage['agitationPattern'] = null
): TimerStage => ({
  id,
  kind: 'custom',
  name: id,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern,
});

const ilford = { id: 'ilford', params: AGITATION_PRESETS.ilford } as const;

const started = (stages: TimerStage[]): TimerState =>
  timerReducer(createTimerState(stages), { type: 'START' });

describe('upcomingCues', () => {
  it('has none unless the timer is running', () => {
    const idle = createTimerState([stage('a', 60)]);
    expect(upcomingCues(idle)).toEqual([]);
    expect(
      upcomingCues(timerReducer(started([stage('a', 60)]), { type: 'PAUSE' }))
    ).toEqual([]);
  });

  it('puts a stage cue at each boundary, offset from now', () => {
    const cues = upcomingCues(started([stage('a', 60), stage('b', 30)]));
    expect(cues.map((c) => [c.kind, c.offsetSeconds, c.stageIndex])).toEqual([
      ['stage', 60, 0],
      ['stage', 90, 1],
    ]);
    expect(cues[0]?.body).toBe('Next: b');
    expect(cues[1]?.title).toBe('Process complete');
  });

  it('offsets are relative to the current position mid-stage', () => {
    const mid = timerReducer(started([stage('a', 60), stage('b', 30)]), {
      type: 'TICK',
      seconds: 45,
    });
    expect(upcomingCues(mid).map((c) => c.offsetSeconds)).toEqual([15, 45]);
  });

  it('adds an agitation cue for each window start after the stage begins', () => {
    // Ilford: windows start at 0, 60, 120 within 150 s; the 0 start is folded
    // into the stage cue.
    const cues = upcomingCues(started([stage('dev', 150, ilford)]));
    expect(cues.map((c) => [c.kind, c.offsetSeconds])).toEqual([
      ['agitate', 60],
      ['agitate', 120],
      ['stage', 150],
    ]);
  });

  it('skips agitation windows already behind the current position', () => {
    const mid = timerReducer(started([stage('dev', 150, ilford)]), {
      type: 'TICK',
      seconds: 70,
    });
    expect(upcomingCues(mid).map((c) => [c.kind, c.offsetSeconds])).toEqual([
      ['agitate', 50],
      ['stage', 80],
    ]);
  });

  it('caps the list, keeping the soonest cues', () => {
    const cues = upcomingCues(started([stage('long', 36_000, ilford)]));
    expect(cues).toHaveLength(MAX_SCHEDULED_CUES);
    expect(cues[0]?.offsetSeconds).toBe(60);
    expect(
      upcomingCues(started([stage('long', 36_000, ilford)]), 3)
    ).toHaveLength(3);
  });
});
