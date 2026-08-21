import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the promise the privacy policy makes.
 *
 * Analytics events are declared in one place, but they are *described* in two
 * others: the published `/privacy` page and `PRIVACY.md`. A policy that lists
 * fewer events than the app actually sends is worse than no policy at all, and
 * nothing about adding an event to `events.ts` forces either document to keep
 * up. This test is that force.
 *
 * It reads all three files as text rather than importing them. The documents
 * are not code, and the parse has to see exactly what a reader would.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..');

const EVENTS_TS = join(
  REPO_ROOT,
  'apps/dorkroom/src/app/lib/analytics/events.ts'
);
const PRIVACY_MD = join(REPO_ROOT, 'PRIVACY.md');
const PRIVACY_PAGE = join(
  REPO_ROOT,
  'apps/dorkroom/src/app/pages/privacy-page.tsx'
);

const read = (path: string): string => readFileSync(path, 'utf8');

/**
 * Event names declared in the `AnalyticsEvents` interface, which is the single
 * source of truth for what the app can send.
 */
function declaredEvents(): string[] {
  const source = read(EVENTS_TS);
  const start = source.indexOf('export interface AnalyticsEvents {');
  if (start === -1) {
    throw new Error(
      'Could not find `export interface AnalyticsEvents` in events.ts. If the ' +
        'catalog was renamed or restructured, update this test to match.'
    );
  }

  const body = source.slice(start, source.indexOf('\n}', start));
  return [...body.matchAll(/^ {2}(\w+): \{/gm)].map((match) => match[1]);
}

/** Event names listed in the PRIVACY.md table, read from its first column. */
function documentedInMarkdown(): string[] {
  return [...read(PRIVACY_MD).matchAll(/^\| `(\w+)` \|/gm)].map(
    (match) => match[1]
  );
}

/** Event names listed in the `/privacy` page's TRACKED_EVENTS table. */
function documentedOnPage(): string[] {
  return [...read(PRIVACY_PAGE).matchAll(/^\s*name: '(\w+)',$/gm)].map(
    (match) => match[1]
  );
}

const sorted = (names: string[]): string[] => [...names].sort();

describe('analytics events stay in sync with the privacy policy', () => {
  const declared = declaredEvents();

  /**
   * Without this, a regex that silently stops matching would make every
   * comparison below compare two empty arrays and pass. The guard has to fail
   * loudly when it can no longer see what it is guarding.
   */
  it('parses a plausible number of events out of each source', () => {
    expect(declared.length).toBeGreaterThan(5);
    expect(documentedInMarkdown().length).toBeGreaterThan(5);
    expect(documentedOnPage().length).toBeGreaterThan(5);
  });

  it('documents every declared event in PRIVACY.md', () => {
    expect(
      sorted(documentedInMarkdown()),
      'PRIVACY.md does not match events.ts. Every event the app can send must ' +
        'be listed there before it ships.'
    ).toEqual(sorted(declared));
  });

  it('documents every declared event on the /privacy page', () => {
    expect(
      sorted(documentedOnPage()),
      'privacy-page.tsx does not match events.ts. The published page is what ' +
        'visitors actually read, so it must list every event.'
    ).toEqual(sorted(declared));
  });

  it('declares each event exactly once', () => {
    expect(sorted(declared)).toEqual(sorted([...new Set(declared)]));
  });
});
