import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// packages/ui/CLAUDE.md mandates exactly one focus indicator:
//   focus-visible:outline-none focus-visible:ring-2
//   focus-visible:ring-[color:var(--color-focus-ring)]
//
// --color-focus-ring is a dedicated token precisely because the border
// tokens are translucent: rgba(255,255,255,0.2) in dark measures 1.85:1
// against --color-surface, under the 3:1 WCAG 1.4.11 non-text minimum.
// See issue #244.
const TOKEN = 'ring-[color:var(--color-focus-ring)]';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A focus-prefixed ring utility that carries a colour rather than a width.
 *
 * Excludes widths (`ring-2`), `ring-inset`, and every `ring-offset-*`
 * utility — offset colour is a separate concern and out of scope here.
 * The value alternation deliberately accepts arbitrary values
 * (`ring-[color:var(--x)]`), slash opacity (`ring-white/30`) and
 * *arbitrary* slash opacity (`ring-red-500/[0.06]`), so a raw palette
 * colour cannot slip through by using bracket-opacity syntax.
 */
const FOCUS_RING_COLOR =
  /\b(?:group-)?focus(?:-visible)?:(ring-(?!\d+\b|inset\b|offset-)(?:\[[^\]]*\]|[a-z]+(?:-\d{2,3})?)(?:\/(?:\[[^\]]*\]|\d{1,3}))?)/g;

/** A bare `focus:` ring prefix. `focus-visible:` does not match. */
const BARE_FOCUS_RING = /\bfocus:ring-/g;

/** Any inline `style` write to the Tailwind ring-colour custom property. */
const INLINE_RING_COLOR = /--tw-ring-color/g;

/** A focus ring *width*, i.e. a file that paints a focus ring at all. */
const FOCUS_RING_WIDTH = /\b(?:group-)?focus(?:-visible)?:ring-\d+\b/;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : collectSourceFiles(path);
    }
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('focus ring tokens', () => {
  const files = collectSourceFiles(srcRoot);

  it('finds the ui source files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(
    files.map((file) => [relative(srcRoot, file), file])
  )('%s colours every focus ring with --color-focus-ring', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    const wrong = [
      ...new Set(
        [...source.matchAll(FOCUS_RING_COLOR)]
          .map((match) => match[1])
          .filter((utility) => utility !== TOKEN)
      ),
    ];
    expect(wrong).toEqual([]);
  });

  it.each(
    files.map((file) => [relative(srcRoot, file), file])
  )('%s uses focus-visible, never a bare focus ring', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    expect(source.match(BARE_FOCUS_RING) ?? []).toEqual([]);
  });

  it.each(
    files.map((file) => [relative(srcRoot, file), file])
  )('%s sets no ring colour from an inline style', (_name, file) => {
    // An inline declaration outranks every stylesheet rule, so it also
    // defeats the darkroom `*:focus-visible` correction in theme.css.
    const source = readFileSync(file, 'utf8');
    expect(source.match(INLINE_RING_COLOR) ?? []).toEqual([]);
  });

  it.each(
    files.map((file) => [relative(srcRoot, file), file])
  )('%s pairs any focus ring width with the token colour', (_name, file) => {
    // File-level, not element-level: a file with several focus rings is
    // only proven to colour one of them. Rules above carry the exactness;
    // this one catches a width added with no colour at all, which would
    // fall back to Tailwind's `currentColor`.
    const source = readFileSync(file, 'utf8');
    if (!FOCUS_RING_WIDTH.test(source)) return;
    expect(source).toContain(TOKEN);
  });
});
