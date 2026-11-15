// app.json's `expo-widgets` entry declares the widgets the extension builds
// (one Swift `StaticConfiguration` each, generated at prebuild). The names are
// the keys the app pushes to, so they must match the code exactly.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TIMER_WIDGET_NAME } from '@/lib/timer/widget-timeline';
import { recordsLastResult, TOOLS } from '@/lib/tools';
import { MOBILE_ROOT } from '@/test/widget-runtime';
import { LAST_RESULT_WIDGET_NAME } from './last-result-widget-props';
import { ROLL_WIDGET_NAME } from './roll-widget-props';

interface WidgetEntry {
  name: string;
  displayName: string;
  description: string;
  ios: { supportedFamilies: string[] };
}
type Plugin = string | [string, { widgets?: WidgetEntry[] }];

const config: { expo: { plugins: Plugin[] } } = JSON.parse(
  readFileSync(join(MOBILE_ROOT, 'app.json'), 'utf8')
);
const entry = config.expo.plugins.find(
  (p): p is [string, { widgets?: WidgetEntry[] }] =>
    Array.isArray(p) && p[0] === 'expo-widgets'
);
const widgets = entry?.[1].widgets ?? [];

describe('app.json widgets', () => {
  it('declares the three widgets under the names the app pushes to', () => {
    expect(widgets.map((w) => w.name)).toEqual([
      ROLL_WIDGET_NAME,
      LAST_RESULT_WIDGET_NAME,
      TIMER_WIDGET_NAME,
    ]);
  });

  it('gives each the families its layout draws', () => {
    expect(
      Object.fromEntries(widgets.map((w) => [w.name, w.ios.supportedFamilies]))
    ).toEqual({
      [ROLL_WIDGET_NAME]: [
        'systemSmall',
        'accessoryRectangular',
        'accessoryInline',
      ],
      [LAST_RESULT_WIDGET_NAME]: ['systemSmall', 'accessoryRectangular'],
      [TIMER_WIDGET_NAME]: [
        'systemSmall',
        'systemMedium',
        'accessoryRectangular',
      ],
    });
  });

  it('names no Swift type the extension already has', () => {
    // The plugin generates `struct <name>: Widget`; these exist already.
    const taken = [
      'WidgetLiveActivity',
      'DorkroomControlsBundle',
      'SafelightControl',
      'StartLastTimerControl',
      'LogFrameControl',
      'OpenMeterControl',
    ];
    for (const w of widgets) {
      expect(taken).not.toContain(w.name);
      expect(w.name).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
    }
  });

  it('describes what each shows, naming the tools the last answers come from', () => {
    for (const w of widgets) {
      expect(w.displayName.length, w.name).toBeGreaterThan(0);
      expect(w.description.length, w.name).toBeGreaterThan(20);
    }
    const lastAnswers = widgets.find((w) => w.name === LAST_RESULT_WIDGET_NAME);
    for (const tool of TOOLS.filter((t) => recordsLastResult(t.id))) {
      expect(lastAnswers?.description).toContain(tool.label);
    }
  });
});
