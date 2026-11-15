import { describe, expect, it } from 'vitest';
import { type Phase, PHASES } from '@/lib/tools';
import { backdropStyle } from './backdrop';
import { parseColor, SAFELIGHT } from './safelight';

const ALL: (Phase | null)[] = [null, ...PHASES.map((p) => p.id)];

/** The gradient's colour stops, in order. */
function glowStops(phase: Phase | null): string[] {
  const image = String(
    backdropStyle(phase, false).experimental_backgroundImage
  );
  return image.match(/rgba\([^)]*\)/g) ?? [];
}

describe('backdropStyle', () => {
  it('is true black with no glow under safelight, whatever the phase', () => {
    for (const phase of ALL) {
      expect(backdropStyle(phase, true)).toEqual({
        backgroundColor: SAFELIGHT.background,
      });
    }
  });

  it('gives each phase its own glow hue, distinct from the neutral one', () => {
    const hues = ALL.map((phase) => glowStops(phase)[0]);
    expect(new Set(hues).size).toBe(ALL.length);
  });

  it('fades out completely, so the glow has no visible edge', () => {
    for (const phase of ALL) {
      const stops = glowStops(phase).map((stop) => parseColor(stop));
      expect(stops).toHaveLength(2);
      expect(stops[0]?.[3]).toBeGreaterThan(0);
      expect(stops[1]?.[3]).toBe(0);
    }
  });

  it('gives the ellipse both radii (React Native drops it given one)', () => {
    for (const phase of ALL) {
      expect(backdropStyle(phase, false).experimental_backgroundImage).toMatch(
        /^radial-gradient\(ellipse \S+% \S+% at /
      );
    }
  });
});
