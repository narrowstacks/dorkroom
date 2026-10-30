import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PINNED_IDS,
  getTool,
  isPinnable,
  type Tool,
  TOOLS,
} from './tools';

describe('tool registry', () => {
  it('exposes a unique id for every tool', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default pins all resolve to real tools', () => {
    for (const id of DEFAULT_PINNED_IDS) {
      expect(getTool(id)).toBeDefined();
    }
  });

  it('includes the new ports and settings', () => {
    const ids = TOOLS.map((t: Tool) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['mat', 'lens', 'camera-exposure', 'settings'])
    );
  });

  it('getTool returns undefined for unknown ids', () => {
    expect(getTool('nope')).toBeUndefined();
  });
});

describe('isPinnable', () => {
  it('returns false for a comingSoon tool', () => {
    // No tool is a stub today; the flag stays for the next one.
    const stub: Tool = {
      id: 'stub',
      label: 'Stub',
      icon: 'focus',
      route: '/more/lens',
      category: 'camera',
      comingSoon: true,
    };
    expect(isPinnable(stub)).toBe(false);
  });

  it('returns false for film-log and recipes', () => {
    // SAFETY: 'film-log' is an id hardcoded in TOOLS (see tools.ts).
    expect(isPinnable(getTool('film-log') as Tool)).toBe(false);
    // SAFETY: 'recipes' is an id hardcoded in TOOLS (see tools.ts).
    expect(isPinnable(getTool('recipes') as Tool)).toBe(false);
  });

  it('returns true for lens and camera-exposure now that both are implemented', () => {
    // SAFETY: 'lens' is an id hardcoded in TOOLS (see tools.ts).
    expect(isPinnable(getTool('lens') as Tool)).toBe(true);
    // SAFETY: 'camera-exposure' is an id hardcoded in TOOLS (see tools.ts).
    expect(isPinnable(getTool('camera-exposure') as Tool)).toBe(true);
  });

  it('returns true for border', () => {
    // SAFETY: 'border' is an id hardcoded in TOOLS (see tools.ts).
    expect(isPinnable(getTool('border') as Tool)).toBe(true);
  });

  // Add an id here when a new tool lands as a stub screen. Lenses and Camera
  // Exposure were the last ones (issues #259, #260).
  it('flags exactly the current stub screens as comingSoon', () => {
    const comingSoonIds = TOOLS.filter((t) => t.comingSoon).map((t) => t.id);
    expect(comingSoonIds).toEqual([]);
  });

  it('DEFAULT_PINNED_IDS contains no non-pinnable tool', () => {
    for (const id of DEFAULT_PINNED_IDS) {
      const tool = getTool(id);
      expect(tool && isPinnable(tool)).toBe(true);
    }
  });
});
