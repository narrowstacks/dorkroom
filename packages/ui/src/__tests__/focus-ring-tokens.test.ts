import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// packages/ui/CLAUDE.md mandates exactly one focus indicator:
//   focus-visible:outline-none focus-visible:ring-2
//   focus-visible:ring-[color:var(--color-focus-ring)]
// or, where an outline (not a ring) is the chosen indicator:
//   focus-visible:outline-2 focus-visible:outline-offset-2
//   focus-visible:outline-[color:var(--color-focus-ring)]
//
// --color-focus-ring is a dedicated token precisely because the border
// tokens are translucent: rgba(255,255,255,0.2) in dark measures 1.85:1
// against --color-surface, under the 3:1 WCAG 1.4.11 non-text minimum.
// See issue #244.
const TOKEN = 'ring-[color:var(--color-focus-ring)]';
const OUTLINE_TOKEN = 'outline-[color:var(--color-focus-ring)]';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A focus-prefixed ring utility that carries a colour rather than a width.
 *
 * Covers `focus:`, `focus-visible:`, and `focus-within:`. Excludes widths
 * (`ring-2`), `ring-inset`, and every `ring-offset-*` utility — offset
 * colour is a separate concern and out of scope here. The value
 * alternation accepts arbitrary colour-shaped values
 * (`ring-[color:var(--x)]`, `ring-[--x]`, `ring-[#fff]`, `ring-[var(--x)]`,
 * `ring-[rgb(...)]`), Tailwind v4's CSS-variable shorthand
 * (`ring-(--x)`), slash opacity (`ring-white/30`), and *arbitrary* slash
 * opacity (`ring-red-500/[0.06]`), so a raw palette colour cannot slip
 * through by using bracket-opacity syntax. It deliberately does NOT match
 * an arbitrary non-colour bracket value such as `ring-[3px]` — that is a
 * width, not a colour.
 */
const FOCUS_RING_COLOR =
  /\b(?:group-)?focus(?:-visible|-within)?:(ring-(?!\d+\b|inset\b|offset-)(?:\[(?:color:|--|#|var\(|rgb|hsl|oklch)[^\]]*\]|\(--[^)]*\)|[a-z]+(?:-\d{2,3})?)(?:\/(?:\[[^\]]*\]|\d{1,3}))?)/g;

/**
 * The outline analogue of FOCUS_RING_COLOR. Excludes `outline-none` (a
 * reset, not a colour), widths (`outline-2`), and every
 * `outline-offset-*` utility.
 */
const FOCUS_OUTLINE_COLOR =
  /\b(?:group-)?focus(?:-visible|-within)?:(outline-(?!none\b|\d+\b|offset-)(?:\[(?:color:|--|#|var\(|rgb|hsl|oklch)[^\]]*\]|\(--[^)]*\)|[a-z]+(?:-\d{2,3})?)(?:\/(?:\[[^\]]*\]|\d{1,3}))?)/g;

/** A bare `focus:` ring prefix. `focus-visible:` does not match. */
const BARE_FOCUS_RING = /\bfocus:ring-/g;

/** A bare `focus:` outline prefix. `focus-visible:` does not match. */
const BARE_FOCUS_OUTLINE = /\bfocus:outline-/g;

/** Any inline `style` write to the Tailwind ring-colour custom property. */
const INLINE_RING_COLOR = /--tw-ring-color/g;

/**
 * A focus ring *width*, i.e. a utility that paints a focus ring at all.
 * Covers `focus:`, `focus-visible:`, and `focus-within:`, plus numbered
 * widths (`ring-2`) and the bare `ring` utility (no number, falls back to
 * `currentColor`). Global, so occurrences can be counted.
 */
const FOCUS_RING_WIDTH_GLOBAL =
  /\b(?:group-)?focus(?:-visible|-within)?:ring(?:-\d+)?(?![\w-])/g;

/**
 * The outline analogue of FOCUS_RING_WIDTH_GLOBAL. Deliberately does not
 * extend to a bare `outline` utility the way the ring pattern extends to
 * bare `ring`: `virtualized-error-boundary.tsx` pairs bare
 * `focus-visible:outline` with `focus-visible:outline-2` for a single
 * indicator, and counting both would break count-equality against the one
 * token that colours them. The numbered width alone is enough to require
 * the token.
 */
const FOCUS_OUTLINE_WIDTH_GLOBAL =
  /\b(?:group-)?focus(?:-visible|-within)?:outline-\d+\b/g;

/**
 * A focus-prefixed outline-style reset. Tailwind v4's `outline-none` sets
 * `outline-style: none`, which wins the cascade over any outline width
 * utility in the same file, producing zero visible focus indicator
 * regardless of the width/colour utilities alongside it. This exact
 * combination shipped with a fully invisible focus indicator on
 * `labeled-slider-input.tsx`; see issue #244.
 */
const FOCUS_OUTLINE_NONE =
  /\b(?:group-)?focus(?:-visible|-within)?:outline-none\b/;

/**
 * A focus-prefixed outline *width* utility, the thing `outline-none`
 * defeats when both appear together: numbered widths (`outline-2`) and
 * pixel/rem/em arbitrary widths (`outline-[2px]`).
 */
const FOCUS_OUTLINE_WIDTH =
  /\b(?:group-)?focus(?:-visible|-within)?:outline-(?:\d+\b|\[[0-9.]+(?:px|rem|em)\])/;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : collectSourceFiles(path);
    }
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('focus ring and outline tokens', () => {
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
  )('%s colours every focus outline with --color-focus-ring', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    const wrong = [
      ...new Set(
        [...source.matchAll(FOCUS_OUTLINE_COLOR)]
          .map((match) => match[1])
          .filter((utility) => utility !== OUTLINE_TOKEN)
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
  )('%s uses focus-visible, never a bare focus outline', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    expect(source.match(BARE_FOCUS_OUTLINE) ?? []).toEqual([]);
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
  )('%s pairs every focus ring width with the token colour', (_name, file) => {
    // Count equality, not file-level containment: a file with several
    // focus rings is otherwise only proven to colour one of them. A new
    // colourless ring added alongside an existing coloured one would pass
    // a mere "does the token appear somewhere" check silently.
    const source = readFileSync(file, 'utf8');
    const widths = source.match(FOCUS_RING_WIDTH_GLOBAL) ?? [];
    expect(source.split(TOKEN).length - 1).toBe(widths.length);
  });

  it.each(
    files.map((file) => [relative(srcRoot, file), file])
  )('%s pairs every focus outline width with the token colour', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    const widths = source.match(FOCUS_OUTLINE_WIDTH_GLOBAL) ?? [];
    expect(source.split(OUTLINE_TOKEN).length - 1).toBe(widths.length);
  });

  it.each(
    files.map((file) => [relative(srcRoot, file), file])
  )('%s never pairs a focus outline-none reset with an outline width', (_name, file) => {
    // outline-none sets outline-style: none, which wins the cascade over
    // any outline width utility in the same file, producing an invisible
    // focus indicator regardless of colour (issue #244). outline-none
    // paired with a *ring* is the mandated pattern and must not be
    // flagged here.
    const source = readFileSync(file, 'utf8');
    const hasNone = FOCUS_OUTLINE_NONE.test(source);
    const hasWidth = FOCUS_OUTLINE_WIDTH.test(source);
    expect(hasNone && hasWidth).toBe(false);
  });
});
