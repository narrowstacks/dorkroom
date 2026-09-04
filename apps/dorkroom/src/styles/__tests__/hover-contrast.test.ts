import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The `.hoverable-*` utilities in utilities.css repaint a control's background
// from a border token on hover. That silently assumes the token lands somewhere
// between the surface and the text.
//
// It holds in dark and light, where every border token is translucent and
// composites into a subtle tint. It does not hold in darkroom and
// high-contrast: those palettes have two colours and define their border tokens
// as opaque copies of them, so `--color-border-secondary` IS
// `--color-text-primary` and the hovered content vanished (issue #273).
//
// This recomputes the effective hover colours from the real stylesheets rather
// than matching strings, so it fails both if the monochrome override is removed
// and if a future palette change reintroduces the collision by another route.

const here = dirname(fileURLToPath(import.meta.url));
const themeCss = readFileSync(join(here, '..', 'theme.css'), 'utf8');
const utilitiesCss = readFileSync(join(here, '..', 'utilities.css'), 'utf8');

type Rgb = readonly [number, number, number];
type Rgba = readonly [number, number, number, number];

/** Every theme whose palette a hover state has to survive. */
const THEMES = ['default', 'dark', 'light', 'darkroom', 'high-contrast'];

/**
 * The utilities that repaint a background on hover, with the foreground they
 * end up against. `hoverable-favorite` and `hoverable-link-tile` set no colour
 * of their own, so they render whatever the consumer carries: those consumers
 * use `text-primary`, and in both monochrome themes `--color-text-secondary`
 * is `--color-text-primary` anyway, so inherited text resolves the same.
 */
const REPAINTING_UTILITIES = [
  'hoverable-action-btn',
  'hoverable-icon-btn',
  'hoverable-favorite',
  'hoverable-link-tile',
] as const;

/** WCAG 1.4.3 AA for normal text. */
const AA_TEXT = 4.5;

/** Read the custom properties declared in one balanced `{ ... }` block. */
function declarationsAfter(css: string, openBraceIndex: number) {
  let depth = 1;
  let i = openBraceIndex + 1;
  while (depth > 0 && i < css.length) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
    i += 1;
  }
  return css.slice(openBraceIndex + 1, i - 1);
}

/** theme name -> declared custom properties, merged across that theme's blocks. */
function collectThemeTokens(): Map<string, Map<string, string>> {
  const themes = new Map<string, Map<string, string>>();
  const selector =
    /^(?:\[data-theme="([a-z-]+)"\]|:root:not\(\[data-theme\]\))\s*\{/gm;
  for (const match of themeCss.matchAll(selector)) {
    const name = match[1] ?? 'default';
    const body = declarationsAfter(themeCss, match.index + match[0].length - 1);
    const tokens = themes.get(name) ?? new Map<string, string>();
    for (const [, prop, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(prop, value.trim());
    }
    themes.set(name, tokens);
  }
  return themes;
}

const THEME_TOKENS = collectThemeTokens();

/** Resolve a token for a theme, following `var()` aliases and falling back to default. */
function resolveToken(
  theme: string,
  token: string,
  seen = new Set<string>()
): string | null {
  if (seen.has(token)) return null;
  seen.add(token);
  const value =
    THEME_TOKENS.get(theme)?.get(token) ??
    THEME_TOKENS.get('default')?.get(token);
  if (value === undefined) return null;
  const alias = /^var\((--[\w-]+)\)$/.exec(value.trim());
  return alias ? resolveToken(theme, alias[1], seen) : value.trim();
}

function parseColor(value: string | null): Rgba | null {
  if (value === null) return null;
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const h = hex[1];
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  const fn =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i.exec(
      value.trim()
    );
  if (fn) {
    return [
      Number(fn[1]),
      Number(fn[2]),
      Number(fn[3]),
      fn[4] === undefined ? 1 : Number(fn[4]),
    ];
  }
  return null;
}

/**
 * Parse a colour that the stylesheets are expected to define. Throwing keeps
 * the value narrowed to `Rgba` without an assertion, and a missing token is a
 * genuine failure rather than something to assert around.
 */
function mustParse(value: string | null, what: string): Rgba {
  const parsed = parseColor(value);
  if (parsed === null) {
    throw new Error(`${what} did not resolve to a colour (got ${value})`);
  }
  return parsed;
}

/** Like `declaredToken`, but a missing background is itself the bug. */
function mustDeclare(
  utility: string,
  property: 'background-color' | 'color',
  theme: string
): string {
  const token = declaredToken(utility, property, theme);
  if (token === null) {
    throw new Error(`.${utility}:hover sets no ${property} in "${theme}"`);
  }
  return token;
}

/** Drop the alpha channel of a colour already known to be opaque. */
function opaque([r, g, b]: Rgba): Rgb {
  return [r, g, b];
}

/** Composite a possibly-translucent colour over an opaque backdrop. */
function flatten(color: Rgba, backdrop: Rgb): Rgb {
  const a = color[3];
  return [
    Math.round(color[0] * a + backdrop[0] * (1 - a)),
    Math.round(color[1] * a + backdrop[1] * (1 - a)),
    Math.round(color[2] * a + backdrop[2] * (1 - a)),
  ];
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  );
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The token a rule assigns to one property, honouring a `[data-theme="..."]`
 * override where the theme has one. Returns null when no rule sets it.
 */
function declaredToken(
  utility: string,
  property: 'background-color' | 'color',
  theme: string
): string | null {
  const themed = new RegExp(
    // The utility may sit anywhere in a grouped selector list, so allow further
    // selectors after it, and allow whitespace before the brace when it is last.
    `\\[data-theme="${theme}"\\][^{}]*\\.${utility}:hover(?:\\s*,[^{]*)?\\s*\\{([^}]*)\\}`
  ).exec(utilitiesCss);
  const base = new RegExp(`\\.${utility}:hover\\s*\\{([^}]*)\\}`).exec(
    utilitiesCss
  );
  for (const body of [themed?.[1], base?.[1]]) {
    if (body === undefined) continue;
    const declaration = new RegExp(
      `(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`
    ).exec(body);
    const token = declaration && /var\((--[\w-]+)\)/.exec(declaration[1]);
    if (token) return token[1];
  }
  return null;
}

describe('hoverable utilities keep their content legible in every theme', () => {
  // A grouped `[data-theme]` selector list only matches the regex above when the
  // theme's own selector is present, so prove the extraction sees each theme.
  it('finds a hover background token for every utility and theme', () => {
    for (const utility of REPAINTING_UTILITIES) {
      for (const theme of THEMES) {
        expect(
          declaredToken(utility, 'background-color', theme),
          `${utility} in ${theme} has no hover background token`
        ).not.toBeNull();
      }
    }
  });

  for (const utility of REPAINTING_UTILITIES) {
    for (const theme of THEMES) {
      it(`${utility} on ${theme}`, () => {
        const backdrop = opaque(
          mustParse(
            resolveToken(theme, '--color-surface') ??
              resolveToken(theme, '--color-background'),
            `${theme} surface`
          )
        );

        const backgroundToken = mustDeclare(utility, 'background-color', theme);
        const background = flatten(
          mustParse(resolveToken(theme, backgroundToken), backgroundToken),
          backdrop
        );

        // Foreground: whatever the rule sets, else the consumer's text-primary.
        const foregroundToken =
          declaredToken(utility, 'color', theme) ?? '--color-text-primary';
        const foreground = flatten(
          mustParse(resolveToken(theme, foregroundToken), foregroundToken),
          background
        );

        const ratio = contrastRatio(background, foreground);
        expect(
          ratio,
          `${utility} hovered in "${theme}" renders ${foregroundToken} on ` +
            `${backgroundToken} at ${ratio.toFixed(2)}:1, below AA ${AA_TEXT}:1`
        ).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  // darkroom pins every svg to --color-text-primary, which is the colour these
  // buttons' backgrounds become on hover, so the icon needs its own inversion.
  it('inverts icons wherever the hover background is inverted', () => {
    for (const utility of REPAINTING_UTILITIES) {
      expect(
        new RegExp(
          `\\[data-theme="darkroom"\\]\\s*\\.${utility}:hover svg`
        ).test(utilitiesCss),
        `${utility} inverts its background in darkroom but not its icon`
      ).toBe(true);
    }
  });
});
