import { describe, expect, it } from 'vitest';
import { DEFAULT_PINNED_IDS, getTool, TOOLS, type Tool } from './tools';

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

  it('every tool has a non-empty Lucide icon name', () => {
    for (const tool of TOOLS) {
      expect(typeof tool.icon).toBe('string');
      expect(tool.icon.length).toBeGreaterThan(0);
    }
  });
});
