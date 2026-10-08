import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * A `hover:` or `focus:` prefix only works on a utility Tailwind generates.
 * Written against a handwritten class it silently emits nothing, which is how
 * the recipe detail pills lost their hover state (#297). This compiles the
 * real stylesheet and fails if any state-prefixed colour class in the web
 * source has no rule in the output.
 */

const ROOT = join(__dirname, '..', '..');
const APP = join(ROOT, 'apps', 'dorkroom');
const STYLESHEET = join(APP, 'src', 'styles.css');
const SOURCE_DIRS = [join(APP, 'src'), join(ROOT, 'packages', 'ui', 'src')];

const STATE_VARIANTS =
  'hover|focus|focus-visible|focus-within|active|group-hover|peer-hover|peer-focus';
const COLOUR_UTILITIES =
  'bg|text|border|ring|outline|fill|stroke|decoration|divide|placeholder|caret|accent|from|via|to';
const CANDIDATE = new RegExp(
  `(?<![\\w:-])((?:[a-z0-9-]+:)*(?:${STATE_VARIANTS}):(?:${COLOUR_UTILITIES})-[a-z0-9-]+(?:\\/\\d+)?)(?![\\w/[-])`,
  'g'
);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });

/** `hover:bg-error/20` -> `.hover\:bg-error\/20` */
const toSelector = (candidate: string) =>
  `.${candidate.replace(/[:/.]/g, (c) => `\\${c}`)}`;

describe('state-prefixed colour classes', () => {
  let css = '';

  beforeAll(async () => {
    const result = await postcss([tailwind({ base: APP })]).process(
      readFileSync(STYLESHEET, 'utf8'),
      { from: STYLESHEET }
    );
    css = result.css;
  }, 60_000);

  const used = new Map<string, string>();
  for (const file of SOURCE_DIRS.flatMap(sourceFiles)) {
    for (const [, candidate] of readFileSync(file, 'utf8').matchAll(
      CANDIDATE
    )) {
      if (!used.has(candidate)) used.set(candidate, relative(ROOT, file));
    }
  }

  it('finds candidates to check', () => {
    expect(used.size).toBeGreaterThan(0);
  });

  it.each([...used])('%s emits a rule (first used in %s)', (candidate) => {
    expect(css).toContain(`${toSelector(candidate)}:`);
  });

  it('resolves text-primary and hover:text-primary to the same colour', () => {
    expect(css).toMatch(
      /\.text-primary\s*\{\s*color:\s*var\(--color-text-primary\)/
    );
    expect(css).toMatch(
      /\.hover\\:text-primary:hover\s*\{\s*color:\s*var\(--color-text-primary\)/
    );
  });

  it('has no class named primary that resolves to the brand colour', () => {
    expect(css).not.toMatch(/\.[\w\\:-]*primary[^{]*\{[^}]*--color-brand/);
  });
});
