// The Process Timer widget's layout, compiled and rendered as the extension
// would, for every timeline entry (src/test/widget-runtime.ts).
import { join } from 'node:path';
import type { WidgetFamily } from 'expo-widgets';
import { describe, expect, it } from 'vitest';
import { createTimerState, timerReducer } from '@/lib/timer/engine';
import type { TimerAction, TimerStage, TimerState } from '@/lib/timer/types';
import {
  type TimerWidgetProps,
  timerWidgetTimeline,
} from '@/lib/timer/widget-timeline';
import {
  compileWidgetExport,
  envFor,
  evaluateWidget,
  layoutProblems,
  missingFromExpoUi,
  textOf,
  walk,
} from '@/test/widget-runtime';
import { widgetPalette } from './widget-palette';

const COMPONENTS = ['HStack', 'Image', 'Spacer', 'Text', 'VStack'] as const;
const MODIFIERS = [
  'containerBackground',
  'font',
  'foregroundStyle',
  'frame',
  'lineLimit',
  'monospacedDigit',
  'truncationMode',
  'widgetURL',
] as const;
const FAMILIES: WidgetFamily[] = [
  'systemSmall',
  'systemMedium',
  'accessoryRectangular',
];

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
const STAGES = [stage('Develop', 420), stage('Stop', 60), stage('Fix', 300)];
const run = (...actions: TimerAction[]): TimerState =>
  [START, ...actions].reduce(timerReducer, createTimerState(STAGES));
const timeline = (
  timer: TimerState,
  title: string | null = 'Tri-X',
  lastTitle: string | null = 'HP5 in DD-X'
) =>
  timerWidgetTimeline(
    { timer, title, lastRun: { title: lastTitle } },
    NOW,
    widgetPalette('teal')
  );

const running = timeline(run());
const STATES: Array<[string, TimerWidgetProps]> = [
  ['idle', timeline(createTimerState(STAGES))[0].props],
  ['running', running[0].props],
  ['running, last stage', running[2].props],
  ['paused', timeline(timerReducer(run(), { type: 'PAUSE' }))[0].props],
  ['done entry', running[3].props],
  [
    'done',
    timeline(
      run(
        { type: 'NEXT_STAGE' },
        { type: 'NEXT_STAGE' },
        { type: 'NEXT_STAGE' }
      )
    )[0].props,
  ],
  [
    'long text',
    timeline(
      [START].reduce(
        timerReducer,
        createTimerState([stage('A stage name far too long to fit', 4000)])
      ),
      'A preset title much too long for a small widget'
    )[0].props,
  ],
];

describe('timer widget layout', () => {
  const source = compileWidgetExport(
    join(__dirname, 'timer-widget.tsx'),
    'timerWidget'
  );
  const render = evaluateWidget<TimerWidgetProps>(
    source,
    COMPONENTS,
    MODIFIERS
  );

  it('is a function string that names nothing outside itself', () => {
    expect(source.startsWith('function')).toBe(true);
    expect(() => render(STATES[1][1], envFor('systemSmall'))).not.toThrow();
  });

  it('only names runtime globals that exist in the installed @expo/ui', () => {
    expect(missingFromExpoUi(COMPONENTS, MODIFIERS)).toEqual([]);
  });

  it('renders every family in every state with one link and one-line text', () => {
    for (const family of FAMILIES) {
      for (const [state, props] of STATES) {
        expect(
          layoutProblems(render(props, envFor(family)), props.url, [
            'No timer running',
            'Done',
          ]),
          `${family} ${state}`
        ).toEqual([]);
      }
    }
  });

  it('names the entry stage and counts it down with system timer text', () => {
    for (const family of FAMILIES) {
      const node = render(running[1].props, envFor(family));
      expect(textOf(node), family).toContain('Stop');
      const timers = [...walk(node)].filter(
        (el) => el.type === 'Text' && el.props.timerInterval
      );
      const spans = timers.map((el) => [
        el.props.timerInterval?.lower.getTime(),
        el.props.timerInterval?.upper.getTime(),
        el.props.countsDown,
      ]);
      // the stage, then the whole run
      expect(spans, family).toEqual([
        [NOW + 420_000, NOW + 480_000, true],
        [NOW, NOW + 780_000, true],
      ]);
    }
  });

  it('shows frozen numbers and no system timers while paused', () => {
    const paused = timeline(
      timerReducer({ ...run(), remainingSeconds: 252 }, { type: 'PAUSE' })
    )[0].props;
    for (const family of FAMILIES) {
      const node = render(paused, envFor(family));
      expect(
        [...walk(node)].some((el) => el.props.timerInterval),
        family
      ).toBe(false);
      expect(textOf(node), family).toEqual(
        expect.arrayContaining(['4:12', '10:12'])
      );
      expect(textOf(node).join(' '), family).toContain('Paused');
    }
  });

  it('reads Done at the end, and idle names the last run', () => {
    for (const family of FAMILIES) {
      expect(
        textOf(render(running[3].props, envFor(family))),
        family
      ).toContain('Done');
      const idle = textOf(render(STATES[0][1], envFor(family)));
      expect(idle, family).toEqual(
        expect.arrayContaining(['No timer running', 'Last: HP5 in DD-X'])
      );
    }
  });

  it('gives an hours-long countdown a wider frame', () => {
    const long = STATES[6][1];
    const node = render(long, envFor('systemSmall'));
    const [stageTimer] = [...walk(node)].filter(
      (el) => el.type === 'Text' && el.props.timerInterval
    );
    const frameArgs = stageTimer.props.modifiers?.find(
      (m) => m.modifier === 'frame'
    )?.args[0];
    expect(frameArgs).toEqual({ width: 30 * 4.2, alignment: 'leading' });
  });

  it('shows the current stage end as a clock time while running, which cannot go stale', () => {
    // the entry for Stop: ends at its absolute end
    const props = running[1].props;
    for (const family of ['systemSmall', 'systemMedium'] as const) {
      const node = render(props, envFor(family));
      const times = [...walk(node)].filter(
        (el) => el.type === 'Text' && el.props.date
      );
      expect(times, family).toHaveLength(1);
      expect(times[0].props.dateStyle).toBe('time');
      expect(times[0].props.date?.getTime()).toBe(props.stageEndMs);
      expect(textOf(node), family).toContain('ends');
    }
  });

  it('shows no end time when paused, done or idle', () => {
    for (const [state, props] of STATES) {
      if (props.status === 'running') continue;
      for (const family of FAMILIES) {
        const node = render(props, envFor(family));
        expect(
          [...walk(node)].some((el) => el.props.date),
          `${family} ${state}`
        ).toBe(false);
      }
    }
  });
});
