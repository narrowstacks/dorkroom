// The widget function runs as a STRING in an isolated runtime, so a reference to
// anything outside it only fails on a device. This compiles the real file with
// the app's Babel pipeline (the `'widget'` directive becomes a string), then
// evaluates that string with ONLY the runtime's own globals reachable and
// renders it, so a module-scope reference throws here instead.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type TransformCaller, transformFileSync } from '@babel/core';
import type { LiveActivityEnvironment } from 'expo-widgets';
import { describe, expect, it } from 'vitest';
import { createTimerState, timerReducer } from './engine';
import {
  buildActivityProps,
  type TimerActivityProps,
} from './live-activity-props';
import type { TimerAction, TimerStage, TimerState } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const WIDGET_FILE = join(here, 'live-activity-widget.tsx');
const MOBILE_ROOT = join(here, '..', '..', '..');

/** Globals the isolated runtime provides (swift-ui components, modifiers, JSX). */
const COMPONENTS = [
  'Button',
  'HStack',
  'Image',
  'ProgressView',
  'Spacer',
  'Text',
  'VStack',
] as const;
const MODIFIERS = [
  'accessibilityLabel',
  'activityBackgroundTint',
  'buttonStyle',
  'font',
  'foregroundStyle',
  'frame',
  'labelsHidden',
  'lineLimit',
  'monospacedDigit',
  'padding',
  'progressViewStyle',
  'tint',
  'truncationMode',
] as const;
const JS_BUILTINS = [
  ['Math', Math],
  ['Date', Date],
  ['Number', Number],
  ['String', String],
  ['Array', Array],
  ['Object', Object],
] as const;

/** The element tree the widget returns, as the JSX stand-in builds it. */
interface ModifierStub {
  modifier: string;
  args: Arg[];
}
interface ElementProps {
  modifiers?: ModifierStub[];
  alignment?: string;
  children?: Node;
  target?: string;
  timerInterval?: { lower: Date; upper: Date };
  countsDown?: boolean;
}
interface El {
  type: string;
  props: ElementProps;
}
type Node = El | string | null | Node[];

interface Layout {
  banner: Node;
  compactLeading: Node;
  compactTrailing: Node;
  minimal: Node;
  expandedLeading: Node;
  expandedTrailing: Node;
  expandedBottom: Node;
}

type Arg = object | string | number | null;
type RuntimeGlobal = string | object | ((...args: Arg[]) => object);

// babel-preset-expo reads `platform` and `bundler` off the caller, like Metro sets.
const METRO_CALLER: TransformCaller & { platform: string; bundler: string } = {
  name: 'metro',
  platform: 'ios',
  bundler: 'metro',
};

interface CompiledModule {
  timerLiveActivity?: string;
}

function compileWidget(): string {
  const result = transformFileSync(WIDGET_FILE, {
    cwd: MOBILE_ROOT,
    filename: WIDGET_FILE,
    caller: METRO_CALLER,
  });
  const code = result?.code;
  if (!code) throw new Error('widget did not compile');
  const exported: CompiledModule = {};
  new Function('exports', 'require', code)(exported, () => ({}));
  if (!exported.timerLiveActivity) {
    throw new Error('the widget directive did not produce a function string');
  }
  return exported.timerLiveActivity;
}

function evaluateWidget(
  source: string
): (props: TimerActivityProps, env: LiveActivityEnvironment) => Layout {
  const jsx = (type: string, props: ElementProps): El => ({ type, props });
  const allowed = new Map<string, RuntimeGlobal>([
    ['_jsx', jsx],
    ['_jsxs', jsx],
    ['_jsxDEV', jsx],
    ...COMPONENTS.map((name): [string, RuntimeGlobal] => [name, name]),
    ...MODIFIERS.map((name): [string, RuntimeGlobal] => [
      name,
      (...args: Arg[]) => ({ modifier: name, args }),
    ]),
    ...JS_BUILTINS.map(([name, value]): [string, RuntimeGlobal] => [
      name,
      value,
    ]),
  ]);
  const scope = new Proxy(
    {},
    {
      has: () => true,
      get(_target, key) {
        const found = allowed.get(String(key));
        if (found !== undefined) return found;
        if (key === Symbol.unscopables) return undefined;
        throw new ReferenceError(
          `${String(key)} is not available in the widget runtime`
        );
      },
    }
  );
  const make = new Function('scope', `with (scope) { return (${source}); }`);
  return make(scope);
}

function* walk(node: Node): Generator<El> {
  if (node instanceof Array) {
    for (const child of node) yield* walk(child);
  } else if (node instanceof Object) {
    yield node;
    yield* walk(node.props.children ?? null);
  }
}

function strings(node: Node): string[] {
  if (node === null) return [];
  if (node instanceof Array) return node.flatMap(strings);
  if (node instanceof Object) return [];
  return [node];
}

const textOf = (node: Node): string[] =>
  [...walk(node)]
    .filter((el) => el.type === 'Text')
    .flatMap((el) => strings(el.props.children ?? null));

const stage = (id: string, durationSeconds: number): TimerStage => ({
  id,
  kind: 'custom',
  name: id,
  durationSeconds,
  temperatureF: null,
  agitation: null,
  agitationPattern: null,
});
const NOW = 1_800_000_000_000;
const START: TimerAction = { type: 'START' };
const run = (...actions: TimerAction[]): TimerState =>
  [START, ...actions].reduce(
    timerReducer,
    createTimerState([
      stage('Develop', 420),
      stage('Stop', 60),
      stage('Fix', 300),
    ])
  );
const propsFor = (timer: TimerState): TimerActivityProps => {
  const props = buildActivityProps({
    timer,
    asOfMs: NOW,
    runId: 'r',
    title: 'Tri-X',
    safelight: false,
    controls: true,
  });
  if (!props) throw new Error('no props');
  return props;
};
const ENV: LiveActivityEnvironment = { colorScheme: 'dark' };

describe('timer live activity widget', () => {
  const source = compileWidget();
  const render = evaluateWidget(source);

  it('is compiled to a string that touches nothing outside itself', () => {
    expect(source.startsWith('function')).toBe(true);
    // Rendering would throw a ReferenceError on any module-scope name.
    expect(() => render(propsFor(run()), ENV)).not.toThrow();
    expect(() =>
      render(propsFor(timerReducer(run(), { type: 'PAUSE' })), {
        ...ENV,
        isLuminanceReduced: true,
        isStale: true,
      })
    ).not.toThrow();
  });

  it('the harness itself rejects a name from module scope', () => {
    const leaky = evaluateWidget(
      'function(props){return {banner: helper(props)}}'
    );
    expect(() => leaky(propsFor(run()), ENV)).toThrow(ReferenceError);
  });

  it('only names runtime globals that really exist in @expo/ui', () => {
    const build = join(
      MOBILE_ROOT,
      '..',
      '..',
      'node_modules/@expo/ui/build/swift-ui'
    );
    const modifiersDir = join(build, 'modifiers');
    const modifierTypes = readdirSync(modifiersDir)
      .filter((f) => f.endsWith('.d.ts'))
      .map((f) => readFileSync(join(modifiersDir, f), 'utf8'))
      .join('\n');
    for (const name of MODIFIERS) {
      expect(modifierTypes, name).toMatch(new RegExp(`\\b${name}\\b`));
    }
    for (const name of COMPONENTS) {
      expect(
        readFileSync(join(build, name, 'index.d.ts'), 'utf8'),
        name
      ).toMatch(new RegExp(`function ${name}\\b`));
    }
  });

  it('counts every stage down with system interval text while running', () => {
    const props = propsFor(run());
    const layout = render(props, ENV);
    const texts = [...walk(layout.banner)].filter(
      (el) => el.type === 'Text' && el.props.timerInterval
    );
    // the total plus one per row
    expect(texts).toHaveLength(1 + props.rows.length);
    expect(texts[0].props.timerInterval?.upper.getTime()).toBe(props.endMs);
    const bars = [...walk(layout.banner)].filter(
      (el) => el.type === 'ProgressView' && el.props.timerInterval
    );
    expect(bars).toHaveLength(props.rows.length);
    expect(textOf(layout.banner)).toEqual(
      expect.arrayContaining(['Tri-X', 'Develop', 'Stop', 'Fix'])
    );
  });

  it('counts the whole run down in the compact island, not one stage', () => {
    const props = propsFor(run({ type: 'NEXT_STAGE' }));
    const layout = render(props, ENV);
    const [el] = [...walk(layout.compactTrailing)];
    expect(el.props.timerInterval?.upper.getTime()).toBe(props.endMs);
    expect(el.props.timerInterval?.lower.getTime()).toBe(props.startMs);
    expect(el.props.countsDown).toBe(true);
  });

  it('draws Pause and Skip when running, and Resume when paused', () => {
    const targets = (timer: TimerState) =>
      [...walk(render(propsFor(timer), ENV).banner)]
        .filter((el) => el.type === 'Button')
        .map((el) => el.props.target);
    expect(targets(run())).toEqual(['pause', 'skip']);
    expect(targets(timerReducer(run(), { type: 'PAUSE' }))).toEqual([
      'resume',
      'skip',
    ]);
  });

  it('shows frozen numbers and no system timers while paused', () => {
    const paused = timerReducer(
      { ...run(), remainingSeconds: 252 },
      { type: 'PAUSE' }
    );
    const layout = render(propsFor(paused), ENV);
    const all = [...walk(layout.banner)];
    expect(all.some((el) => el.props.timerInterval)).toBe(false);
    expect(textOf(layout.banner)).toEqual(
      expect.arrayContaining(['Paused', '4:12', '10:12'])
    );
  });

  it('reads Done with no buttons once completed, or once the system marks it stale', () => {
    const finished = run(
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' }
    );
    const done = render(propsFor(finished), ENV);
    expect(textOf(done.banner)).toContain('Done');
    expect([...walk(done.banner)].some((el) => el.type === 'Button')).toBe(
      false
    );

    const stale = render(propsFor(run()), { ...ENV, isStale: true });
    expect(textOf(stale.banner)).toContain('Done');
    expect([...walk(stale.banner)].some((el) => el.type === 'Button')).toBe(
      false
    );
  });

  it('says "+N more" with its own countdown over the hidden stages', () => {
    const many = ['Soak', 'Develop', 'Stop', 'Fix', 'Wash', 'Flo'].map((id) =>
      stage(id, 60)
    );
    const timer = [START].reduce(timerReducer, createTimerState(many));
    const props = propsFor(timer);
    const layout = render(props, ENV);
    const more = [...walk(layout.banner)].filter(
      (el) =>
        el.type === 'Text' &&
        strings(el.props.children ?? null).some((t) => t.includes('more'))
    );
    expect(textOf(layout.banner)).toContain('+3 more');
    expect(more).toHaveLength(1);
    // the countdown beside it runs from the last visible row's end to the run's end
    const timers = [...walk(layout.banner)].filter(
      (el) => el.type === 'Text' && el.props.timerInterval
    );
    const hiddenSpan = timers[timers.length - 1].props.timerInterval;
    expect(hiddenSpan?.lower.getTime()).toBe(props.rows[2].endMs);
    expect(hiddenSpan?.upper.getTime()).toBe(props.endMs);
  });

  it('puts the agitation note under its stage row, and claims no current stage', () => {
    const withNote = buildActivityProps({
      timer: run(),
      asOfMs: NOW,
      runId: 'r',
      title: 'Tri-X',
      safelight: false,
      controls: true,
    });
    if (!withNote) throw new Error('no props');
    const noted: TimerActivityProps = {
      ...withNote,
      note: 'Agitate: 10s every minute',
    };
    const layout = render(noted, ENV);
    // the first row is a VStack whose children include the note
    const firstRow = [...walk(layout.banner)].find(
      (el) =>
        el.type === 'VStack' &&
        el.props.alignment === 'leading' &&
        textOf(el).includes('Develop')
    );
    expect(textOf(firstRow ?? null)).toContain('Agitate: 10s every minute');
    // the island never says "Now" or names a stage in its leading region
    const leading = textOf(layout.expandedLeading);
    expect(leading).not.toContain('Now');
    expect(leading).toContain('Tri-X');
    expect(leading).not.toContain('Develop');
  });

  it('keeps every text on one line, in every state and region', () => {
    const finished = run(
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' },
      { type: 'NEXT_STAGE' }
    );
    const states: Array<[string, TimerActivityProps, LiveActivityEnvironment]> =
      [
        ['running', propsFor(run()), ENV],
        ['paused', propsFor(timerReducer(run(), { type: 'PAUSE' })), ENV],
        ['done', propsFor(finished), ENV],
        ['stale', propsFor(run()), { ...ENV, isStale: true }],
      ];
    for (const [name, props, env] of states) {
      const layout = render(
        { ...props, note: 'Agitate: 10s every minute' },
        env
      );
      const regions = [
        layout.banner,
        layout.compactTrailing,
        layout.expandedLeading,
        layout.expandedTrailing,
        layout.expandedBottom,
      ];
      for (const region of regions) {
        for (const el of walk(region)) {
          if (el.type !== 'Text') continue;
          const names = (el.props.modifiers ?? []).map((m) => m.modifier);
          const label = `${name}: ${strings(el.props.children ?? null).join() || 'timer'}`;
          expect(names, label).toContain('lineLimit');
          // text that can be long also gets the tail ellipsis
          if (
            strings(el.props.children ?? null).some((t) =>
              /[A-Za-z]{4,}/.test(t)
            )
          ) {
            expect(names, label).toContain('truncationMode');
          }
        }
      }
    }
  });

  it('shows at most two rows in the island bottom, with the buttons elsewhere', () => {
    const layout = render(propsFor(run()), ENV);
    const rows = [...walk(layout.expandedBottom)].filter(
      (el) => el.type === 'ProgressView'
    );
    expect(rows).toHaveLength(2);
    expect(
      [...walk(layout.expandedBottom)].some((el) => el.type === 'Button')
    ).toBe(false);
    const buttons = [...walk(layout.expandedTrailing)].filter(
      (el) => el.type === 'Button'
    );
    expect(buttons.map((b) => b.props.target)).toEqual(['pause', 'skip']);
  });

  it('labels the buttons for VoiceOver', () => {
    const labels = (timer: TimerState) =>
      [...walk(render(propsFor(timer), ENV).banner)]
        .filter((el) => el.type === 'Button')
        .map(
          (el) =>
            (el.props.modifiers ?? []).find(
              (m) => m.modifier === 'accessibilityLabel'
            )?.args[0]
        );
    expect(labels(run())).toEqual(['Pause', 'Skip stage']);
    expect(labels(timerReducer(run(), { type: 'PAUSE' }))).toEqual([
      'Resume',
      'Skip stage',
    ]);
  });

  it('a paused run never reads Done, even when the system marks it stale', () => {
    const paused = timerReducer(run(), { type: 'PAUSE' });
    const layout = render(propsFor(paused), { ...ENV, isStale: true });
    expect(textOf(layout.banner)).not.toContain('Done');
    expect([...walk(layout.banner)].some((el) => el.type === 'Button')).toBe(
      true
    );
  });

  it('keeps every layout region the island needs', () => {
    const layout = render(propsFor(run()), ENV);
    const regions = [
      layout.banner,
      layout.compactLeading,
      layout.compactTrailing,
      layout.minimal,
      layout.expandedLeading,
      layout.expandedTrailing,
      layout.expandedBottom,
    ];
    expect(regions.every((region) => region)).toBe(true);
  });
});
