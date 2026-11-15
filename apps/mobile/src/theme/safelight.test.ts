import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACCENT, DIRECTION_COLOR } from './accents';
import {
  resolveAccentColor,
  resolveCommit,
  resolveDirection,
  resolveHue,
  resolveSelectionTint,
  resolveWarningLine,
  WARNING_LINE,
} from './resolve-accent';
import {
  contrastOnBlack,
  parseColor,
  RED_LEVEL,
  redLuminance,
  redOf,
  redOnly,
  SAFELIGHT,
  SAFELIGHT_HUE,
  SAFELIGHT_OVERLAY,
} from './safelight';
import {
  NORMAL_VAR_VALUES,
  rootVarValues,
  SAFELIGHT_TOKENS,
  SAFELIGHT_VAR_VALUES,
} from './safelight-tokens';

const VARS = new Map(Object.entries(SAFELIGHT_VAR_VALUES));
const NORMAL = new Map(Object.entries(NORMAL_VAR_VALUES));
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (file: string) => readFileSync(`${ROOT}/${file}`, 'utf8');

/** The red channel of any colour string the palette produces. */
function redChannel(colour: string): number {
  const parsed = parseColor(colour);
  if (parsed === null) throw new Error(`unparseable colour: ${colour}`);
  const [r, , , a] = parsed;
  return r * a;
}

describe('palette helpers', () => {
  it('redOf builds a pure red and clamps', () => {
    expect(redOf(200)).toBe('rgb(200, 0, 0)');
    expect(redOf(999)).toBe('rgb(255, 0, 0)');
    expect(redOf(-4)).toBe('rgb(0, 0, 0)');
  });

  it('redOnly keeps the red channel, which is all the overlay lets through', () => {
    expect(redOnly([45, 212, 191])).toBe(45);
  });

  it('parses hex and rgb(a) colours', () => {
    expect(parseColor('#2dd4bf')).toEqual([45, 212, 191, 1]);
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColor('rgba(255,255,255,0.5)')).toEqual([255, 255, 255, 0.5]);
    expect(parseColor('transparent')).toBeNull();
  });

  it('the overlay is pure red', () => {
    expect(SAFELIGHT_OVERLAY).toBe('#ff0000');
  });

  it('every palette colour is a pure red (no green or blue to begin with)', () => {
    for (const [name, value] of Object.entries(SAFELIGHT)) {
      if (name === 'background') continue;
      const parsed = parseColor(value);
      expect(parsed, name).not.toBeNull();
      expect(parsed?.[1], `${name} green`).toBe(0);
      expect(parsed?.[2], `${name} blue`).toBe(0);
    }
  });
});

describe('contrast after the multiply overlay (red luminance only)', () => {
  it('reports the numbers', () => {
    const table = {
      primary: contrastOnBlack(RED_LEVEL.primary),
      secondary: contrastOnBlack(RED_LEVEL.secondary),
      tertiary: contrastOnBlack(RED_LEVEL.tertiary),
      faint: contrastOnBlack(RED_LEVEL.faint),
    };
    expect(table.primary).toBeGreaterThan(table.secondary);
  });

  it('primary and secondary text reach 4.5:1 on black', () => {
    expect(contrastOnBlack(RED_LEVEL.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnBlack(RED_LEVEL.secondary)).toBeGreaterThanOrEqual(4.5);
  });

  it('red luminance tops out at 0.2126, so 5.25:1 is the ceiling', () => {
    expect(redLuminance(255)).toBeCloseTo(0.2126, 4);
    expect(contrastOnBlack(255)).toBeCloseTo(5.252, 2);
  });

  it('is monotonic in the red level', () => {
    const levels = [
      RED_LEVEL.faint,
      RED_LEVEL.tertiary,
      RED_LEVEL.secondary,
      RED_LEVEL.primary,
    ];
    for (let i = 1; i < levels.length; i++) {
      expect(contrastOnBlack(levels[i] ?? 0)).toBeGreaterThan(
        contrastOnBlack(levels[i - 1] ?? 0)
      );
    }
  });
});

describe('red-channel brightness of every colour used under the mode', () => {
  it('text roles are bright enough to read, in order', () => {
    expect(redChannel(SAFELIGHT.text)).toBe(255);
    expect(redChannel(SAFELIGHT.textSecondary)).toBeGreaterThanOrEqual(230);
    expect(redChannel(SAFELIGHT.textTertiary)).toBeGreaterThanOrEqual(150);
    expect(redChannel(SAFELIGHT.textFaint)).toBeGreaterThanOrEqual(100);
  });

  const levelOf = (name: string) => redChannel(VARS.get(name) ?? '');

  it('body and label text (ink 80 to 50, ok) is at least secondary', () => {
    for (const name of [
      '--sl-ink-80',
      '--sl-ink-70',
      '--sl-ink-60',
      '--sl-ink-55',
      '--sl-ink-50',
      '--sl-ok',
    ]) {
      expect(levelOf(name), name).toBeGreaterThanOrEqual(RED_LEVEL.secondary);
    }
    expect(
      contrastOnBlack(levelOf('--sl-ink-60')),
      'ink-60 reaches 4.5:1'
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('anything readable (ink 45 and 40, selected and paper ink) is at least tertiary', () => {
    for (const name of [
      '--sl-ink-45',
      '--sl-ink-40',
      '--sl-selected-ink',
      '--sl-paper-ink',
    ]) {
      expect(levelOf(name), name).toBeGreaterThanOrEqual(RED_LEVEL.tertiary);
    }
  });

  it('faint is decoration only (ink-30 chevrons)', () => {
    expect(levelOf('--sl-ink-30')).toBe(RED_LEVEL.faint);
    for (const name of [
      '--sl-ink-80',
      '--sl-ink-70',
      '--sl-ink-60',
      '--sl-ink-55',
      '--sl-ink-50',
      '--sl-ink-45',
      '--sl-ink-40',
    ]) {
      expect(levelOf(name), name).toBeGreaterThan(RED_LEVEL.faint);
    }
  });

  it('fills are dim: no large area is brighter than the commit fill', () => {
    expect(levelOf('--sl-paper')).toBeLessThanOrEqual(RED_LEVEL.commitFill);
    for (const name of [
      '--sl-surface',
      '--sl-surface-dim',
      '--sl-surface-inset',
      '--sl-surface-strong',
      '--sl-selected',
    ]) {
      expect(VARS.get(name), name).toBe('transparent');
    }
  });

  it('the easel diagram matches the Border preview: dim paper, black print area', () => {
    expect(VARS.get('--sl-easel-paper')).toBe(VARS.get('--sl-paper'));
    expect(VARS.get('--sl-easel-print')).toBe(VARS.get('--sl-paper-print'));
  });

  it('the Border and Mat drawings have clear steps: black image area and window, dim paper, outlined edges', () => {
    expect(VARS.get('--sl-paper-print')).toBe('#000000');
    expect(VARS.get('--sl-window')).toBe('#000000');
    expect(levelOf('--sl-paper')).toBeGreaterThanOrEqual(60);
    expect(levelOf('--sl-line')).toBeGreaterThan(levelOf('--sl-paper'));
  });

  it('outlines are visible against black', () => {
    expect(redChannel(SAFELIGHT.outline)).toBeGreaterThanOrEqual(100);
    expect(redChannel(SAFELIGHT.outlineSelected)).toBeGreaterThan(
      redChannel(SAFELIGHT.outline)
    );
  });

  it('shows why the palette is not left to the multiply alone: teal and blue vanish', () => {
    expect(redOnly([45, 212, 191])).toBeLessThan(100); // ACCENT.teal
    expect(redChannel(DIRECTION_COLOR.down)).toBeLessThan(100);
    expect(redChannel(SAFELIGHT_HUE)).toBe(255);
  });

  it('every safelight colour is a pure red or transparent (no green or blue)', () => {
    for (const [name, value] of VARS) {
      if (value === 'transparent' || name === '--sl-bw') continue;
      const parsed = parseColor(value);
      expect(parsed, name).not.toBeNull();
      expect(parsed?.[1], `${name} green`).toBe(0);
      expect(parsed?.[2], `${name} blue`).toBe(0);
    }
  });
});

describe('hue resolution under safelight', () => {
  const accents = ['yellow', 'teal', 'rose'] as const;

  it.each(accents)('%s resolves to the one safelight red', (accent) => {
    expect(resolveAccentColor(accent, true)).toBe(SAFELIGHT_HUE);
    expect(resolveAccentColor(accent, false)).toBe(ACCENT[accent]);
  });

  it('a phase hue is the safelight red, and neutral white outside a phase when off', () => {
    expect(resolveHue('teal', true)).toBe(SAFELIGHT_HUE);
    expect(resolveHue(null, true)).toBe(SAFELIGHT_HUE);
    expect(resolveHue(null, false)).toBe('#ffffff');
    expect(resolveHue('rose', false)).toBe(ACCENT.rose);
  });

  it('selection is a dim fill, a brighter outline and bright text, never a slab', () => {
    for (const accent of [...accents, null]) {
      const tint = resolveSelectionTint(accent, true);
      expect(tint.backgroundColor).toBe(SAFELIGHT.commitFill);
      expect(redChannel(tint.backgroundColor)).toBeLessThanOrEqual(
        RED_LEVEL.commitFill
      );
      expect(redChannel(tint.borderColor)).toBeGreaterThan(
        redChannel(tint.idle.borderColor)
      );
      expect(tint.borderColor).toBe(SAFELIGHT.outlineSelected);
      expect(tint.color).toBe(SAFELIGHT.text);
      expect(tint.idle.backgroundColor).toBe('transparent');
    }
  });

  it('off, selection is the existing tinted glass', () => {
    const tint = resolveSelectionTint('teal', false);
    expect(tint.color).toBe(ACCENT.teal);
    expect(tint.backgroundColor).not.toBe('transparent');
  });

  it('a commit button is a dim fill, an outline and bright text under safelight', () => {
    for (const accent of [...accents, null]) {
      const commit = resolveCommit(accent, true);
      expect(
        redChannel(String(commit.fill.backgroundColor))
      ).toBeLessThanOrEqual(RED_LEVEL.commitFill);
      expect(commit.fill.borderWidth).toBe(1);
      expect(commit.label.color).toBe(SAFELIGHT.text);
      expect(commit.ink).toBe(SAFELIGHT.text);
    }
  });

  it('a commit button is unchanged when off', () => {
    expect(resolveCommit('teal', false)).toEqual({
      fill: { backgroundColor: ACCENT.teal },
      label: { color: '#0b0b0c' },
      ink: '#0b0b0c',
    });
  });

  it('direction colours collapse to one red under safelight and are the data colours off', () => {
    expect(resolveDirection(true)).toEqual({
      up: SAFELIGHT_HUE,
      down: SAFELIGHT_HUE,
    });
    expect(resolveDirection(false)).toEqual(DIRECTION_COLOR);
  });
});

describe('the semantic tokens stay in step across the files', () => {
  const css = read('global.css');
  const config = read('tailwind.config.js');
  const cssDeclared = new Map(
    [...css.matchAll(/(--sl-[\w-]+):\s*([^;]+);/g)].map((m) => [
      m[1] ?? '',
      (m[2] ?? '').trim(),
    ])
  );

  it('global.css declares exactly the normal values of the table', () => {
    expect([...cssDeclared.keys()].sort()).toEqual(
      Object.keys(SAFELIGHT_TOKENS).sort()
    );
    for (const [name, value] of NORMAL) {
      expect(cssDeclared.get(name), name).toBe(value);
    }
  });

  it('both modes define every token (a vars() style is passed in both)', () => {
    expect([...VARS.keys()].sort()).toEqual([...NORMAL.keys()].sort());
  });

  it('every colour token has a class in tailwind.config.js', () => {
    for (const name of NORMAL.keys()) {
      if (name === '--sl-bw') continue;
      expect(config, name).toContain(`var(${name})`);
    }
    expect(config).toContain('var(--sl-bw)');
  });

  it('normal mode draws no hairline', () => {
    expect(NORMAL.get('--sl-bw')).toBe('0px');
    expect(NORMAL.get('--sl-line')).toBe('transparent');
  });

  // The token values are locked to the Tailwind colours they replaced, so
  // normal mode is pixel-identical to before the tokens existed.
  const white = (a: number) => `rgba(255, 255, 255, ${a})`;
  it.each([
    ['--sl-ink-80', white(0.8)],
    ['--sl-ink-70', white(0.7)],
    ['--sl-ink-60', white(0.6)],
    ['--sl-ink-55', white(0.55)],
    ['--sl-ink-50', white(0.5)],
    ['--sl-ink-45', white(0.45)],
    ['--sl-ink-40', white(0.4)],
    ['--sl-ink-30', white(0.3)],
    ['--sl-surface-dim', white(0.05)],
    ['--sl-surface', white(0.1)],
    ['--sl-surface-inset', white(0.07)],
    ['--sl-surface-strong', white(0.2)],
    ['--sl-edge-faint', white(0.05)],
    ['--sl-edge', white(0.1)],
    ['--sl-edge-15', white(0.15)],
    ['--sl-edge-strong', white(0.2)],
    ['--sl-edge-30', white(0.3)],
    ['--sl-selected', '#ffffff'],
    ['--sl-selected-ink', '#0b0b0c'],
    ['--sl-paper', '#a3a3a3'], // neutral-400
    ['--sl-paper-print', '#404040'], // neutral-700
    ['--sl-paper-ink', 'rgba(0, 0, 0, 0.7)'], // black/70
    ['--sl-window', '#161618'],
    ['--sl-easel-paper', white(0.9)], // bg-white/90
    ['--sl-easel-print', '#3f3f46'], // zinc-700
    ['--sl-ok', '#6ee7b7'], // emerald-300
  ])('normal %s is the old Tailwind value %s', (name, value) => {
    expect(NORMAL.get(name)).toBe(value);
  });
});

describe('SafelightRoot always passes a vars() style (B1 regression)', () => {
  // react-native-css-interop remounts a component the first time a vars()
  // style appears on it, which would reset every screen the first time the
  // mode is switched on. So the root must pass one in BOTH modes.
  it('rootVarValues is never nullish and carries every token in both modes', () => {
    const keys = Object.keys(SAFELIGHT_TOKENS).sort();
    for (const on of [false, true]) {
      const values = rootVarValues(on);
      expect(values).toBeTruthy();
      expect(Object.keys(values).sort()).toEqual(keys);
      for (const value of Object.values(values)) {
        expect(value.length).toBeGreaterThan(0);
      }
    }
    expect(rootVarValues(false)).toBe(NORMAL_VAR_VALUES);
    expect(rootVarValues(true)).toBe(SAFELIGHT_VAR_VALUES);
  });

  const vars = read('src/theme/safelight-vars.ts');

  it('the vars module chooses between exactly two vars() styles', () => {
    expect(vars).toContain('vars(NORMAL_VAR_VALUES)');
    expect(vars).toContain('vars(SAFELIGHT_VAR_VALUES)');
    expect(vars.match(/=\s*vars\(/g)?.length).toBe(2);
    expect(vars).toMatch(/return on \? SAFELIGHT_VARS : NORMAL_VARS;/);
  });

  it('the root passes rootVarsStyle(on) unconditionally', () => {
    const root = read('src/components/safelight/safelight-overlay.tsx');
    expect(root).toContain('rootVarsStyle(on)');
    expect(root).not.toMatch(/from 'nativewind'/);
  });

  it('no file but the vars module uses NORMAL_VARS or SAFELIGHT_VARS, or calls vars()', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(`${ROOT}/${dir}`, {
        withFileTypes: true,
      })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith('.test.ts')) {
          continue;
        }
        if (path === 'src/theme/safelight-vars.ts') continue;
        const text = read(path);
        const usesConstant = /\b(?:NORMAL|SAFELIGHT)_VARS\b/.test(text);
        const callsVars =
          /from 'nativewind'/.test(text) && /\bvars\(/.test(text);
        if (usesConstant || callsVars) offenders.push(path);
      }
    };
    walk('src');
    walk('app');
    expect(offenders).toEqual([]);
  });
});

describe('resolveWarningLine', () => {
  it('is amber normally and a red outline under safelight', () => {
    expect(resolveWarningLine(false)).toBe(WARNING_LINE);
    expect(resolveWarningLine(true)).toBe(SAFELIGHT.outlineSelected);
  });
});
