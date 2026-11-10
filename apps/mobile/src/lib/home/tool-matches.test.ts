import type { HomeResultGroup } from '@dorkroom/logic';
import { searchHome } from '@dorkroom/logic';
import { describe, expect, it } from 'vitest';
import { homeToolIds } from './tool-matches';

const toolsGroup = (...tools: string[]): HomeResultGroup => ({
  key: 'tools',
  label: 'Tools',
  total: tools.length,
  // SAFETY: test data; the routes are valid HomeToolRoute values.
  tools: tools as never,
});

describe('homeToolIds', () => {
  it('finds both Camera Exposure and the Print Exposure tool for "exposure"', () => {
    const ids = homeToolIds(searchHome('exposure').groups, 'exposure');
    expect(ids).toContain('camera-exposure');
    expect(ids).toContain('exposure');
    // The shared result ranks first.
    expect(ids.indexOf('camera-exposure')).toBeLessThan(
      ids.indexOf('exposure')
    );
  });

  it('finds Mat Cut for "mat"', () => {
    expect(homeToolIds(searchHome('mat').groups, 'mat')).toContain('mat');
  });

  it('finds tools the web has no route for, by label', () => {
    expect(homeToolIds([], 'timer')).toEqual(['timer']);
    expect(homeToolIds([], 'film log')).toEqual(['film-log']);
  });

  it('adds nothing for an empty or whitespace query', () => {
    expect(homeToolIds([], '')).toEqual([]);
    expect(homeToolIds([], '   ')).toEqual([]);
  });

  it('keeps the shared order and adds no duplicate', () => {
    const groups = [toolsGroup('/exposure', '/stops')];
    expect(homeToolIds(groups, 'exposure')).toEqual([
      'camera-exposure',
      'exposure',
    ]);
  });

  it('puts label matches after the shared results, in manifest order', () => {
    const groups = [toolsGroup('/border')];
    expect(homeToolIds(groups, 'border exposure')).toEqual([
      'border',
      'camera-exposure',
      'exposure',
    ]);
  });

  it('ignores one- and two-letter fragments that are not whole words', () => {
    expect(homeToolIds([], 'ex')).toEqual([]);
  });
});
