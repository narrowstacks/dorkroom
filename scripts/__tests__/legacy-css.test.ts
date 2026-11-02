import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { es5SyntaxProblem } from '../../apps/dorkroom/es5-syntax';
import {
  BREAKPOINTS,
  buildLegacyCss,
  KINDLE_UA_SOURCE,
  LEGACY_BROWSER_ATTR,
  legacyCssFileName,
  legacyCssLeftovers,
  legacyCssLoader,
  legacyCssProblem,
  NO_MOTION_CSS,
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

  describe('composes lowered transforms with Tailwind utilities', () => {
    const utilities = [
      '.transform{transform:var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}',
      '.translate-x-4{--tw-translate-x:1rem;translate:var(--tw-translate-x) var(--tw-translate-y)}',
      '.translate-x-6{--tw-translate-x:1.5rem;translate:var(--tw-translate-x) var(--tw-translate-y)}',
      '.-translate-x-1\\/2{--tw-translate-x:calc(calc(1 / 2 * 100%) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}',
      '.-translate-y-1\\/2{--tw-translate-y:calc(calc(1 / 2 * 100%) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}',
      '.rotate-45{rotate:45deg}',
    ].join('');
    // Layer flattening adds :not(#\#) boosts; they are not what is tested.
    const unboosted = (css: string) => css.replaceAll(':not(#\\#)', '');
    const COMPOSED = 'var(--lc-translate) var(--lc-rotate) var(--lc-scale)';

    it('keeps translate when .transform comes later (transform translate-x-6)', async () => {
      const out = unboosted(await legacy(utilities));
      expect(out).toContain(
        `.transform{transform:${COMPOSED} var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}`
      );
      expect(out).toMatch(
        /\.translate-x-6\{[^}]*--lc-translate:translate\(var\(--tw-translate-x\),var\(--tw-translate-y\)\)/
      );
    });

    it('combines both negative halves through the shared variables', async () => {
      const out = unboosted(await legacy(utilities));
      // Each axis sets its own --tw-translate-*, and both rules write the same
      // translate(x, y), so -translate-x-1/2 -translate-y-1/2 centre together.
      expect(out).toMatch(
        /\.-translate-x-1\\\/2\{--tw-translate-x:[^;]+;--lc-translate:translate\(var\(--tw-translate-x\),var\(--tw-translate-y\)\);transform:var\(--lc-translate\)/
      );
      expect(out).toMatch(
        /\.-translate-y-1\\\/2\{--tw-translate-y:[^;]+;--lc-translate:translate\(var\(--tw-translate-x\),var\(--tw-translate-y\)\)/
      );
    });

    it('keeps translate and rotate apart (translate-x-4 rotate-45)', async () => {
      const out = unboosted(await legacy(utilities));
      expect(out).toContain(
        `.rotate-45{--lc-rotate:rotate(45deg);transform:${COMPOSED}}`
      );
      expect(out).toMatch(/\.translate-x-4\{[^}]*--lc-translate:translate\(/);
      expect(out).toContain('--lc-rotate:rotate(0)');
    });

    it('leaves a standalone transform alone', async () => {
      const out = await legacy('.skip{transform:translateY(-150%)}');
      expect(out).toContain('.skip{transform:translateY(-150%)}');
    });
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
      /\[data-lc-nogap\] \.gap-2:not\(\.grid\):not\(\.inline-grid\)\[class\*=flex\][^{]*>:not\(:last-child\)[^{]*\{margin-right:8px\}/
    );
    expect(out).toMatch(
      /\[data-lc-nogap\] \.gap-2:not\(\.grid\):not\(\.inline-grid\)\.flex-col[^{]*>:not\(:last-child\)\{margin-bottom:8px\}/
    );
  });

  it('emulates gap on a responsive grid only below its breakpoint', async () => {
    const out = await legacy(
      '.gap-1{gap:2px}@media (min-width:40rem){.sm\\:grid{display:grid}}'
    );
    // Outside any query, a container with sm:grid is excluded...
    expect(out).toMatch(
      /\.gap-1:not\(\.grid\):not\(\.inline-grid\):not\(\[class~=sm\\:grid\]\)/
    );
    // ...and below sm it gets the column margins.
    expect(out).toMatch(
      /@media not all and \(min-width:40rem\)\{[^@]*\[class~=sm\\:grid\]\.flex-col[^{]*>:not\(:last-child\)\{margin-bottom:2px\}/
    );
  });

  it('wraps a row that becomes a row at a breakpoint', async () => {
    const out = await legacy(
      '.gap-y-1{row-gap:4px}@media (min-width:40rem){.sm\\:flex-row{flex-direction:row}}'
    );
    expect(out).toMatch(
      /@media \(min-width:40rem\)\{[^@]*\.flex-col\[class\*=sm\\:flex-row\][^{]*\[class\*=flex-wrap\]>\*\{margin-top:4px\}/
    );
  });

  it('splits selector lists that Chromium 80 cannot parse together', async () => {
    const out = await legacy('.a,.b:has(.c),.d:focus-visible{color:red}');
    expect(out).toMatch(/(^|\})\.a[^,{]*\{color:red\}/);
    expect(out).toMatch(/\.b:has\(\.c\)[^,{]*\{color:red\}/);
    expect(out).toMatch(/\.d:focus-visible[^,{]*\{color:red\}/);
  });
});

describe('no-motion override (issue #637)', () => {
  it('is the last thing in the legacy stylesheet', async () => {
    const { css } = await buildLegacyCss('a{color:red}');
    expect(css.endsWith(NO_MOTION_CSS)).toBe(true);
  });

  it('finishes animations instantly and drops transitions and smooth scroll', () => {
    expect(NO_MOTION_CSS).toMatch(/^\*,\*::before,\*::after\{/);
    for (const decl of [
      'animation-duration:0s!important',
      'animation-delay:0s!important',
      'animation-iteration-count:1!important',
      'transition:none!important',
      'scroll-behavior:auto!important',
    ]) {
      expect(NO_MOTION_CSS).toContain(decl);
    }
    // `animation: none` would leave fill-mode end states and animationend out.
    expect(NO_MOTION_CSS).not.toMatch(/animation:\s*none/);
  });

  it('is not in the legacy output only by accident of the forbidden checks', async () => {
    const { css } = await buildLegacyCss('a{color:red}');
    expect(legacyCssProblem(css)).toBeUndefined();
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

describe('legacy browser marker', () => {
  it('is set by the loader, in the legacy branch only', () => {
    const script = legacyCssLoader('/a.css', '/b.css');
    expect(script).toContain('setAttribute("data-lc-legacy","")');
    expect(script.indexOf('data-lc-legacy')).toBeGreaterThan(
      script.indexOf('CSSLayerBlockRule||')
    );
  });

  it('themes a Kindle high contrast before first paint, in ES5', () => {
    const script = legacyCssLoader('/a.css', '/b.css');
    expect(es5SyntaxProblem(script)).toBeUndefined();
    expect(script).toContain(
      `${KINDLE_UA_SOURCE}.test(navigator.userAgent)&&e.setAttribute("data-theme","high-contrast")`
    );
  });

  it('uses the Kindle pattern isEInkDevice uses', () => {
    const source = readFileSync(
      join(__dirname, '../../packages/ui/src/lib/themes.ts'),
      'utf8'
    );
    expect(source).toContain(KINDLE_UA_SOURCE.slice(1, -1));
  });

  it('matches the attribute the UI package reads', () => {
    const source = readFileSync(
      join(__dirname, '../../packages/ui/src/lib/motion.ts'),
      'utf8'
    );
    expect(source).toContain(`'${LEGACY_BROWSER_ATTR}'`);
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
