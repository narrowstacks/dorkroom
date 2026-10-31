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
 * The utilities that repaint a background on hover from a border token, read
 * from utilities.css so a new one is checked without anyone listing it here.
 * `hoverable-favorite` and `hoverable-link-tile` set no colour of their own,
 * so they render whatever the consumer carries: those consumers use
 * `text-primary`, and in both monochrome themes `--color-text-secondary` is
 * `--color-text-primary` anyway, so inherited text resolves the same.
 */
const REPAINTING_UTILITIES = [
  ...utilitiesCss.matchAll(
    /^\s*\.(hoverable-[\w-]+):hover\s*\{[^}]*\bbackground-color\s*:\s*var\(--color-border-[\w-]+\)/gm
  ),
].map((match) => match[1]);

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

/**
 * Tokens the contrast checks below read. Each theme has to declare these
 * itself: `resolveToken` falls back to the default palette for anything a
 * theme leaves out, so a theme whose selector stopped matching would quietly
 * be checked as the default one.
 */
const CHECKED_TOKENS = [
  '--color-background',
  '--color-surface',
  '--color-text-primary',
  '--color-border-primary',
  '--color-border-secondary',
  '--color-border-muted',
];

describe('the stylesheet parse sees what it checks', () => {
  it.each(THEMES)('reads a full palette for %s', (theme) => {
    const tokens = THEME_TOKENS.get(theme);
    expect(tokens, `no token block matched for "${theme}"`).toBeDefined();
    // A real palette declares dozens; a stray one-off block declares a few.
    expect(tokens?.size ?? 0).toBeGreaterThan(20);
    for (const token of CHECKED_TOKENS) {
      expect(tokens?.has(token), `"${theme}" does not declare ${token}`).toBe(
        true
      );
    }
  });

  it('finds the repainting utilities', () => {
    // The four this was written for (#273). More is fine; fewer means the
    // pattern no longer matches how utilities.css writes them.
    expect(REPAINTING_UTILITIES).toEqual(
      expect.arrayContaining([
        'hoverable-action-btn',
        'hoverable-icon-btn',
        'hoverable-favorite',
        'hoverable-link-tile',
      ])
    );
  });
});

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

// The hover states below used to be computed in JavaScript (onMouseEnter
// mutating element.style), outside the guarantee above. They are now Tailwind
// `hover:` utilities on theme tokens. Each pair is resolved the way the browser
// would: utility -> `@theme inline` mapping -> per-theme variable, so editing
// either the mapping or a palette value is caught. A hover background that
// lands on its own foreground paints the control invisible, which is the
// failure the monochrome themes invite (#273).
const INLINE_THEME = (() => {
  const open = /@theme inline\s*\{/.exec(themeCss);
  if (open === null) throw new Error('theme.css has no @theme inline block');
  const body = declarationsAfter(themeCss, open.index + open[0].length - 1)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')');
  const map = new Map<string, string>();
  for (const [, prop, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(prop, value.trim());
  }
  return map;
})();

const TRANSPARENT: Rgba = [0, 0, 0, 0];

/** Evaluate the colour expressions the inline theme uses, for one theme. */
function evalColor(theme: string, expr: string, depth = 0): Rgba {
  if (depth > 8) throw new Error(`token cycle at ${expr}`);
  const text = expr.trim();
  if (text === 'transparent') return TRANSPARENT;
  const alias = /^var\((--[\w-]+)\)$/.exec(text);
  if (alias) {
    const inline = INLINE_THEME.get(alias[1]);
    if (inline !== undefined) return evalColor(theme, inline, depth + 1);
    return mustParse(resolveToken(theme, alias[1]), alias[1]);
  }
  const veil = /^rgba\(var\((--[\w-]+)\),\s*([\d.]+)\)$/.exec(text);
  if (veil) {
    const channels = (resolveToken(theme, veil[1]) ?? '')
      .split(',')
      .map(Number);
    if (channels.length !== 3 || channels.some(Number.isNaN)) {
      throw new Error(`${veil[1]} is not an r, g, b triple in "${theme}"`);
    }
    return [channels[0], channels[1], channels[2], Number(veil[2])];
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+)\)$/.exec(text);
  if (mix) {
    const first = evalColor(theme, mix[1], depth + 1);
    const second = evalColor(theme, mix[3], depth + 1);
    const w = Number(mix[2]) / 100;
    const alpha = first[3] * w + second[3] * (1 - w);
    if (alpha === 0) return TRANSPARENT;
    const channel = (i: 0 | 1 | 2) =>
      Math.round(
        (first[i] * first[3] * w + second[i] * second[3] * (1 - w)) / alpha
      );
    return [channel(0), channel(1), channel(2), alpha];
  }
  return mustParse(text, text);
}

/**
 * The colour a `bg-*` or `text-*` utility paints, following Tailwind's lookup:
 * the per-property namespace first, then the shared `--color-*` namespace.
 * An opacity modifier (`/90`) scales the alpha.
 */
function utilityColor(theme: string, utility: string): Rgba {
  const match = /^(bg|text|border)-([\w-]+?)(?:\/(\d+))?$/.exec(utility);
  if (match === null) throw new Error(`cannot read utility ${utility}`);
  const [, kind, name, percent] = match;
  const namespace = new Map([
    ['bg', 'background-color'],
    ['text', 'text-color'],
    ['border', 'border-color'],
  ]).get(kind);
  const variable = [`--${namespace}-${name}`, `--color-${name}`].find(
    (candidate) => INLINE_THEME.has(candidate)
  );
  const [r, g, b, a] =
    variable === undefined
      ? // Not mapped in the inline theme: a plain @theme token, which Tailwind
        // emits as var(--color-<name>) and the active palette overrides.
        evalColor(theme, `var(--color-${name})`)
      : evalColor(theme, INLINE_THEME.get(variable) ?? '');
  return [r, g, b, a * (percent === undefined ? 1 : Number(percent) / 100)];
}

interface HoverPair {
  /** What the pair styles, for the failure message. */
  name: string;
  background: string;
  foreground: string;
}

/**
 * Deliberately below AA. Several migrated pairs keep exactly what the JS hover
 * painted before (darkroom's red on black clears 4.3:1, light's accent button
 * 4.5:1), and this guard exists to catch a hover that erases its own label
 * (1.00:1), not to re-grade the palettes.
 */
const MIN_HOVER_CONTRAST = 3;

const MIGRATED_HOVER_PAIRS: HoverPair[] = [
  {
    name: 'clear filters',
    background: 'bg-accent',
    foreground: 'text-background',
  },
  {
    name: 'expand filters',
    background: 'bg-brand',
    foreground: 'text-background',
  },
  {
    name: 'collapse filters',
    background: 'bg-surface-muted',
    foreground: 'text-primary',
  },
  {
    name: 'confirm cancel',
    background: 'bg-hover-surface',
    foreground: 'text-on-hover-surface',
  },
  {
    name: 'searchable select option',
    background: 'bg-hover-surface',
    foreground: 'text-on-hover-surface',
  },
  {
    name: 'save recipe',
    background: 'bg-text-secondary',
    foreground: 'text-background',
  },
  {
    name: 'primary buttons',
    background: 'bg-text-primary/90',
    foreground: 'text-background',
  },
  {
    name: 'view toggle',
    background: 'bg-veil-15',
    foreground: 'text-primary',
  },
  {
    name: 'custom recipe row',
    background: 'bg-recipe-custom-hover',
    foreground: 'text-primary',
  },
  {
    name: 'delete button',
    background: 'bg-delete-hover',
    foreground: 'text-delete-hover',
  },
];

describe('migrated hover utilities keep their content legible in every theme', () => {
  for (const pair of MIGRATED_HOVER_PAIRS) {
    for (const theme of THEMES) {
      it(`${pair.name} (${pair.background} / ${pair.foreground}) on ${theme}`, () => {
        const surface = opaque(
          mustParse(
            resolveToken(theme, '--color-surface') ??
              resolveToken(theme, '--color-background'),
            `${theme} surface`
          )
        );
        const background = flatten(
          utilityColor(theme, pair.background),
          surface
        );
        const foreground = flatten(
          utilityColor(theme, pair.foreground),
          background
        );
        const ratio = contrastRatio(background, foreground);
        expect(
          ratio,
          `${pair.name} in "${theme}" renders ${pair.foreground} on ` +
            `${pair.background} at ${ratio.toFixed(2)}:1`
        ).toBeGreaterThan(MIN_HOVER_CONTRAST);
      });
    }
  }
});
