// The last-answers widget's layout, compiled and rendered as the extension
// would, with only the runtime's globals reachable (src/test/widget-runtime.ts).
import { join } from 'node:path';
import type { WidgetFamily } from 'expo-widgets';
import { describe, expect, it } from 'vitest';
import {
  compileWidgetExport,
  envFor,
  evaluateWidget,
  layoutProblems,
  missingFromExpoUi,
  textOf,
} from '@/test/widget-runtime';
import {
  buildLastResultWidgetProps,
  type LastResultWidgetProps,
} from './last-result-widget-props';

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
const FAMILIES: WidgetFamily[] = ['systemSmall', 'accessoryRectangular'];

const STATES: Array<[string, LastResultWidgetProps]> = [
  ['empty', buildLastResultWidgetProps({})],
  ['one', buildLastResultWidgetProps({ lens: { text: '69mm' } })],
  [
    'normal',
    buildLastResultWidgetProps({
      'camera-exposure': { text: 'EV 7' },
      lens: { text: '69mm' },
    }),
  ],
  [
    'long text',
    buildLastResultWidgetProps({
      'camera-exposure': { text: 'EV 15 at a very long description' },
      lens: { text: '123456789012345678901234567890mm' },
    }),
  ],
];

describe('last answers widget layout', () => {
  const source = compileWidgetExport(
    join(__dirname, 'last-result-widget.tsx'),
    'lastResultWidget'
  );
  const render = evaluateWidget<LastResultWidgetProps>(
    source,
    COMPONENTS,
    MODIFIERS
  );

  it('is a function string that names nothing outside itself', () => {
    expect(source.startsWith('function')).toBe(true);
    expect(() => render(STATES[2][1], envFor('systemSmall'))).not.toThrow();
  });

  it('only names runtime globals that exist in the installed @expo/ui', () => {
    expect(missingFromExpoUi(COMPONENTS, MODIFIERS)).toEqual([]);
  });

  it('renders every family in every state with one link and one-line text', () => {
    for (const family of FAMILIES) {
      for (const [state, props] of STATES) {
        expect(
          layoutProblems(render(props, envFor(family)), props.url, [
            props.emptyHint,
          ]),
          `${family} ${state}`
        ).toEqual([]);
      }
    }
  });

  it('shows each tool with its answer', () => {
    const props = STATES[2][1];
    for (const family of FAMILIES) {
      expect(textOf(render(props, envFor(family))), family).toEqual(
        expect.arrayContaining(['Camera Exposure', 'EV 7', 'Lenses', '69mm'])
      );
    }
  });

  it('says none yet, and which tools fill it, before any answer', () => {
    const props = STATES[0][1];
    expect(textOf(render(props, envFor('systemSmall')))).toEqual(
      expect.arrayContaining(['None yet', props.emptyHint])
    );
    expect(textOf(render(props, envFor('accessoryRectangular')))).toContain(
      'None yet'
    );
  });
});
