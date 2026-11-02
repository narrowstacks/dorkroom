import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { es5SyntaxProblem } from '../../apps/dorkroom/es5-syntax';
import {
  BREAKPOINTS,
  buildLegacyCss,
  legacyCssFileName,
  legacyCssLeftovers,
  legacyCssLoader,
  legacyCssProblem,
} from '../../apps/dorkroom/legacy-css';

async function legacy(css: string): Promise<string> {
  return (await buildLegacyCss(css)).css;
}

describe('buildLegacyCss', () => {
  it('flattens cascade layers and keeps their order', async () => {
    const out = await legacy(
      '@layer base{a{color:red}}@layer utilities{.x{color:blue}}'
    );
    expect(legacyCssProblem(out)).toBeUndefined();
    // The later layer's rule carries more specificity than the earlier one.
    const boosts = (selector: string) =>
      (new RegExp(`${selector}((?::not\\(#\\\\#\\))*)`).exec(out)?.[1] ?? '')
        .length;
    expect(boosts('\\.x')).toBeGreaterThan(boosts('a'));
  });

  it('resolves color-mix() per theme', async () => {
    const { css, report } = await buildLegacyCss(
      [
        ':root{--c:#000}',
        '[data-theme=light]{--c:#fff}',
        '.a{background:color-mix(in srgb,var(--c) 50%,transparent)}',
      ].join('')
    );
    expect(css).not.toContain('color-mix(');
    expect(css).toMatch(/\.a[^{]*\{background:var\(--lc-0\)\}/);
    expect(css).toMatch(/:root[^{]*\{--lc-0:#00000080\}/);
    expect(css).toMatch(/\[data-theme=light\][^{]*\{--lc-0:#ffffff80\}/);
    expect(report).toMatchObject({ resolved: 1, dropped: [] });
  });

  it('resolves a mix inside a theme root in place', async () => {
    const out = await legacy(
      ':root{--c:red;--d:color-mix(in srgb,var(--c) 50%,white)}'
    );
    expect(out).not.toContain('color-mix(');
    expect(out).toMatch(/--d:#ff8080/);
  });

  it('unwraps @supports (color-mix) and drops mixes it cannot compute', async () => {
    const { css, report } = await buildLegacyCss(
      [
        ':root{--c:red}',
        '.a{color:red}',
        '@supports (color:color-mix(in lab,red,red)){',
        '.a{color:color-mix(in oklab,currentcolor 50%,transparent)}',
        '.b{color:color-mix(in oklab,var(--c) 50%,transparent)}',
        '}',
      ].join('')
    );
    expect(css).not.toContain('@supports');
    expect(css).toMatch(/\.a[^{]*\{color:red\}/);
    expect(css).toMatch(/\.b[^{]*\{color:var\(--lc-0\)\}/);
    expect(report.dropped).toHaveLength(1);
  });

  it('drops @property and lab() enhancement blocks', async () => {
    const out = await legacy(
      '@property --x{syntax:"*";inherits:false}.a{color:#f00}@supports (color:lab(0% 0 0)){.a{color:lab(50% 80 60)}}'
    );
    expect(out).not.toMatch(/@property|@supports|lab\(/);
  });

  it('lowers :where() and :is() selectors', async () => {
    const out = await legacy(
      '.x:is(:where(.group):hover *){color:red}:where(.s>:not(:last-child)){margin:0}'
    );
    expect(out).not.toMatch(/:is\(|:where\(/);
    expect(out).toContain('.group:hover');
    expect(out).toContain('.x');
  });

  it('lowers translate, scale and rotate to transform', async () => {
    const out = await legacy(
      '.t{--tw-translate-x:10px;translate:var(--tw-translate-x) var(--tw-translate-y)}.s{scale:105%}.r{rotate:180deg}'
    );
    expect(out).not.toMatch(/[{;](translate|scale|rotate):/);
    expect(out).toContain(
      '--lc-translate:translate(var(--tw-translate-x),var(--tw-translate-y))'
    );
    expect(out).toContain('--lc-scale:scale(1.05)');
    expect(out).toContain('--lc-rotate:rotate(180deg)');
    expect(out).toContain(
      'transform:var(--lc-translate) var(--lc-rotate) var(--lc-scale)'
    );
  });

  it('lowers dynamic viewport units and logical properties with var()', async () => {
    const out = await legacy(
      '.h{min-height:100dvh}.p{padding-inline:var(--s)}.i{inset:var(--s) 0}'
    );
    expect(out).toContain('min-height:100vh');
    expect(out).toMatch(/padding-left:var\(--s\);padding-right:var\(--s\)/);
    expect(out).not.toMatch(/padding-inline|[{;]inset:/);
    expect(out).toMatch(/top:var\(--s\)/);
  });

  it('emulates flex gap with margins', async () => {
    const out = await legacy('.gap-2{gap:8px}');
    expect(out).toMatch(
      /\[data-lc-nogap\] \.gap-2:not\(\[class\*=grid\]\)\[class\*=flex\][^{]*>:not\(:last-child\)[^{]*\{margin-right:8px\}/
    );
    expect(out).toMatch(
      /\[data-lc-nogap\] \.gap-2:not\(\[class\*=grid\]\)\.flex-col[^{]*>:not\(:last-child\)\{margin-bottom:8px\}/
    );
  });

  it('splits selector lists that Chromium 80 cannot parse together', async () => {
    const out = await legacy('.a,.b:has(.c),.d:focus-visible{color:red}');
    expect(out).toMatch(/(^|\})\.a[^,{]*\{color:red\}/);
    expect(out).toMatch(/\.b:has\(\.c\)[^,{]*\{color:red\}/);
    expect(out).toMatch(/\.d:focus-visible[^,{]*\{color:red\}/);
  });
});

describe('legacyCssProblem', () => {
  it('flags @layer and color-mix()', () => {
    expect(legacyCssProblem('@layer x{a{b:c}}')).toContain('@layer');
    expect(legacyCssProblem('a{color:color-mix(in srgb,red,blue)}')).toContain(
      'color-mix()'
    );
    expect(legacyCssProblem('a{color:red}')).toBeUndefined();
  });
});

describe('legacyCssLoader', () => {
  it('is an ES5 script that probes for cascade layers', () => {
    const script = legacyCssLoader(
      '/assets/index-abc.css',
      '/assets/index-legacy-def.css'
    );
    expect(es5SyntaxProblem(script)).toBeUndefined();
    expect(script).toContain('CSSLayerBlockRule');
    expect(script).toContain(
      'link[rel=stylesheet][href=\\"/assets/index-abc.css\\"]'
    );
    expect(script).toContain('removeChild(l)');
  });

  it('writes a parser-inserted, render-blocking link instead of changing href', () => {
    const script = legacyCssLoader('/a.css', '/a-legacy.css');
    expect(script).toContain(
      'd.write("<link rel=\\"stylesheet\\" href=\\"/a-legacy.css\\">")'
    );
    expect(script).not.toContain('.href=');
  });

  it('flags engines without flex gap', () => {
    expect(legacyCssLoader('/a.css', '/b.css')).toContain(
      'setAttribute("data-lc-nogap","")'
    );
  });
});

describe('legacyCssLeftovers', () => {
  it('counts constructs Chromium 80 ignores', () => {
    const counts = legacyCssLeftovers(
      'a:focus-visible{aspect-ratio:1}b:has(i){c:d}'
    );
    expect(counts.get(':focus-visible')).toBe(1);
    expect(counts.get('aspect-ratio')).toBe(1);
    expect(counts.get(':has()')).toBe(1);
  });
});

describe('BREAKPOINTS', () => {
  it("match Tailwind's breakpoints, which the app does not override", () => {
    const root = join(import.meta.dirname, '..', '..');
    const tailwind = readFileSync(
      join(root, 'node_modules/tailwindcss/theme.css'),
      'utf8'
    );
    const defaults = [
      ...tailwind.matchAll(/--breakpoint-([\w]+):\s*([^;]+);/g),
    ].map(([, name, value]) => [name, value?.trim()]);
    expect(BREAKPOINTS).toEqual(defaults);
    const appTheme = readFileSync(
      join(root, 'apps/dorkroom/src/styles/theme.css'),
      'utf8'
    );
    expect(appTheme).not.toMatch(/--breakpoint-/);
  });
});

describe('legacyCssFileName', () => {
  it('names the legacy copy after the original, hashed by content', () => {
    expect(legacyCssFileName('assets/index-AbC12.css', 'a{}')).toMatch(
      /^assets\/index-legacy-[\w-]{8}\.css$/
    );
    expect(legacyCssFileName('assets/index-AbC12.css', 'a{}')).not.toBe(
      legacyCssFileName('assets/index-AbC12.css', 'b{}')
    );
  });
});
