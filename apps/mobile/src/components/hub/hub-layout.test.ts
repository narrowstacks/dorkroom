import { describe, expect, it } from 'vitest';
import { getTool } from '@/lib/tools';
import {
  chunkPairs,
  HUB_MAX_WIDTH,
  hubWidth,
  TILE_GAP,
  tileSecondaryLine,
  tileWidth,
} from './hub-layout';

describe('chunkPairs', () => {
  it('makes rows of two with a short last row', () => {
    expect(chunkPairs([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkPairs([1, 2, 3, 4])).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(chunkPairs([])).toEqual([]);
  });
});

describe('tileSecondaryLine', () => {
  const exposure = getTool('exposure');
  if (!exposure) throw new Error('exposure is a tool');

  it('shows the last result when one is known', () => {
    expect(tileSecondaryLine(exposure, { exposure: { text: '20s' } })).toBe(
      '20s'
    );
  });

  it('falls back to the blurb', () => {
    expect(tileSecondaryLine(exposure, {})).toBe(exposure.blurb);
    expect(tileSecondaryLine(exposure, { lens: { text: '85 mm' } })).toBe(
      exposure.blurb
    );
  });
});

describe('tileWidth', () => {
  it('is half the content width minus half the gap', () => {
    // 393pt phone, 16pt padding: 361 of content, two tiles and one gap.
    expect(tileWidth(393, 16)).toBe(172);
    expect(tileWidth(393, 16) * 2 + TILE_GAP).toBeLessThanOrEqual(393 - 32);
  });

  it('never goes negative', () => {
    expect(tileWidth(10, 16)).toBe(0);
  });
});

describe('hubWidth', () => {
  it('caps a wide window and leaves a phone alone', () => {
    expect(hubWidth(393)).toBe(393);
    expect(hubWidth(1032)).toBe(HUB_MAX_WIDTH);
    expect(tileWidth(hubWidth(1032), 16)).toBe(256);
  });
});
