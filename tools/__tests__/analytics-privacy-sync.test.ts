import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the promise the privacy policy makes.
 *
 * Analytics events are declared in one place, but they are *described* in two
 * others: the published `/privacy` page and `PRIVACY.md`. A policy that lists
 * fewer events than the app actually sends is worse than no policy at all, and
 * nothing about adding an event to `tracked-events.ts` forces either document to keep
 * up. This test is that force.
 *
 * It reads all three files as text rather than importing them. The documents
 * are not code, and the parse has to see exactly what a reader would.
 *
 * Every parser below is strict: anything in the region it reads that it cannot
 * account for throws, rather than being skipped. A parser that silently skips a
 * line it does not understand is how an event ships undocumented, since the
 * comparison then runs against a list that is missing exactly that event.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..');

const EVENTS_TS = join(
  REPO_ROOT,
  'apps/dorkroom/src/app/lib/analytics/tracked-events.ts'
);
const PRIVACY_MD = join(REPO_ROOT, 'PRIVACY.md');
const PRIVACY_PAGE = join(
  REPO_ROOT,
  'apps/dorkroom/src/app/pages/privacy-page.tsx'
);

const read = (path: string): string => readFileSync(path, 'utf8');

const INTERFACE_HEAD = 'export interface AnalyticsEvents {';

/** A property key: a bare identifier, or a single- or double-quoted string. */
const MEMBER =
  /^(?:([A-Za-z_$][\w$]*)|'([^'\n]+)'|"([^"\n]+)")\??\s*:([\s\S]+)$/;

/** Index of the `}` that closes the `{` at `open`. */
function matchingBrace(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(
    'Unbalanced braces after `export interface AnalyticsEvents`.'
  );
}

/**
 * How a character changes bracket depth. The `>` of an arrow (`=>`) closes
 * nothing, so a function-typed property does not unbalance the count.
 */
function nesting(char: string, previous: string | undefined): number {
  if ('{([<'.includes(char)) return 1;
  if (char === '>' && previous === '=') return 0;
  if ('})]>'.includes(char)) return -1;
  return 0;
}

/**
 * Split an interface body into its members at top-level `;`, after removing
 * comments. Nested `{}`, `()`, `[]` and `<>` are kept intact, so a property
 * bag that the formatter wraps over several lines is still one member.
 */
function interfaceMembers(body: string): string[] {
  const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const members: string[] = [];
  let depth = 0;
  let current = '';
  for (const [i, char] of [...code].entries()) {
    depth += nesting(char, code[i - 1]);
    if (char === ';' && depth === 0) {
      members.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim() !== '') {
    throw new Error(
      'tracked-events.ts: AnalyticsEvents member is not terminated by `;`. ' +
        'Note that `//` inside a string literal type is unsupported: comments ' +
        'are stripped before parsing, so it cuts the member short.\n  ' +
        current.trim()
    );
  }
  return members.filter((member) => member !== '');
}

/** The value part of a member must not hide a second `key:` at top level. */
function hasTopLevelColon(value: string): boolean {
  let depth = 0;
  for (const [i, char] of [...value].entries()) {
    depth += nesting(char, value[i - 1]);
    if (char === ':' && depth === 0) return true;
  }
  return false;
}

/**
 * Event names declared in the `AnalyticsEvents` interface, which is the single
 * source of truth for what the app can send.
 *
 * This accepts the property members TypeScript would: inline property bags,
 * named types (`new_event: NewEventProps;`) and quoted keys
 * (`'some-event': {...}`). Anything else in the body throws.
 */
function parseDeclaredEvents(source: string): string[] {
  const start = source.indexOf(INTERFACE_HEAD);
  if (start === -1) {
    throw new Error(
      'Could not find `export interface AnalyticsEvents` in tracked-events.ts. If the ' +
        'catalog was renamed or restructured, update this test to match.'
    );
  }
  const open = start + INTERFACE_HEAD.length - 1;
  const body = source.slice(open + 1, matchingBrace(source, open));

  return interfaceMembers(body).map((member) => {
    const match = MEMBER.exec(member);
    if (!match || hasTopLevelColon(match[4])) {
      throw new Error(
        'tracked-events.ts: cannot parse this AnalyticsEvents member, so it ' +
          'cannot be checked against the privacy policy. Declare events as ' +
          `\`name: { ... };\`, or teach this parser the new form:\n  ${member}`
      );
    }
    return match[1] ?? match[2] ?? match[3];
  });
}

/**
 * Event names listed in the PRIVACY.md events table, read from its first
 * column. Every row between the `| Event |` header and the end of the table
 * must name exactly one event in backticks.
 */
function parseMarkdownEvents(markdown: string): string[] {
  const lines = markdown.split('\n');
  const header = lines.findIndex((line) => /^\|\s*Event\s*\|/.test(line));
  if (header === -1) {
    throw new Error(
      'Could not find the `| Event |` table in PRIVACY.md. If the table was ' +
        'restructured, update this test to match.'
    );
  }
  if (!/^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[header + 1] ?? '')) {
    throw new Error(
      'PRIVACY.md: the events table header has no `| --- |` row.'
    );
  }

  const names: string[] = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const match = /^\|\s*`([^`\n]+)`\s*\|/.exec(line);
    if (!match) {
      throw new Error(
        'PRIVACY.md: an events table row does not start with a single ' +
          `backticked event name:\n  ${line}`
      );
    }
    names.push(match[1]);
  }
  return names;
}

/**
 * Event names listed in the `/privacy` page's TRACKED_EVENTS array. Every
 * `name` property in the array must be a plain string literal.
 */
function parsePageEvents(source: string): string[] {
  const head = source.indexOf('const TRACKED_EVENTS');
  if (head === -1) {
    throw new Error(
      'Could not find `const TRACKED_EVENTS` in privacy-page.tsx. If the table ' +
        'was renamed or restructured, update this test to match.'
    );
  }
  const open = source.indexOf('= [', head);
  const close = source.indexOf('\n];', open);
  if (open === -1 || close === -1) {
    throw new Error(
      'privacy-page.tsx: TRACKED_EVENTS is not a `= [ ... ];` array.'
    );
  }

  const array = source.slice(open + '= ['.length, close);
  const names: string[] = [];
  for (const line of array.split('\n')) {
    if (!/(?:^|[\s{,])['"]?name['"]?\s*:/.test(line)) continue;
    const match = /^\s*name: (?:'([^'\n]+)'|"([^"\n]+)"),$/.exec(line);
    if (!match) {
      throw new Error(
        'privacy-page.tsx: a TRACKED_EVENTS `name` is not a plain string ' +
          `literal on its own line:\n  ${line}`
      );
    }
    names.push(match[1] ?? match[2]);
  }

  // Every entry has to have contributed a name, or an entry whose `name` this
  // parser skipped would vanish from the comparison.
  let depth = 0;
  let entries = 0;
  for (const char of array) {
    if (char === '{' && depth++ === 0) entries += 1;
    else if (char === '}') depth -= 1;
  }
  if (entries !== names.length) {
    throw new Error(
      `privacy-page.tsx: TRACKED_EVENTS has ${entries} entries but only ` +
        `${names.length} parseable names.`
    );
  }
  return names;
}

const sorted = (names: string[]): string[] => [...names].sort();

describe('analytics events stay in sync with the privacy policy', () => {
  const declared = parseDeclaredEvents(read(EVENTS_TS));
  const markdown = parseMarkdownEvents(read(PRIVACY_MD));
  const page = parsePageEvents(read(PRIVACY_PAGE));

  /**
   * Without this, a regex that silently stops matching would make every
   * comparison below compare two empty arrays and pass. The guard has to fail
   * loudly when it can no longer see what it is guarding.
   */
  it('parses a plausible number of events out of each source', () => {
    expect(declared.length).toBeGreaterThan(5);
    expect(markdown.length).toBeGreaterThan(5);
    expect(page.length).toBeGreaterThan(5);
  });

  it('documents every declared event in PRIVACY.md', () => {
    expect(
      sorted(markdown),
      'PRIVACY.md does not match tracked-events.ts. Every event the app can send must ' +
        'be listed there before it ships.'
    ).toEqual(sorted(declared));
  });

  it('documents every declared event on the /privacy page', () => {
    expect(
      sorted(page),
      'privacy-page.tsx does not match tracked-events.ts. The published page is what ' +
        'visitors actually read, so it must list every event.'
    ).toEqual(sorted(declared));
  });
});

/**
 * The parsers above are the whole guard, so they are tested against the
 * shapes that used to slip past them: a named property type and a quoted key
 * in the interface, and a quoted or hyphenated name in either document.
 */
describe('privacy-sync parsers', () => {
  const catalog = (members: string) =>
    `export interface AnalyticsEvents {\n${members}\n}\n`;

  it('reads inline, named-type and quoted-key events from the interface', () => {
    expect(
      parseDeclaredEvents(
        catalog(
          [
            '  /** A doc comment with a colon: and braces {}. */',
            '  share: { tool: ShareTool; method: ShareMethod };',
            '  new_event: NewEventProps;',
            "  'some-event': { ok: boolean };",
            '  "other-event"?: { ok: boolean };',
            '  wrapped: {',
            "    action: 'created' | 'updated';",
            '  };',
            '  // a line comment',
          ].join('\n')
        )
      )
    ).toEqual(['share', 'new_event', 'some-event', 'other-event', 'wrapped']);
  });

  it.each([
    ['an index signature', '  [name: string]: { ok: boolean };'],
    ['a method', '  share(tool: ShareTool): void;'],
    ['a member missing its `;`', '  share: { ok: boolean }'],
    ['two members run together', '  share: { ok: boolean }\n  other: Props;'],
    ['a key with a space', '  some event: { ok: boolean };'],
    ['a stray token', '  share: { ok: boolean };\n  oops;'],
  ])('throws on %s rather than skipping it', (_, members) => {
    expect(() => parseDeclaredEvents(catalog(members))).toThrow();
  });

  it('throws when the interface is missing', () => {
    expect(() =>
      parseDeclaredEvents('export type AnalyticsEvents = {};')
    ).toThrow(/Could not find/);
  });

  const table = (rows: string[]) =>
    [
      '| Event | When | What |',
      '| --- | --- | --- |',
      ...rows,
      '',
      'After.',
    ].join('\n');

  it('reads every row of the PRIVACY.md table, quoted or hyphenated', () => {
    expect(
      parseMarkdownEvents(
        table(['| `share` | a | b |', '| `some-event` | a | b |'])
      )
    ).toEqual(['share', 'some-event']);
  });

  it.each([
    ['an unquoted name', '| share | a | b |'],
    ['a single-quoted name', "| 'share' | a | b |"],
    ['an empty first cell', '| | a | b |'],
  ])('throws on a PRIVACY.md row with %s', (_, row) => {
    expect(() => parseMarkdownEvents(table(['| `ok` | a | b |', row]))).toThrow(
      /events table row/
    );
  });

  const page = (entries: string[]) =>
    [
      'const TRACKED_EVENTS: TrackedEvent[] = [',
      ...entries.map((entry) => `  {\n    ${entry}\n    when: 'x',\n  },`),
      '];',
    ].join('\n');

  it('throws on a page entry with no name at all', () => {
    expect(() => parsePageEvents(page(["title: 'share',"]))).toThrow(
      /1 entries but only 0/
    );
  });

  it('reads single- and double-quoted names from the page', () => {
    expect(
      parsePageEvents(page(["name: 'share',", 'name: "some-event",']))
    ).toEqual(['share', 'some-event']);
  });

  it.each([
    ['a template literal', 'name: `share`,'],
    ['a variable', 'name: SHARE,'],
    ['a name sharing its line', "name: 'share', when: 'x',"],
    ['a quoted key', "'name': 'share',"],
  ])('throws on a page entry whose name is %s', (_, entry) => {
    expect(() => parsePageEvents(page([entry]))).toThrow(/plain string/);
  });
});
