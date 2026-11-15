// Every link a widget can open (its `widgetURL`) must reach a real screen
// through the same path an incoming URL takes (`redirectSystemPath`), cold and
// warm, like the Control Center controls' links in tool-manifest.test.ts.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { takePendingLink } from '@/lib/link-handoff';
import { TIMER_WIDGET_URL } from '@/lib/timer/widget-timeline';
import { MOBILE_ROOT } from '@/test/widget-runtime';
import { redirectSystemPath } from '../../../app/+native-intent';
import { LAST_RESULT_URL } from './last-result-widget-props';
import { FILM_LOG_URL, rollUrl } from './roll-widget-props';

const TABS = join(MOBILE_ROOT, 'app', '(tabs)');

describe('widget links', () => {
  const cases: Array<[string, string, string]> = [
    // url, expected path, route file that serves it
    [
      rollUrl('r1'),
      '/shoot/film-log/roll/r1',
      'shoot/film-log/roll/[rollId].tsx',
    ],
    [FILM_LOG_URL, '/shoot/film-log', 'shoot/film-log/index.tsx'],
    [LAST_RESULT_URL, '/shoot', 'shoot/index.tsx'],
    [TIMER_WIDGET_URL, '/develop/recipes/timer', 'develop/recipes/timer.tsx'],
  ];

  it('each serves a route file', () => {
    for (const [, , file] of cases) {
      expect(existsSync(join(TABS, file)), file).toBe(true);
    }
  });

  it('each reaches its screen cold, and through the hub handoff warm', () => {
    for (const [url, path] of cases) {
      const cold = redirectSystemPath({ path: url, initial: true }).replace(
        /^dorkroom:\//,
        ''
      );
      expect(cold, url).toBe(path);
      const warm = redirectSystemPath({ path: url, initial: false });
      const hub = `/${path.split('/')[1]}`;
      if (path === hub) {
        // the hub itself has nothing to hand off
        expect(warm.replace(/^dorkroom:\//, ''), url).toBe(hub);
      } else {
        expect(warm, url).toBe(hub);
        expect(takePendingLink(), url).toBe(path);
      }
    }
  });
});
