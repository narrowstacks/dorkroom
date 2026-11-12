import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// NativeWind's interop (react-native-css-interop) spreads the `style` prop as an
// object, so a Pressable style CALLBACK becomes `{}` and is never called: the
// fill, the width or the pressed state silently vanishes. Use a plain style
// object and an `active:` class for pressed feedback.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * A `style=` prop whose value is a function: an arrow with any parameter list
 * (bare, destructured, typed) or a `function` expression. The destructure of
 * Pressable's `pressed` is caught on its own too.
 */
const STYLE_CALLBACK = [
  /style=\{\s*(async\s*)?\([^()]*\)\s*(:[^=]*)?=>/, // style={(...) => ...}, params typed or not
  /style=\{\s*(async\s*)?\w+\s*=>/, // style={state => ...}
  /style=\{\s*(async\s+)?function\b/, // style={function (...) {...}}
  /style=\{\s*\(?\s*\{\s*pressed\b/, // style={({ pressed ...
];

export function usesStyleCallback(source: string): boolean {
  return STYLE_CALLBACK.some((pattern) => pattern.test(source));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(entry.name) ? [path] : [];
  });
}

describe('the guard itself', () => {
  const caught = [
    'style={({ pressed }) => [a, pressed && b]}',
    'style={({ pressed }: PressableStateCallbackType) => a}',
    'style={(state: PressableStateCallbackType) => a}',
    'style={(state) => a}',
    'style={() => a}',
    'style={state => a}',
    'style={function (state) { return a; }}',
    'style={\n  ({ pressed }) => a\n}',
    'style={{ pressed }}', // a `{ pressed` destructure-shaped value is flagged too
  ];
  const allowed = [
    'style={styles.ring}',
    'style={{ width }}',
    'style={[a, b && c]}',
    'style={commit.fill}',
    'style={selected ? { color: tint.color } : undefined}',
    'style={(expanded ? a : b)}',
    'style={(a)}',
    'style={rectStyle(geometry.board)}',
  ];

  it.each(caught)('catches %j', (source) => {
    expect(usesStyleCallback(source)).toBe(true);
  });
  it.each(allowed)('allows %j', (source) => {
    expect(usesStyleCallback(source)).toBe(false);
  });
});

describe('style callbacks', () => {
  it('are not used on any component', () => {
    const offenders = ['src', 'app']
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .filter((file) => usesStyleCallback(readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length));
    expect(offenders).toEqual([]);
  });
});
