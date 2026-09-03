import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The mobile drawer body is painted with var(--color-surface), which is
// #f8f9fa in light and #ffffff in high-contrast. Any raw Tailwind palette
// class in these components paints text and borders that assume a dark
// surface, so they vanish on the light themes. See issue #243.
const PALETTE = [
  'white',
  'black',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
].join('|');

const PREFIX = [
  'text',
  'bg',
  'border',
  'ring',
  'from',
  'to',
  'via',
  'fill',
  'stroke',
  'divide',
  'outline',
  'decoration',
  'shadow',
  'accent',
  'caret',
  'placeholder',
].join('|');

const RAW_PALETTE_CLASS = new RegExp(
  `\\b(?:${PREFIX})-(?:${PALETTE})(?:-\\d{2,3})?(?:\\/\\d{1,3})?\\b`,
  'g'
);

const componentsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../components/border-calculator'
);

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('border calculator theme tokens', () => {
  const files = collectSourceFiles(componentsRoot);

  it('finds the border calculator components', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(
    files.map((file) => [relative(componentsRoot, file), file])
  )('%s uses theme tokens instead of raw Tailwind palette colors', (_name, file) => {
    const matches = readFileSync(file, 'utf8').match(RAW_PALETTE_CLASS) ?? [];
    expect([...new Set(matches)]).toEqual([]);
  });
});
