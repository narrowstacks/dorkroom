import { describe, expect, it } from 'vitest';
import { resolveIncomingLink } from '@/lib/deep-link';
import { getTool } from '@/lib/tools';
import { AGITATION_PRESETS } from './agitation';
import { createTimerState, timerReducer } from './engine';
import {
  activityPalette,
  activityPropsChanged,
  buildActivityProps,
  DEFAULT_TITLE,
  dismissalFor,
  LIVE_ACTIVITY_URL,
  MAX_ROWS,
  staleDateFor,
  type TimerActivityProps,
} from './live-activity-props';
import { DEFAULT_BW_STAGES } from './presets';
import type { TimerAction, TimerStage, TimerState } from './types';

const NOW = 1_800_000_000_000;

const stage = (
  id: string,
  durationSeconds: number,
  extra: Partial<TimerStage> = {}
): TimerStage => ({
  id,
  kind: 'custom',
  name: id,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern: null,
  ...extra,
});

const START: TimerAction = { type: 'START' };
const run = (stages: TimerStage[], ...actions: TimerAction[]): TimerState =>
  [START, ...actions].reduce(timerReducer, createTimerState(stages));

const build = (timer: TimerState, over: { title?: string | null } = {}) => {
  const props = buildActivityProps({
    timer,
    asOfMs: NOW,
    runId: 'r1',
    title: over.title ?? null,
    safelight: false,
    controls: true,
  });
  if (props === null) throw new Error('expected props');
  return props;
};

describe('buildActivityProps', () => {
  it('has no activity for an idle timer or an empty sequence', () => {
    const input = { asOfMs: NOW, runId: 'r', safelight: false, controls: true };
    expect(
      buildActivityProps({
        ...input,
        timer: createTimerState([stage('a', 60)]),
      })
    ).toBeNull();
    expect(
      buildActivityProps({ ...input, timer: createTimerState([]) })
    ).toBeNull();
  });

  it('lays every stage out as absolute timestamps from the start of the run', () => {
    const props = build(run([stage('a', 60), stage('b', 30)]));
    expect(props.status).toBe('running');
    expect(props.rows.map((r) => [r.startMs, r.endMs])).toEqual([
      [NOW, NOW + 60_000],
      [NOW + 60_000, NOW + 90_000],
    ]);
    expect(props.endMs).toBe(NOW + 90_000);
    expect(props.startMs).toBe(NOW);
    expect(props.currentRow).toBe(0);
    expect(props.hiddenAfter).toBe(0);
  });

  it('anchors a stage that is part way through in the past', () => {
    const timer: TimerState = {
      ...run([stage('a', 60), stage('b', 30)]),
      remainingSeconds: 45,
    };
    const props = build(timer);
    expect(props.rows[0]).toMatchObject({
      startMs: NOW - 15_000,
      endMs: NOW + 45_000,
    });
    expect(props.endMs).toBe(NOW + 75_000);
    expect(props.startMs).toBe(NOW - 15_000);
  });

  it('keeps finished stages out of the window and counts what is hidden', () => {
    const stages = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) =>
      stage(id, 60)
    );
    const props = build(
      run(stages, { type: 'NEXT_STAGE' }, { type: 'NEXT_STAGE' })
    );
    expect(props.rows.map((r) => r.name)).toEqual(['c', 'd', 'e']);
    expect(props.hiddenAfter).toBe(2);
    expect(props.currentRow).toBe(0);
    // The window is the current stage onward, but timestamps still describe
    // the whole run: 5 stages remain, so it ends 5 minutes from now.
    expect(props.endMs).toBe(NOW + 5 * 60_000);
    expect(props.rows).toHaveLength(MAX_ROWS);
  });

  it('shows frozen values while paused: spent 0, current held, later full', () => {
    const timer: TimerState = {
      ...run([stage('a', 60), stage('b', 30), stage('c', 20)], {
        type: 'NEXT_STAGE',
      }),
      remainingSeconds: 12,
    };
    const props = build(timerReducer(timer, { type: 'PAUSE' }));
    expect(props.status).toBe('paused');
    expect(props.rows.map((r) => r.frozenSeconds)).toEqual([12, 20]);
    expect(props.frozenTotalSeconds).toBe(32);
  });

  it('reads 0:00 on every row once completed, over the real past schedule', () => {
    const done = run(
      [stage('a', 60), stage('b', 30)],
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' }
    );
    expect(done.status).toBe('completed');
    const props = build(done);
    expect(props.status).toBe('completed');
    expect(props.controls).toBe(false);
    expect(props.rows.every((r) => r.frozenSeconds === 0)).toBe(true);
    expect(props.rows.every((r) => r.endMs <= NOW)).toBe(true);
    expect(props.endMs).toBe(NOW);
    expect(props.frozenTotalSeconds).toBe(0);
    expect(props.note).toBeNull();
  });

  it('describes the current stage agitation as static text, not a time', () => {
    const props = build(
      run([
        stage('Develop', 420, {
          agitationPattern: { id: 'ilford', params: AGITATION_PRESETS.ilford },
        }),
      ])
    );
    expect(props.note).toBe('Agitate: First 30s, then 10s every minute');
  });

  it('falls back to the freeform note and drops "no agitation"', () => {
    expect(
      build(run([stage('Wash', 60, { agitation: 'Running water' })])).note
    ).toBe('Running water');
    expect(
      build(
        run([
          stage('Fix', 60, {
            agitationPattern: { id: 'none', params: AGITATION_PRESETS.none },
          }),
        ])
      ).note
    ).toBeNull();
  });

  it('names the run, falling back to a default and cutting long names', () => {
    const timer = run([stage('a', 60)]);
    expect(build(timer).title).toBe(DEFAULT_TITLE);
    expect(build(timer, { title: '  Tri-X in HC-110  ' }).title).toBe(
      'Tri-X in HC-110'
    );
    expect(build(timer, { title: 'x'.repeat(200) }).title.length).toBeLessThan(
      45
    );
  });

  it('turns the buttons off when asked and for a finished run', () => {
    const timer = run([stage('a', 60)]);
    expect(build(timer).controls).toBe(true);
    expect(
      buildActivityProps({
        timer,
        asOfMs: NOW,
        runId: 'r',
        safelight: false,
        controls: false,
      })?.controls
    ).toBe(false);
  });

  it('keeps a 12-stage run well under the 4 KB ActivityKit limit', () => {
    const stages = Array.from({ length: 12 }, (_, i) =>
      stage(`stage-${i}`, 90 + i, {
        name: `A fairly long stage name ${i}`,
        agitationPattern: { id: 'ilford', params: AGITATION_PRESETS.ilford },
      })
    );
    const props = build(run(stages), {
      title: 'A very long preset name that will be cut to fit the payload',
    });
    const bytes = new TextEncoder().encode(JSON.stringify(props)).length;
    expect(props.rows).toHaveLength(MAX_ROWS);
    expect(props.hiddenAfter).toBe(9);
    expect(bytes).toBeLessThan(2500);
  });

  it('fits the default preset', () => {
    const props = build(run(DEFAULT_BW_STAGES));
    expect(props.rows.map((r) => r.name)).toEqual([
      'Develop',
      'Stop bath',
      'Fixer',
    ]);
    expect(props.hiddenAfter).toBe(1);
  });
});

describe('activityPalette', () => {
  it('uses only red in safelight mode', () => {
    const p = activityPalette(true);
    for (const colour of Object.values(p)) {
      expect(colour).toMatch(/^#[0-9a-f]{2}0000$/);
    }
    expect(p.bg).toBe('#000000');
  });

  it('uses the Develop teal on a dark background otherwise', () => {
    const p = activityPalette(false);
    expect(p.accent).toBe('#2dd4bf');
    expect(p.bg).toBe('#0b0b0c');
  });
});

describe('activityPropsChanged', () => {
  const base = (): TimerActivityProps =>
    build(run([stage('a', 60), stage('b', 30)]));

  it('treats null and a different run as changed', () => {
    expect(activityPropsChanged(null, base())).toBe(true);
    expect(activityPropsChanged(base(), { ...base(), runId: 'r2' })).toBe(true);
  });

  it('ignores clock jitter on a tick', () => {
    const a = base();
    const b: TimerActivityProps = {
      ...a,
      asOfMs: a.asOfMs + 250,
      endMs: a.endMs + 3,
      startMs: a.startMs - 2,
      rows: a.rows.map((r) => ({
        ...r,
        startMs: r.startMs + 2,
        endMs: r.endMs + 3,
      })),
    };
    expect(activityPropsChanged(a, b)).toBe(false);
  });

  it('sees a pause, a skip and a restarted stage', () => {
    const running = run([stage('a', 60), stage('b', 30)]);
    const a = build(running);
    expect(
      activityPropsChanged(a, build(timerReducer(running, { type: 'PAUSE' })))
    ).toBe(true);
    expect(
      activityPropsChanged(
        a,
        build(timerReducer(running, { type: 'NEXT_STAGE' }))
      )
    ).toBe(true);
    const later = build({ ...running, remainingSeconds: 40 });
    const restarted = build(running);
    expect(activityPropsChanged(later, restarted)).toBe(true);
  });
});

describe('dismissalFor and staleDateFor', () => {
  it('lingers two minutes after the end, or goes at once when that has passed', () => {
    expect(dismissalFor(NOW, NOW + 10_000)).toEqual({
      kind: 'after',
      atMs: NOW + 120_000,
    });
    expect(dismissalFor(NOW, NOW + 120_000)).toEqual({ kind: 'immediate' });
    expect(dismissalFor(NOW, NOW + 3_600_000)).toEqual({ kind: 'immediate' });
  });

  it('goes stale when the last stage ends, but never while paused', () => {
    const running = run([stage('a', 60)]);
    expect(staleDateFor(build(running))).toBe(NOW + 60_000);
    expect(
      staleDateFor(build(timerReducer(running, { type: 'PAUSE' })))
    ).toBeNull();
  });
});

describe('LIVE_ACTIVITY_URL', () => {
  it('is the canonical Process Timer link and passes the resolver unchanged', () => {
    expect(LIVE_ACTIVITY_URL).toBe(
      `dorkroom://${getTool('timer')?.route.slice(1)}`
    );
    expect(resolveIncomingLink(LIVE_ACTIVITY_URL)).toBe(LIVE_ACTIVITY_URL);
  });
});
