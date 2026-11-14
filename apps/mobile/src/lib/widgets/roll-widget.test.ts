// The roll widget's layout, compiled and rendered as the extension would, with
// only the runtime's globals reachable (see src/test/widget-runtime.ts).
import { join } from 'node:path';
import type { WidgetFamily } from 'expo-widgets';
import { describe, expect, it } from 'vitest';
import type { FilmRoll } from '@/schemas/film-log.schema';
import {
  compileWidgetExport,
  envFor,
  evaluateWidget,
  layoutProblems,
  missingFromExpoUi,
  textOf,
} from '@/test/widget-runtime';
import {
  buildRollWidgetProps,
  type RollWidgetProps,
} from './roll-widget-props';

const COMPONENTS = ['HStack', 'Image', 'Spacer', 'Text', 'VStack'] as const;
const MODIFIERS = [
  'containerBackground',
  'font',
  'foregroundStyle',
  'frame',
  'lineLimit',
  'minimumScaleFactor',
  'monospacedDigit',
  'truncationMode',
  'widgetURL',
] as const;
const FAMILIES: WidgetFamily[] = [
  'systemSmall',
  'accessoryRectangular',
  'accessoryInline',
];

const roll = (over: Partial<FilmRoll>): FilmRoll => ({
  id: 'r1',
  cameraId: 'cam1',
  process: 'bw',
  status: 'active',
  shots: [],
  startedAt: '',
  createdAt: '',
  updatedAt: '',
  ...over,
});
const propsFor = (rolls: FilmRoll[]): RollWidgetProps =>
  buildRollWidgetProps({
    rolls,
    cameras: [{ id: 'cam1', name: 'Nikon FM2', format: '35mm', createdAt: '' }],
    meterRollId: undefined,
  });

const shots = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    frameNumber: i + 1,
    source: 'manual' as const,
  }));

const STATES: Array<[string, RollWidgetProps]> = [
  ['empty', propsFor([])],
  [
    'normal',
    propsFor([
      roll({
        name: 'Custom Second Pan',
        iso: 800,
        pushPull: 1,
        shots: shots(23),
      }),
    ]),
  ],
  [
    'one frame',
    propsFor([roll({ filmStockName: 'Ilford HP5 Plus', shots: shots(1) })]),
  ],
  [
    'long text',
    propsFor([
      roll({
        name: 'A very long roll name that will never fit a small widget at all',
        iso: 3200,
        pushPull: -0.5,
        cameraId: 'cam1',
      }),
    ]),
  ],
];

describe('roll widget layout', () => {
  const source = compileWidgetExport(
    join(__dirname, 'roll-widget.tsx'),
    'rollWidget'
  );
  const render = evaluateWidget<RollWidgetProps>(source, COMPONENTS, MODIFIERS);

  it('is a function string that names nothing outside itself', () => {
    expect(source.startsWith('function')).toBe(true);
    const leaky = evaluateWidget<RollWidgetProps>(
      'function(props){return helper(props)}',
      COMPONENTS,
      MODIFIERS
    );
    expect(() => leaky(propsFor([]), envFor('systemSmall'))).toThrow(
      ReferenceError
    );
  });

  it('only names runtime globals that exist in the installed @expo/ui', () => {
    expect(missingFromExpoUi(COMPONENTS, MODIFIERS)).toEqual([]);
  });

  it('renders every family in every state with one link and one-line text', () => {
    for (const family of FAMILIES) {
      for (const [state, props] of STATES) {
        const node = render(props, envFor(family));
        expect(
          layoutProblems(node, props.url, ['No roll in the camera']),
          `${family} ${state}`
        ).toEqual([]);
      }
    }
  });

  it('shows the label, EI, camera and frames shot', () => {
    const props = STATES[1][1];
    const small = textOf(render(props, envFor('systemSmall')));
    expect(small).toEqual(
      expect.arrayContaining([
        'Custom Second Pan',
        'EI 800 · Push +1',
        'Nikon FM2',
        '23',
        'frames shot',
      ])
    );
    const rect = textOf(render(props, envFor('accessoryRectangular')));
    expect(rect).toEqual([
      'Custom Second Pan',
      '23 frames',
      'EI 800 · Push +1 · Nikon FM2',
    ]);
    const inline = textOf(render(props, envFor('accessoryInline')));
    expect(inline).toEqual(['Custom Second Pan · 23 frames']);
    expect(textOf(render(STATES[2][1], envFor('systemSmall')))).toContain(
      'frame shot'
    );
  });

  it('says there is no roll in the camera, in every family', () => {
    for (const family of FAMILIES) {
      expect(textOf(render(STATES[0][1], envFor(family))), family).toContain(
        'No roll in the camera'
      );
    }
  });

  it('draws in the palette passed in, never a colour of its own', () => {
    const props = STATES[1][1];
    const node = render(props, envFor('systemSmall'));
    const colours = JSON.stringify(node).match(/#[0-9a-fA-F]{6}/g) ?? [];
    const palette = Object.values(props.palette);
    expect(colours.every((c) => palette.includes(c))).toBe(true);
  });
});
