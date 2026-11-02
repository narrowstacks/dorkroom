/**
 * Fallback stylesheet for old Chromium (issue #49), built from the app CSS by
 * the `legacy-css` plugin in vite.config.ts.
 *
 * Kindle firmware 5.16.4+ browses with Silk on Chromium 80. That engine runs
 * the legacy JS bundle, but the Tailwind 4 stylesheet is written for Chrome
 * 111+: Chrome drops `@layer` blocks before 99 (about three quarters of the
 * file), and `color-mix()` needs 111. This module rewrites the built CSS into
 * a copy Chromium 80 understands, and `legacyCssLoader` swaps it in only when
 * the browser has no cascade layers. Modern browsers never request it.
 *
 * What the rewrite does, in order:
 *  1. Drops `@property` rules and the `@supports (color: lab(...))` blocks
 *     that lightningcss emits as progressive enhancement (the sRGB fallbacks
 *     sit in front of them), and unwraps `@supports` blocks guarded on
 *     `color-mix()` or on Tailwind's no-`@property` hack.
 *  2. Resolves every `color-mix()` to a static colour per theme. Theme roots
 *     (`:root`, `[data-theme=...]`, `:root:not([data-theme])`) define the
 *     colour variables, so a mix inside a theme root is computed in place,
 *     and a mix anywhere else becomes `var(--lc-N)`, with `--lc-N` defined
 *     once per theme root. A mix that reads a variable set outside a theme
 *     root, or `currentcolor`, cannot be computed and its declaration is
 *     dropped; Tailwind's static fallback in front of it then applies.
 *  3. Lowers what Chromium 80 lacks and lightningcss leaves alone:
 *     `dvh`/`svh`/`lvh` units, the `translate`/`scale`/`rotate` properties
 *     (Chrome 104), and logical properties whose value holds a `var()`.
 *  4. Emulates flex `gap` (Chrome 84) with margins (`emulateFlexGap`).
 *  5. Lowers `:where()`/`:is()` (Chrome 88).
 *  6. Flattens cascade layers, raising specificity to keep layer order.
 *  7. Runs lightningcss for Chrome 80 (the remaining logical properties,
 *     vendor prefixes) and minifies.
 *  8. Splits selector lists that mix in a selector Chromium 80 cannot parse
 *     (`:has()`, `:focus-visible`, `::-moz-*`), since one bad selector would
 *     drop the whole rule.
 *
 *  Colours that components compute in JS (`colorMixOr` in packages/ui) are
 *  inline styles, outside this file; they fall back on their own. */
import { createHash } from 'node:crypto';
import { color, serializeRGB } from '@csstools/css-color-parser';
import { parseComponentValue } from '@csstools/css-parser-algorithms';
import { tokenize } from '@csstools/css-tokenizer';
import cascadeLayers from '@csstools/postcss-cascade-layers';
import isPseudoClass from '@csstools/postcss-is-pseudo-class';
import { transform } from 'lightningcss';
import postcss, {
  type AtRule,
  type ChildNode,
  type Container,
  type Declaration,
  type Node as PostcssNode,
  type Plugin,
  type Root,
  Rule,
} from 'postcss';
import selectorParser from 'postcss-selector-parser';

/** The oldest engine the fallback stylesheet targets: Chromium 80. */
const LEGACY_CHROME = 80;

/** Constructs the legacy stylesheet must not contain, and why. */
const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/@layer\b/, '@layer (Chrome 99+)'],
  [/color-mix\(/, 'color-mix() (Chrome 111+)'],
  [/var\(--[\w-]+,\s*\)/, 'empty var() fallback (invalid in Chromium 80)'],
];

/** Why `css` would not work as the legacy stylesheet, or `undefined`. */
export function legacyCssProblem(css: string): string | undefined {
  const found = FORBIDDEN.filter(([pattern]) => pattern.test(css)).map(
    ([, name]) => name
  );
  return found.length > 0 ? `still contains ${found.join(', ')}` : undefined;
}

/** Content-hashed file name for the legacy copy of `cssFileName`, e.g.
 *  `assets/index-AbC.css` -> `assets/index-legacy-XyZ12345.css`. */
export function legacyCssFileName(cssFileName: string, css: string): string {
  const hash = createHash('sha256').update(css).digest('base64url').slice(0, 8);
  const name = cssFileName.replace(/^.*\//, '').replace(/-[^-]+\.css$/, '');
  return cssFileName.replace(/[^/]+$/, `${name}-legacy-${hash}.css`);
}

/** Attribute the loader sets on `<html>` when flex `gap` does not work, which
 *  scopes the margin emulation (`emulateFlexGap`). */
export const NO_FLEX_GAP_ATTR = 'data-lc-nogap';

/** Attribute the loader sets on `<html>` for every browser that gets the legacy
 *  stylesheet. The app reads it (`isLegacyBrowser` in packages/ui) to turn off
 *  JS-driven motion, which the stylesheet's no-motion override cannot reach. */
export const LEGACY_BROWSER_ATTR = 'data-lc-legacy';

/** The Kindle user agents `isEInkDevice` (packages/ui/src/lib/themes.ts) locks
 *  to high contrast. The loader sets `data-theme` with it before first paint,
 *  so the page does not flash dark and then white on an e-ink screen. Keep the
 *  two spellings in sync; a test in scripts/__tests__ compares them. */
export const KINDLE_UA_SOURCE = String.raw`/\bKindle(\/|\sBuild\/)/`;

/** Body of the classic inline script, placed right after the stylesheet
 *  `<link>` with `href`, that loads `legacyHref` instead in browsers without
 *  cascade layers. It must stay ES5, because the build parses classic inline
 *  scripts as ES5. `CSSLayerBlockRule` ships with `@layer` itself (Chrome 99,
 *  Safari 15.4, Firefox 97), so it is an exact probe.
 *
 *  The modern `<link>` is removed and the legacy one is written with
 *  `document.write`, so the parser inserts it and it blocks rendering like
 *  the original. Changing `href` on the parsed link instead makes the new
 *  sheet non-blocking, and Chromium paints the whole app unstyled until it
 *  arrives.
 *
 *  It also measures whether flex `gap` works (Chrome 84, Firefox 63, Safari
 *  14.1) and sets `NO_FLEX_GAP_ATTR` when it does not, so browsers that have
 *  gap but not `@layer` do not get the emulated margins on top. It also sets
 *  `LEGACY_BROWSER_ATTR`, whether or not the `<link>` was found, and for a
 *  Kindle agent sets `data-theme="high-contrast"` right away. */
export function legacyCssLoader(href: string, legacyHref: string): string {
  const selector = JSON.stringify(`link[rel=stylesheet][href="${href}"]`);
  const tag = JSON.stringify(`<link rel="stylesheet" href="${legacyHref}">`);
  return (
    'window.CSSLayerBlockRule||function(d,l){' +
    'var e=d.documentElement,p=d.createElement("div");' +
    `e.setAttribute("${LEGACY_BROWSER_ATTR}","");` +
    `${KINDLE_UA_SOURCE}.test(navigator.userAgent)&&e.setAttribute("data-theme","high-contrast");` +
    'p.style.cssText="display:flex;flex-direction:column;row-gap:1px;position:absolute";' +
    'p.appendChild(d.createElement("div"));p.appendChild(d.createElement("div"));' +
    `e.appendChild(p);p.offsetHeight!==1&&e.setAttribute("${NO_FLEX_GAP_ATTR}","");e.removeChild(p);` +
    `l&&(l.parentNode.removeChild(l),d.write(${tag}))` +
    `}(document,document.querySelector(${selector}))`
  );
}

/** Constructs Chromium 80 ignores that are knowingly left in the legacy
 *  stylesheet (the rules degrade gracefully), counted for the build log. */
const KNOWN_LEFTOVERS: ReadonlyArray<readonly [string, RegExp]> = [
  ['aspect-ratio', /[{;]aspect-ratio:/g],
  [':focus-visible', /:focus-visible/g],
  [':has()', /:has\(/g],
  ['@container', /@container\b/g],
  ['@starting-style', /@starting-style\b/g],
];

/** How often each known-unsupported construct occurs in `css`. */
export function legacyCssLeftovers(css: string): Map<string, number> {
  return new Map(
    KNOWN_LEFTOVERS.map(([name, pattern]) => [
      name,
      css.match(pattern)?.length ?? 0,
    ])
  );
}

export interface LegacyCssReport {
  /** `color-mix()` calls computed to a static colour. */
  resolved: number;
  /** Declarations dropped because a `color-mix()` in them was not static. */
  dropped: string[];
}

/** Rewrites the built app stylesheet into the Chromium 80 fallback. */
export async function buildLegacyCss(
  css: string
): Promise<{ css: string; report: LegacyCssReport }> {
  const report: LegacyCssReport = { resolved: 0, dropped: [] };
  const flattened = await postcss([
    prepare(),
    resolveColorMix(report),
    lowerProperties(),
    emulateFlexGap(),
    whereToIs(),
    isPseudoClass({ specificityMatchingName: 'lc-none' }),
    cascadeLayers({
      onRevertLayerKeyword: false,
      onConditionalRulesChangingLayerOrder: false,
      onImportLayerRule: false,
    }),
  ]).process(css, { from: undefined });

  const lowered = transform({
    filename: 'legacy.css',
    code: Buffer.from(flattened.css),
    minify: true,
    targets: { chrome: LEGACY_CHROME << 16 },
  });

  const split = await postcss([splitUnsupportedSelectors()]).process(
    lowered.code.toString(),
    { from: undefined }
  );
  return { css: split.css + NO_BLUR_CSS + NO_MOTION_CSS, report };
}

/** Appended last, so it wins over every rule above regardless of specificity
 *  (`!important`). Kindle's e-ink screen ghosts and refreshes slowly, so the
 *  legacy stylesheet runs no animation or transition (issue #637).
 *
 *  Animations are finished instantly rather than removed with
 *  `animation: none`. A zero-length run with one iteration still applies the
 *  `to` keyframe when `animation-fill-mode` is `forwards` or `both`, and the
 *  base style otherwise, so an element that fades or slides in ends up visible
 *  and in place. Every keyframe the site defines (animations.css, components.css,
 *  Tailwind's spin/ping/pulse) ends at the element's resting style. `none`
 *  would also work for them, but would skip `animationend`, which libraries
 *  listen for before unmounting an exit animation. */
export const NO_MOTION_CSS =
  '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;' +
  'animation-iteration-count:1!important;transition:none!important;' +
  'scroll-behavior:auto!important}';

/** Appended before `NO_MOTION_CSS`. Kindle's e-ink screen has no use for blur:
 *  it only smears text, and the drawer's 95% opaque background let faint page
 *  text show through it (issue #642). So on the legacy stylesheet every
 *  `backdrop-blur-*` user loses its blur, and the translucent surfaces that
 *  leaned on it (menu drawer, header, nav pill, nav dropdown) turn solid. The
 *  two overlay scrims keep their dim, only without the blur. Their
 *  backgrounds are inline styles, hence `!important`. Selectors avoid `:is()`,
 *  which Chromium 80 lacks. */
export const NO_BLUR_CSS =
  '[class*="backdrop-blur"]{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
  '#mobile-navigation,header[class*="backdrop-blur"],header [class*="backdrop-blur"],' +
  '[class*="backdrop-blur-md"]{background-color:var(--color-background)!important}';

// ---------------------------------------------------------------------------
// 1. @supports and @property

function prepare(): Plugin {
  return {
    postcssPlugin: 'legacy-css-prepare',
    Once(root) {
      root.walkAtRules((atRule) => {
        if (atRule.name === 'property') {
          atRule.remove();
          return;
        }
        if (atRule.name !== 'supports') return;
        const params = atRule.params;
        if (/color-mix\(|-webkit-hyphens|margin-trim/.test(params)) {
          // Feature tests this stylesheet answers itself: colour mixes are
          // resolved below, and no legacy browser has `@property`.
          unwrap(atRule);
        } else if (/\b(?:ok)?l(?:ab|ch)\(/.test(params)) {
          atRule.remove();
        }
      });
    },
  };
}

function unwrap(atRule: AtRule): void {
  if (atRule.nodes) atRule.replaceWith(atRule.nodes);
  else atRule.remove();
}

// ---------------------------------------------------------------------------
// 2. color-mix()

/** A selector that only ever matches the root element, where the themes put
 *  their colour variables. */
const THEME_ROOT =
  /^(?:(?::root|:host|html)(?:\[data-theme=(?:"[\w-]+"|[\w-]+)\])?|\[data-theme=(?:"[\w-]+"|[\w-]+)\])(?::not\(\[data-theme\]\))?$/;
const BASE_ROOT = /^(?::root|:host|html)$/;

function isAtRule(node: PostcssNode | undefined): node is AtRule {
  return node?.type === 'atrule';
}

function isRule(node: PostcssNode | undefined): node is Rule {
  return node?.type === 'rule';
}

/** Ancestor at-rules that change *whether* a rule applies (not `@layer`),
 *  outermost first. */
function conditions(node: ChildNode): AtRule[] {
  const chain: AtRule[] = [];
  for (
    let parent: PostcssNode | undefined = node.parent;
    parent;
    parent = parent.parent
  ) {
    if (isAtRule(parent) && parent.name !== 'layer') chain.unshift(parent);
  }
  return chain;
}

function conditionKey(chain: AtRule[]): string {
  return chain.map((a) => `@${a.name} ${a.params}`).join(' ');
}

function selectorsOf(rule: Rule): string[] {
  return rule.selectors.map((s) => s.trim());
}

/** Every top-level call of `fn(...)` in `value`, with its source span. */
function findCalls(
  value: string,
  fn: string
): { start: number; end: number; args: string }[] {
  const calls: { start: number; end: number; args: string }[] = [];
  const needle = `${fn}(`;
  let from = 0;
  for (;;) {
    const start = value.indexOf(needle, from);
    if (start < 0) return calls;
    // `var(` must not match inside a longer identifier.
    if (start > 0 && /[\w-]/.test(value[start - 1] ?? '')) {
      from = start + needle.length;
      continue;
    }
    let depth = 0;
    let end = start + needle.length - 1;
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++;
      else if (value[end] === ')' && --depth === 0) break;
    }
    calls.push({
      start,
      end: end + 1,
      args: value.slice(start + needle.length, end),
    });
    from = end + 1;
  }
}

function splitTopLevelComma(args: string): string[] {
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '(') depth++;
    else if (args[i] === ')') depth--;
    else if (args[i] === ',' && depth === 0) {
      return [args.slice(0, i), args.slice(i + 1)];
    }
  }
  return [args];
}

type Vars = Map<string, string>;

/** `value` with every `var()` substituted from `vars`, or `undefined` when
 *  one has neither a value nor a fallback. */
function substituteVars(
  value: string,
  vars: Vars,
  seen: ReadonlySet<string> = new Set()
): string | undefined {
  const calls = findCalls(value, 'var');
  if (calls.length === 0) return value;
  let out = '';
  let last = 0;
  for (const call of calls) {
    const [name = '', fallback] = splitTopLevelComma(call.args);
    const key = name.trim();
    let replacement: string | undefined;
    const raw = vars.get(key);
    if (raw !== undefined && !seen.has(key)) {
      replacement = substituteVars(raw, vars, new Set([...seen, key]));
    }
    if (replacement === undefined && fallback !== undefined) {
      replacement = substituteVars(fallback, vars, seen);
    }
    if (replacement === undefined) return undefined;
    out += value.slice(last, call.start) + replacement;
    last = call.end;
  }
  return out + value.slice(last);
}

/** A static sRGB colour for `expression`, or `undefined`. */
function computeColor(expression: string): string | undefined {
  const node = parseComponentValue(tokenize({ css: expression }));
  if (!node) return undefined;
  const data = color(node);
  if (!data) return undefined;
  return serializeRGB(data).toString().replace(/\s+/g, '');
}

function resolveMix(mix: string, vars: Vars): string | undefined {
  const substituted = substituteVars(mix, vars);
  return substituted === undefined ? undefined : computeColor(substituted);
}

interface ThemeRoot {
  selector: string;
  chain: AtRule[];
  vars: Vars;
}

function resolveColorMix(report: LegacyCssReport): Plugin {
  return {
    postcssPlugin: 'legacy-css-color-mix',
    Once(root) {
      // Pass 1: collect the variables each theme root defines, and the names
      // set anywhere else (a mix reading one of those is not static).
      const base: Vars = new Map();
      const themes = new Map<string, ThemeRoot>();
      const localNames = new Set<string>();
      root.walkRules((rule) => {
        if (isAtRule(rule.parent) && rule.parent.name === 'keyframes') return;
        const selectors = selectorsOf(rule);
        const isTheme = selectors.every((s) => THEME_ROOT.test(s));
        const chain = conditions(rule);
        rule.each((node) => {
          if (node.type !== 'decl' || !node.prop.startsWith('--')) return;
          if (!isTheme) {
            localNames.add(node.prop);
            return;
          }
          if (chain.length === 0 && selectors.every((s) => BASE_ROOT.test(s))) {
            base.set(node.prop, node.value);
          }
          const key = `${conditionKey(chain)}|${rule.selector}`;
          let theme = themes.get(key);
          if (!theme) {
            theme = { selector: rule.selector, chain, vars: new Map() };
            themes.set(key, theme);
          }
          theme.vars.set(node.prop, node.value);
        });
      });

      /** Variables in force on the root element for a theme root: the base
       *  ones, then the same selector unconditionally, then its own. */
      const scope = (theme: ThemeRoot): Vars => {
        const vars = new Map(base);
        const plain = themes.get(`|${theme.selector}`);
        if (plain && plain !== theme) {
          for (const [k, v] of plain.vars) vars.set(k, v);
        }
        for (const [k, v] of theme.vars) vars.set(k, v);
        return vars;
      };
      const scopes = new Map<ThemeRoot, Vars>();
      for (const theme of themes.values()) scopes.set(theme, scope(theme));

      // Pass 2: rewrite every declaration that holds a color-mix().
      const mixes = new Map<string, string>(); // expression -> --lc-N
      const drop = (decl: Declaration, why: string) => {
        const where = isRule(decl.parent) ? decl.parent.selector : '';
        report.dropped.push(`${where} { ${decl.prop} } ${why}`);
        decl.remove();
      };
      root.walkDecls((decl) => {
        if (!decl.value.includes('color-mix(')) return;
        const rule = decl.parent;
        const themeKey =
          isRule(rule) && selectorsOf(rule).every((s) => THEME_ROOT.test(s))
            ? `${conditionKey(conditions(rule))}|${rule.selector}`
            : undefined;
        const theme = themeKey ? themes.get(themeKey) : undefined;
        let value = decl.value;
        for (const call of findCalls(decl.value, 'color-mix').reverse()) {
          const mix = decl.value.slice(call.start, call.end);
          let replacement: string | undefined;
          if (theme) {
            replacement = resolveMix(mix, scopes.get(theme) ?? base);
          } else {
            const readsLocal = findCalls(mix, 'var').some(({ args }) =>
              localNames.has((splitTopLevelComma(args)[0] ?? '').trim())
            );
            // Not every theme variable has a base value (some exist only per
            // theme), so a mix is usable if any theme root can compute it.
            const computable =
              resolveMix(mix, base) !== undefined ||
              [...scopes.values()].some(
                (v) => resolveMix(mix, v) !== undefined
              );
            if (!readsLocal && computable) {
              const key = mix.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');
              let name = mixes.get(key);
              if (!name) {
                name = `--lc-${mixes.size}`;
                mixes.set(key, name);
              }
              replacement = `var(${name})`;
            }
          }
          if (replacement === undefined) {
            drop(decl, mix);
            return;
          }
          report.resolved++;
          value =
            value.slice(0, call.start) + replacement + value.slice(call.end);
        }
        decl.value = value;
      });

      // Pass 3: define each --lc-N per theme root, at the end of the sheet
      // (unlayered, base first), so a theme's value beats the base one.
      if (mixes.size === 0) return;
      const ordered = [...themes.values()].sort(
        (a, b) =>
          Number(!isBaseTheme(b)) - Number(!isBaseTheme(a)) ||
          a.chain.length - b.chain.length
      );
      const baseValues = new Map<string, string | undefined>();
      for (const [mix, name] of mixes)
        baseValues.set(name, resolveMix(mix, base));
      for (const theme of ordered) {
        const vars = scopes.get(theme) ?? base;
        const rule = new Rule({ selector: theme.selector });
        for (const [mix, name] of mixes) {
          const value = resolveMix(mix, vars);
          if (value === undefined) continue;
          if (!isBaseTheme(theme) && value === baseValues.get(name)) continue;
          rule.append({ prop: name, value });
        }
        if (!rule.nodes.length) continue;
        let parent: Container = root;
        for (const condition of theme.chain) {
          const clone = condition.clone({ nodes: [] });
          parent.append(clone);
          parent = clone;
        }
        parent.append(rule);
      }
    },
  };
}

function isBaseTheme(theme: ThemeRoot): boolean {
  return (
    theme.chain.length === 0 &&
    theme.selector.split(',').every((s) => BASE_ROOT.test(s.trim()))
  );
}

// ---------------------------------------------------------------------------
// 3. Units, individual transform properties, :where()

function splitSpaces(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** `105%` -> `1.05`: Chromium 80's `scale()` takes numbers only. */
function percentToNumber(value: string): string {
  return value.replace(/^(-?[\d.]+)%$/, (_, n: string) =>
    String(Number(n) / 100)
  );
}

const EMPTY_FALLBACK = /var\((--[\w-]+),\s*\)/g;
const EMPTY_FALLBACK_TEST = /var\(--[\w-]+,\s*\)/;

const TRANSFORM = 'var(--lc-translate) var(--lc-rotate) var(--lc-scale)';

function lowerProperties(): Plugin {
  return {
    postcssPlugin: 'legacy-css-properties',
    Once(root: Root) {
      let usesTransforms = false;
      // Chromium 80 treats `var(--x,)` (an empty fallback, which Tailwind 4
      // writes for every optional `--tw-*` part) as invalid at computed-value
      // time, so the whole declaration is dropped: `backdrop-filter`, ring
      // shadows (every focus ring), `tabular-nums`, the filter utilities.
      // Drop the fallback and have the reset set each name to an empty value
      // instead (`--x: ;`, which Chromium 80 accepts; `--x:;` it rejects).
      const emptyFallbacks = new Set<string>();
      root.walkDecls((decl) => {
        for (const m of decl.value.matchAll(EMPTY_FALLBACK)) {
          if (m[1]) emptyFallbacks.add(m[1]);
        }
      });
      root.walkDecls((decl) => {
        if (emptyFallbacks.has(decl.prop) && decl.value.trim() === 'initial') {
          decl.value = ' ';
        } else if (EMPTY_FALLBACK_TEST.test(decl.value)) {
          decl.value = decl.value.replace(EMPTY_FALLBACK, 'var($1)');
        }
      });
      root.walkDecls((decl) => {
        decl.value = decl.value.replace(/(\d)[dsl]v([hw])\b/g, '$1v$2');
        if (/^--tw-scale-[xyz]$/.test(decl.prop)) {
          decl.value = percentToNumber(decl.value.trim());
          return;
        }
        if (lowerLogical(decl)) return;
        // Tailwind's `.transform` (and any composite that reads its rotate
        // or skew variables) comes after the translate/scale/rotate
        // utilities, so on its own it would replace their lowered transform.
        // Prefixing it with the same parts keeps them composed, in the order
        // CSS applies the individual properties: translate, rotate, scale,
        // then transform.
        if (
          decl.prop === 'transform' &&
          /var\(--tw-(?:rotate|skew)-/.test(decl.value)
        ) {
          usesTransforms = true;
          decl.value = `${TRANSFORM} ${decl.value}`;
          return;
        }
        let fn: string | undefined;
        let args: string[] = splitSpaces(decl.value);
        if (decl.prop === 'translate') {
          fn = args.length > 2 ? 'translate3d' : 'translate';
          if (decl.value.trim() === 'none') args = ['0'];
        } else if (decl.prop === 'scale') {
          fn = args.length > 2 ? 'scale3d' : 'scale';
          args =
            decl.value.trim() === 'none' ? ['1'] : args.map(percentToNumber);
        } else if (decl.prop === 'rotate' && args.length === 1) {
          fn = 'rotate';
          if (decl.value.trim() === 'none') args = ['0deg'];
        }
        if (!fn) return;
        usesTransforms = true;
        const name = `--lc-${decl.prop}`;
        decl.cloneBefore({ prop: name, value: `${fn}(${args.join(',')})` });
        decl.prop = 'transform';
        decl.value = TRANSFORM;
      });
      if (usesTransforms) {
        // Same pattern as Tailwind's own `@property` fallback: reset per
        // element so the values never inherit. In the lowest layer, so any
        // utility that sets them wins.
        root.prepend(
          postcss.atRule({
            name: 'layer',
            params: 'properties',
            nodes: [
              postcss.rule({
                selector: '*,:before,:after,::backdrop',
                nodes: [
                  postcss.decl({
                    prop: '--lc-translate',
                    value: 'translate(0)',
                  }),
                  postcss.decl({ prop: '--lc-rotate', value: 'rotate(0)' }),
                  postcss.decl({ prop: '--lc-scale', value: 'scale(1)' }),
                ],
              }),
            ],
          })
        );
      }
    },
  };
}

/** Physical sides for the flow-relative properties Tailwind writes. The
 *  site is left-to-right only (`<html lang="en">`), so `inline` is left and
 *  right. lightningcss lowers these too, but not when the value holds a
 *  `var()`, which is nearly every Tailwind spacing utility. */
function sidesOf(axis: string): readonly [string, string] {
  return axis === 'inline' ? ['left', 'right'] : ['top', 'bottom'];
}

function lowerLogical(decl: Declaration): boolean {
  const longhand =
    /^(padding|margin|scroll-margin|scroll-padding|border)-(inline|block)-(start|end)(-.+)?$/.exec(
      decl.prop
    );
  if (longhand) {
    const [, box = '', axis = '', edge = '', rest = ''] = longhand;
    const sides = sidesOf(axis);
    decl.prop = `${box}-${sides[edge === 'start' ? 0 : 1]}${rest}`;
    return true;
  }
  const shorthand =
    /^(padding|margin|scroll-margin|scroll-padding|inset)-(inline|block)$/.exec(
      decl.prop
    );
  if (shorthand) {
    const [, box = '', axis = ''] = shorthand;
    const sides = sidesOf(axis);
    const values = splitSpaces(decl.value);
    if (values.length < 1 || values.length > 2) return false;
    const prefix = box === 'inset' ? '' : `${box}-`;
    decl.cloneBefore({ prop: `${prefix}${sides[0]}`, value: values[0] });
    decl.cloneBefore({
      prop: `${prefix}${sides[1]}`,
      value: values[1] ?? values[0],
    });
    decl.remove();
    return true;
  }
  if (decl.prop === 'inset') {
    const [top, right = top, bottom = top, left = right] = splitSpaces(
      decl.value
    );
    if (top === undefined) return false;
    for (const [prop, value] of [
      ['top', top],
      ['right', right],
      ['bottom', bottom],
      ['left', left],
    ] as const) {
      decl.cloneBefore({ prop, value });
    }
    decl.remove();
    return true;
  }
  return false;
}

/** Tailwind's default breakpoints, for the responsive direction classes.
 *  scripts/__tests__/legacy-css.test.ts checks these against
 *  `--breakpoint-*` in tailwindcss/theme.css and the app's theme. */
export const BREAKPOINTS: ReadonlyArray<readonly [string, string]> = [
  ['sm', '40rem'],
  ['md', '48rem'],
  ['lg', '64rem'],
  ['xl', '80rem'],
  ['2xl', '96rem'],
];

/** Every direction context, and where a gap container is not a grid. */
interface FlexLayout {
  contexts: FlexContext[];
  grids: GridScope[];
}

/** Where a flex container's direction is known from its classes. */
interface FlexContext {
  /** Appended to the gap utility's selector. */
  match: string;
  /** Extra media condition, for a direction that changes at a breakpoint. */
  media?: string;
  axis: 'row' | 'column';
  reverse?: boolean;
  /** Plain rows also get the wrapping variant. */
  wraps?: boolean;
}

/** The direction contexts this stylesheet can tell apart: rows (no
 *  `flex-col` anywhere in the class list), columns (`flex-col` with no
 *  responsive row), and each responsive switch the CSS actually contains
 *  (`sm:flex-row`, `max-sm:flex-col`, ...), split at its breakpoint. */
function flexContexts(root: Root): FlexLayout {
  const classes = new Set<string>();
  root.walkRules((rule) => {
    for (const s of rule.selectors) {
      const m =
        /^\.((?:max-)?[\w]+)\\:(flex-(?:row|row-reverse|col)|(?:inline-)?grid)$/.exec(
          s.trim()
        );
      if (m) classes.add(`${m[1]}:${m[2]}`);
    }
  });
  const contexts: FlexContext[] = [
    {
      match:
        '[class*=flex]:not([class*=flex-col]):not([class*=":flex-row"]):not([class*=flex-row-reverse])',
      axis: 'row',
      wraps: true,
    },
    { match: '.flex-col:not([class*=":flex-row"])', axis: 'column' },
  ];
  for (const [bp, width] of BREAKPOINTS) {
    const below = `not all and (min-width:${width})`;
    const above = `(min-width:${width})`;
    for (const reverse of [false, true]) {
      const cls = `${bp}:flex-row${reverse ? '-reverse' : ''}`;
      if (!classes.has(cls)) continue;
      const match = reverse
        ? `.flex-col[class*="${cls}"]`
        : `.flex-col[class*="${cls}"]:not([class*="${cls}-reverse"])`;
      contexts.push({ match, media: below, axis: 'column' });
      contexts.push({
        match,
        media: above,
        axis: 'row',
        reverse,
        wraps: !reverse,
      });
    }
    if (classes.has(`max-${bp}:flex-col`)) {
      const match = `[class*=flex]:not(.flex-col)[class*="max-${bp}:flex-col"]`;
      contexts.push({ match, media: below, axis: 'column' });
      contexts.push({ match, media: above, axis: 'row', wraps: true });
    }
  }
  return { contexts, grids: gridScopes(classes) };
}

/** Where a gap container is not a grid. A grid (`grid`, `inline-grid`) has
 *  native gap, so it is excluded at every width. A responsive grid
 *  (`sm:grid`) is still flex below its breakpoint, so it gets the emulation
 *  there, inside a `max-width` query, and nowhere above. */
interface GridScope {
  match: string;
  media?: string;
  /** The breakpoint in rem below which `media` holds. */
  belowRem?: number;
}

function gridScopes(classes: ReadonlySet<string>): GridScope[] {
  const responsive = BREAKPOINTS.flatMap(([bp, width]) =>
    ['grid', 'inline-grid']
      .filter((g) => classes.has(`${bp}:${g}`))
      .map((g) => ({ token: `${bp}:${g}`, width }))
  );
  const notGrid = ':not(.grid):not(.inline-grid)';
  const scopes: GridScope[] = [
    {
      match:
        notGrid +
        responsive.map(({ token }) => `:not([class~="${token}"])`).join(''),
    },
  ];
  responsive.forEach(({ token, width }, i) => {
    // Smaller responsive grids are excluded, so the narrowest one decides.
    const smaller = responsive
      .slice(0, i)
      .map((r) => `:not([class~="${r.token}"])`)
      .join('');
    scopes.push({
      match: `${notGrid}${smaller}[class~="${token}"]`,
      media: `not all and (min-width:${width})`,
      belowRem: Number.parseFloat(width),
    });
  });
  return scopes;
}

/** Flex `gap` arrived in Chrome 84, so on Chromium 80 every flex row built
 *  with `gap-*` collapses. This emulates it with margins on the children, in
 *  the containers whose classes settle the direction (`flexContexts`).
 *  Grids (which have had `gap` since Chrome 66) are left alone. The rules go
 *  in the `components` layer, below the utilities, so a margin utility on an
 *  element still wins over the emulated one.
 *
 *  Margins trail (`:not(:last-child)`), so a hidden leading child, such as a
 *  separator shown only at a breakpoint, leaves no stray gap. A bare text
 *  node cannot take a margin, so an icon that is the only element child
 *  (`<svg/> Label`) gets one on its own. Wrapping rows use the pre-`gap`
 *  negative-margin technique, so every line starts flush.
 *
 *  Browsers with flex gap but no `@layer` (Chrome 84-98, Firefox 63-96,
 *  Safari 14.1-15.3) also load this stylesheet. Every rule here is scoped to
 *  `[data-lc-nogap]`, which the loader sets only after a failed gap probe, so
 *  they keep their native gap and get no margins on top. */
function emulateFlexGap(): Plugin {
  return {
    postcssPlugin: 'legacy-css-flex-gap',
    Once(root) {
      const { contexts, grids } = flexContexts(root);
      const out = postcss.atRule({ name: 'layer', params: 'components' });
      root.walkRules((rule) => {
        let row: string | undefined;
        let column: string | undefined;
        rule.each((node) => {
          if (node.type !== 'decl') return;
          if (node.prop === 'gap') {
            const [r, c] = splitSpaces(node.value);
            row = r;
            column = c ?? r;
          } else if (node.prop === 'row-gap') row = node.value;
          else if (node.prop === 'column-gap') column = node.value;
        });
        if (row === undefined && column === undefined) return;

        let parent: Container = out;
        for (const condition of conditions(rule)) {
          const clone = condition.clone({ nodes: [] });
          parent.append(clone);
          parent = clone;
        }
        // A gap utility inside `(min-width: X)` never meets a responsive
        // grid scope that ends at or below X.
        const minRem = Math.max(
          0,
          ...conditions(rule).map((c) =>
            Number.parseFloat(
              /^\(min-width:([\d.]+)rem\)$/.exec(c.params)?.[1] ?? '0'
            )
          )
        );
        for (const grid of grids) {
          if (grid.belowRem !== undefined && grid.belowRem <= minRem) continue;
          let scope: Container = parent;
          if (grid.media) {
            const media = postcss.atRule({ name: 'media', params: grid.media });
            parent.append(media);
            scope = media;
          }
          const base = rule.selectors.map(
            (s) => `[${NO_FLEX_GAP_ATTR}] ${s}${grid.match}`
          );
          for (const context of contexts) {
            // Below a responsive grid's breakpoint only the plain row and
            // column contexts apply; one element switching both display and
            // direction is not worth doubling the stylesheet for.
            if (grid.media && context.media) continue;
            const rules: Rule[] = [];
            const add = (
              match: string,
              child: string,
              prop: string,
              value: string
            ) =>
              rules.push(
                postcss.rule({
                  selectors: base.map((s) => `${s}${match}${child}`),
                  nodes: [postcss.decl({ prop, value })],
                })
              );
            const { match } = context;
            if (context.axis === 'column' && row !== undefined) {
              add(match, '>:not(:last-child)', 'margin-bottom', row);
            }
            if (context.axis === 'row' && column !== undefined) {
              const nowrap = context.wraps
                ? `${match}:not([class*=flex-wrap])`
                : match;
              const side = context.reverse ? 'margin-left' : 'margin-right';
              add(nowrap, '>:not(:last-child)', side, column);
              if (!context.reverse)
                add(nowrap, '>svg:only-child', side, column);
              if (context.wraps) {
                const wrap = `${match}[class*=flex-wrap]`;
                add(wrap, '', 'margin-left', `calc(-1 * ${column})`);
                add(wrap, '>*', 'margin-left', column);
              }
            }
            if (context.axis === 'row' && context.wraps && row !== undefined) {
              const wrap = `${match}[class*=flex-wrap]`;
              add(wrap, '', 'margin-top', `calc(-1 * ${row})`);
              add(wrap, '>*', 'margin-top', row);
            }
            if (rules.length === 0) continue;
            if (context.media) {
              scope.append(
                postcss.atRule({
                  name: 'media',
                  params: context.media,
                  nodes: rules,
                })
              );
            } else {
              scope.append(...rules);
            }
          }
        }
      });
      if (out.nodes?.length) root.append(out);
    },
  };
}

/** `:where(x)` -> `:is(x)`, which postcss-is-pseudo-class then expands. The
 *  selector gets the specificity of `x` rather than zero, which cascade-layer
 *  flattening (applied after) absorbs between layers. */
function whereToIs(): Plugin {
  const rename = selectorParser((selectors) => {
    selectors.walkPseudos((pseudo) => {
      if (pseudo.value === ':where') pseudo.value = ':is';
    });
  });
  return {
    postcssPlugin: 'legacy-css-where',
    Rule(rule) {
      if (rule.selector.includes(':where(')) {
        rule.selector = rename.processSync(rule.selector);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Selector lists

/** Pseudo-classes and -elements Chromium 80 parses. `-webkit-` ones pass. */
const SUPPORTED_PSEUDOS = new Set([
  ':active',
  ':any-link',
  ':checked',
  ':default',
  ':defined',
  ':disabled',
  ':empty',
  ':enabled',
  ':first',
  ':first-child',
  ':first-of-type',
  ':focus',
  ':focus-within',
  ':fullscreen',
  ':host',
  ':hover',
  ':in-range',
  ':indeterminate',
  ':invalid',
  ':lang',
  ':last-child',
  ':last-of-type',
  ':link',
  ':not',
  ':nth-child',
  ':nth-last-child',
  ':nth-last-of-type',
  ':nth-of-type',
  ':only-child',
  ':only-of-type',
  ':optional',
  ':out-of-range',
  ':placeholder-shown',
  ':read-only',
  ':read-write',
  ':required',
  ':root',
  ':scope',
  ':target',
  ':valid',
  ':visited',
  ':after',
  ':before',
  ':first-letter',
  ':first-line',
  '::after',
  '::backdrop',
  '::before',
  '::first-letter',
  '::first-line',
  '::part',
  '::placeholder',
  '::selection',
  '::slotted',
]);

function supportedByLegacy(selector: string): boolean {
  let ok = true;
  selectorParser((selectors) => {
    selectors.walkPseudos((pseudo) => {
      const name = pseudo.value.toLowerCase();
      if (/^::?-webkit-/.test(name)) return;
      if (!SUPPORTED_PSEUDOS.has(name)) ok = false;
      // Chromium 80's :not() takes one compound selector, nothing more.
      if (
        name === ':not' &&
        (pseudo.nodes.length > 1 ||
          pseudo.nodes.some((inner) =>
            inner.nodes.some((n) => n.type === 'combinator')
          ))
      ) {
        ok = false;
      }
    });
  }).processSync(selector);
  return ok;
}

/** `:not(:is(a, b))` and `:not(a, b)` -> `:not(a):not(b)`, for compound
 *  `a` and `b`. lightningcss writes the first when it lowers logical
 *  properties (`:not(:is(:lang(ar), ...))`), and Chromium 80's `:not()`
 *  takes a single compound selector. */
const lowerNotLists = selectorParser((selectors) => {
  selectors.walkPseudos((pseudo) => {
    if (pseudo.value !== ':not') return;
    const inner = pseudo.nodes.flatMap((selector) => {
      const only = selector.nodes.length === 1 ? selector.nodes[0] : undefined;
      return only?.type === 'pseudo' && only.value === ':is'
        ? only.nodes
        : [selector];
    });
    if (inner.length < 2) return;
    if (inner.some((s) => s.nodes.some((n) => n.type === 'combinator'))) {
      return;
    }
    pseudo.replaceWith(
      ...inner.map((s) =>
        selectorParser.pseudo({ value: ':not', nodes: [s.clone()] })
      )
    );
  });
});

function splitUnsupportedSelectors(): Plugin {
  return {
    postcssPlugin: 'legacy-css-split-selectors',
    Rule(rule) {
      if (rule.selector.includes(':not(')) {
        rule.selector = lowerNotLists.processSync(rule.selector);
      }
      const selectors = rule.selectors;
      if (selectors.length < 2) return;
      const good: string[] = [];
      const bad: string[] = [];
      for (const s of selectors) (supportedByLegacy(s) ? good : bad).push(s);
      if (bad.length === 0) return;
      for (const selector of bad) rule.cloneBefore({ selector });
      if (good.length > 0) rule.selectors = good;
      else rule.remove();
    },
  };
}
