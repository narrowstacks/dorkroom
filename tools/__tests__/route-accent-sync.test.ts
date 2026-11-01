import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as app from '../../packages/ui/src/lib/navigation';
import * as edge from '../../utils/routeMetadata';
import { contrastRatio, oklchToHex } from './oklch';

/**
 * Guards the edge copy of the page accents that colour the OG cards.
 *
 * `api/og.tsx` cannot import the tool manifest (React, lucide), and Satori
 * takes hex rather than the theme's oklch, so `utils/routeMetadata.ts` keeps
 * `ROUTE_ACCENT_TONES` (route to tone) and `ACCENT_TONE_HEX` (tone to the
 * dark theme's colour). This fails when either drifts from its source.
 */

const THEME_CSS = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../apps/dorkroom/src/styles/theme.css'
);
/** The OG card background (`BG` in api/og.tsx). */
const CARD_BACKGROUND = '#09090b';

/** `--accent-<tone>-text` values declared in the `[data-theme="dark"]` block. */
function darkAccentTexts(): Map<string, string> {
  const css = readFileSync(THEME_CSS, 'utf8');
  const start = css.indexOf('[data-theme="dark"] {');
  expect(start).toBeGreaterThanOrEqual(0);
  const block = css.slice(start, css.indexOf('\n}', start));
  const tones = new Map<string, string>();
  for (const [, tone, l, c, h] of block.matchAll(
    /--accent-(\w+)-text:\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g
  )) {
    tones.set(tone, oklchToHex(Number(l), Number(c), Number(h)));
  }
  return tones;
}

describe('page accent parity (utils/ vs the tool manifest and theme.css)', () => {
  it('gives every page the tone its manifest entry has', () => {
    const manifest = Object.fromEntries(
      app.homeToolCards.map((card) => [card.href, card.accent])
    );
    expect({ ...edge.ROUTE_ACCENT_TONES }).toEqual(manifest);
    for (const card of app.homeToolCards) {
      expect(app.getRouteAccent(card.href)).toBe(card.accent);
    }
  });

  it('matches the dark theme colour of every tone', () => {
    const theme = darkAccentTexts();
    expect([...theme.keys()].sort()).toEqual(
      Object.keys(edge.ACCENT_TONE_HEX).sort()
    );
    expect(Object.fromEntries(theme)).toEqual({ ...edge.ACCENT_TONE_HEX });
  });

  it('keeps every tone readable on the dark card (WCAG AA, 4.5:1)', () => {
    for (const hex of Object.values(edge.ACCENT_TONE_HEX)) {
      expect(contrastRatio(hex, CARD_BACKGROUND)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
