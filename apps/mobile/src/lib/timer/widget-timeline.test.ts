import { describe, expect, it } from 'vitest';
import { widgetPalette } from '@/lib/widgets/widget-palette';
import { KEEP_ALIVE_MS } from '@/lib/widgets/widget-sync';
import { createTimerState, timerReducer } from './engine';
import { buildActivityProps } from './live-activity-props';
import type { TimerAction, TimerStage, TimerState } from './types';
import {
  DONE_SHOWN_MS,
  TIMER_WIDGET_URL,
  timerScheduleChanged,
  timerWidgetEntries,
  type TimerWidgetEntry,
  timerWidgetSchedule,
  type TimerWidgetState,
  timerWidgetTimeline,
} from './widget-timeline';

const stage = (name: string, durationSeconds: number): TimerStage => ({
  id: name,
  kind: 'custom',
  name,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern: null,
});

const NOW = 1_800_000_000_000;
const START: TimerAction = { type: 'START' };
const PAUSE: TimerAction = { type: 'PAUSE' };
const SKIP: TimerAction = { type: 'NEXT_STAGE' };
const PALETTE = widgetPalette('teal');
const STAGES = [stage('Develop', 420), stage('Stop', 60), stage('Fix', 300)];
const RUN_END = NOW + 780_000;

const run = (...actions: TimerAction[]): TimerState =>
  [START, ...actions].reduce(timerReducer, createTimerState(STAGES));

const input = (
  timer: TimerState,
  extra: Partial<TimerWidgetState> = {}
): TimerWidgetState => ({ timer, title: 'Tri-X', lastRun: null, ...extra });

const schedule = (timer: TimerState, at = NOW, extra = {}) =>
  timerWidgetSchedule(input(timer, extra), at, PALETTE);
const build = (timer: TimerState, at = NOW, now = at, extra = {}) =>
  timerWidgetTimeline(input(timer, extra), at, PALETTE, now);
const summary = (entries: TimerWidgetEntry[]) =>
  entries.map((e) => [e.date.getTime() - NOW, e.props.status, e.props.stage]);

describe('timerWidgetTimeline', () => {
  it('is the idle entry and its keep-alive when nothing runs', () => {
    const idle = createTimerState(STAGES);
    const entries = build(idle, NOW, NOW, {
      lastRun: { title: 'HP5 in DD-X' },
    });
    expect(summary(entries)).toEqual([
      [0, 'idle', ''],
      [KEEP_ALIVE_MS, 'idle', ''],
    ]);
    expect(entries[0].props).toMatchObject({
      idleLine: 'Last: HP5 in DD-X',
      url: TIMER_WIDGET_URL,
    });
    expect(build(idle)[0].props.idleLine).toBe('Tap to open the timer');
    expect(
      build(idle, NOW, NOW, { lastRun: { title: null } })[0].props.idleLine
    ).toBe('Tap to open the timer');
  });

  it('dates one entry per stage at its absolute start, then Done, idle 30 min later and the keep-alive', () => {
    const entries = build(run());
    expect(summary(entries)).toEqual([
      [0, 'running', 'Develop'],
      [420_000, 'running', 'Stop'],
      [480_000, 'running', 'Fix'],
      [780_000, 'done', ''],
      [780_000 + DONE_SHOWN_MS, 'idle', ''],
      [780_000 + DONE_SHOWN_MS + KEEP_ALIVE_MS, 'idle', ''],
    ]);
    expect(entries[1].props).toMatchObject({
      stageNumber: 2,
      stageCount: 3,
      next: 'Fix',
      stageStartMs: NOW + 420_000,
      stageEndMs: NOW + 480_000,
      runStartMs: NOW,
      runEndMs: RUN_END,
      title: 'Tri-X',
    });
    expect(entries[2].props.next).toBe('');
    // after the run, idle names it
    expect(entries[4].props.idleLine).toBe('Last: Tri-X');
  });

  it('starts at the CURRENT stage: finished stages are dropped', () => {
    // pushed 7m 10s in: Develop is over, Stop is current
    const later = timerReducer(run(), { type: 'TICK', seconds: 430 });
    const entries = build(later, NOW + 430_000);
    expect(summary(entries)[0]).toEqual([420_000, 'running', 'Stop']);
    expect(entries).toHaveLength(5);
    // the gallery preview (WidgetKit's snapshot) shows the first entry: Stop
    expect(entries[0].props.stageEndMs).toBe(NOW + 480_000);
  });

  it('a timeline built earlier drops its past entries at push time', () => {
    const scheduled = schedule(run());
    const pushedLater = timerWidgetEntries(scheduled, NOW + 500_000);
    expect(summary(pushedLater)[0]).toEqual([480_000, 'running', 'Fix']);
  });

  it('anchors exactly as the Live Activity does', () => {
    const timer = { ...run({ type: 'NEXT_STAGE' }), remainingSeconds: 25 };
    const activity = buildActivityProps({
      timer,
      asOfMs: NOW,
      runId: '',
      safelight: false,
      controls: false,
    });
    const entries = build(timer);
    expect(entries[0].props.runStartMs).toBe(activity?.startMs);
    expect(entries[0].props.runEndMs).toBe(activity?.endMs);
    // the current stage (Stop) started 35 s ago
    expect(entries[0].date.getTime()).toBe(NOW - 35_000);
    expect(entries[0].props.stage).toBe('Stop');
  });

  it('freezes a paused run in one entry plus the keep-alive', () => {
    const pausedTimer = timerReducer(
      { ...run(), remainingSeconds: 252.4 },
      { type: 'PAUSE' }
    );
    const entries = build(pausedTimer);
    expect(entries).toHaveLength(2);
    expect(entries[0].props).toMatchObject({
      status: 'paused',
      stage: 'Develop',
      stageNumber: 1,
      next: 'Stop',
      frozenStageSeconds: 252,
      frozenTotalSeconds: 612,
      stageStartMs: 0,
      stageEndMs: 0,
      runEndMs: 0,
    });
    expect(entries[1].date.getTime()).toBe(NOW + KEEP_ALIVE_MS);
  });

  it('a finished run shows Done from its end, idle 30 minutes later, then the keep-alive', () => {
    const finished = run(
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' }
    );
    // the app noticed at NOW; the run had been scheduled to end 10 s earlier
    const entries = build(finished, NOW, NOW, { finishedAtMs: NOW - 10_000 });
    expect(summary(entries)).toEqual([
      [-10_000, 'done', ''],
      [DONE_SHOWN_MS - 10_000, 'idle', ''],
      [DONE_SHOWN_MS - 10_000 + KEEP_ALIVE_MS, 'idle', ''],
    ]);
    // seen an hour after it ended: idle at once
    const late = build(finished, NOW, NOW + 3_600_000, { finishedAtMs: NOW });
    expect(late.map((e) => e.props.status)).toEqual(['idle', 'idle']);
  });

  it('leaves zero-length stages out of the entries, the numbering and "next"', () => {
    const timer = [START].reduce(
      timerReducer,
      createTimerState([
        stage('A', 60),
        stage('Empty', 0),
        stage('B', 60),
        stage('Also empty', 0),
      ])
    );
    const entries = build(timer);
    expect(entries.map((e) => e.props.stage).slice(0, 2)).toEqual(['A', 'B']);
    expect(entries[0].props).toMatchObject({
      next: 'B',
      stageNumber: 1,
      stageCount: 2,
    });
    expect(entries[1].props).toMatchObject({
      next: '',
      stageNumber: 2,
      stageCount: 2,
    });
  });

  it('a run paused on a zero-length stage shows the stage that resumes', () => {
    const timer = timerReducer(
      timerReducer(
        [START].reduce(
          timerReducer,
          createTimerState([stage('A', 60), stage('Empty', 0), stage('B', 90)])
        ),
        { type: 'NEXT_STAGE' }
      ),
      { type: 'PAUSE' }
    );
    expect(timer.currentStageIndex).toBe(1);
    expect(build(timer)[0].props).toMatchObject({
      status: 'paused',
      stage: 'B',
      stageNumber: 2,
      stageCount: 2,
      frozenStageSeconds: 90,
    });
  });

  it('a run paused on a TRAILING zero-length stage shows the last timed stage, nothing left', () => {
    // a blank stage added last is 0 s: Start, Pause, Skip leaves the engine
    // paused on it
    const stages = [stage('Dev', 60), stage('Fix', 0)];
    const timer = [START, PAUSE, SKIP].reduce(
      timerReducer,
      createTimerState(stages)
    );
    expect(timer).toMatchObject({ status: 'paused', currentStageIndex: 1 });
    expect(build(timer)[0].props).toMatchObject({
      status: 'paused',
      stage: 'Dev',
      stageNumber: 1,
      stageCount: 1,
      next: '',
      frozenStageSeconds: 0,
    });
  });

  it('never numbers a stage 0 while running or done, whatever the zero-length stages', () => {
    const stages = [stage('Empty', 0), stage('Dev', 60), stage('Fix', 0)];
    const states = [
      [START],
      [START, SKIP],
      [START, SKIP, SKIP],
      [START, { type: 'TICK', seconds: 30 } as const],
      [START, SKIP, SKIP, SKIP],
    ].map((actions) => actions.reduce(timerReducer, createTimerState(stages)));
    for (const timer of states) {
      for (const entry of build(timer)) {
        const { status, stageNumber, stage: name } = entry.props;
        if (status === 'running') {
          expect(stageNumber, timer.status).toBe(1);
          expect(name).toBe('Dev');
        } else {
          expect(stageNumber, `${timer.status} ${status}`).toBe(0);
          expect(name).toBe('');
        }
      }
    }
  });

  it('keeps a 12-stage run small enough for App Group UserDefaults', () => {
    const long = 'Stage with a rather long name that gets cut';
    const twelve = Array.from({ length: 12 }, (_, i) =>
      stage(`${long} ${i}`, 60)
    );
    const timer = [START].reduce(timerReducer, createTimerState(twelve));
    const entries = timerWidgetTimeline(
      input(timer, { title: 'x'.repeat(200) }),
      NOW,
      PALETTE
    );
    // 12 stages, Done, idle, keep-alive
    expect(entries).toHaveLength(15);
    // What expo-widgets stores: [{ timestamp, props }]
    const stored = JSON.stringify(
      entries.map((e) => ({ timestamp: e.date.getTime(), props: e.props }))
    );
    // About 8 KB with every name at its cut length; WidgetKit and UserDefaults
    // handle far more, but pin it so a payload change is deliberate.
    expect(stored.length).toBeLessThan(10 * 1024);
    expect(entries.every((e) => e.props.title.length <= 40)).toBe(true);
    expect(entries.every((e) => e.props.stage.length <= 24)).toBe(true);
  });
});

describe('timerScheduleChanged', () => {
  it('is no change a tick, or a stage boundary, later', () => {
    const before = schedule(run());
    const later = timerReducer(run(), { type: 'TICK', seconds: 430 });
    expect(later.currentStageIndex).toBe(1);
    expect(timerScheduleChanged(before, schedule(later, NOW + 430_000))).toBe(
      false
    );
    const jitter = timerReducer(run(), { type: 'TICK', seconds: 1 });
    expect(timerScheduleChanged(before, schedule(jitter, NOW + 1_004))).toBe(
      false
    );
  });

  it('is a change on start, pause, resume, skip, reset and completion', () => {
    const idle = schedule(createTimerState(STAGES));
    const running = schedule(run());
    expect(timerScheduleChanged(null, running)).toBe(true);
    expect(timerScheduleChanged(idle, running)).toBe(true);

    const pausedTimer = timerReducer(run(), { type: 'PAUSE' });
    const paused = schedule(pausedTimer);
    expect(timerScheduleChanged(running, paused)).toBe(true);

    // resumed 60 s later: every stage now ends a minute later
    const resumed = schedule(
      timerReducer(pausedTimer, { type: 'RESUME' }),
      NOW + 60_000
    );
    expect(timerScheduleChanged(running, resumed)).toBe(true);
    expect(timerScheduleChanged(paused, resumed)).toBe(true);

    expect(
      timerScheduleChanged(running, schedule(run({ type: 'NEXT_STAGE' })))
    ).toBe(true);
    expect(timerScheduleChanged(running, idle)).toBe(true);

    const finished = schedule(
      run(
        { type: 'NEXT_STAGE' },
        { type: 'NEXT_STAGE' },
        { type: 'NEXT_STAGE' }
      )
    );
    expect(finished.status).toBe('done');
    expect(timerScheduleChanged(running, finished)).toBe(true);
  });

  it('a paused run seen again an hour later is no change', () => {
    const pausedTimer = timerReducer(run(), { type: 'PAUSE' });
    expect(
      timerScheduleChanged(
        schedule(pausedTimer),
        schedule(pausedTimer, NOW + 3_600_000)
      )
    ).toBe(false);
  });

  it('a renamed preset or a new palette is a change', () => {
    const running = schedule(run());
    expect(
      timerScheduleChanged(running, schedule(run(), NOW, { title: 'Other' }))
    ).toBe(true);
    const rose = timerWidgetSchedule(input(run()), NOW, widgetPalette('rose'));
    expect(timerScheduleChanged(running, rose)).toBe(true);
  });
});
