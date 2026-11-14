import { describe, expect, it } from 'vitest';
import { getTool } from '@/lib/tools';
import {
  HUB_MAX_WIDTH,
  hubWidth,
  TILE_GAP,
  tileRows,
  tileSecondaryLine,
  tileWidth,
} from './hub-layout';

describe('tileRows', () => {
  it('makes rows of two and spans the lone last tile', () => {
    expect(tileRows([1, 2, 3, 4, 5])).toEqual([
      { items: [1, 2], wide: false },
      { items: [3, 4], wide: false },
      { items: [5], wide: true },
    ]);
  });

  it('has no wide tile for an even count', () => {
    expect(tileRows([1, 2, 3, 4]).some((row) => row.wide)).toBe(false);
    expect(tileRows([])).toEqual([]);
  });

  it('keeps exactly two tiles as one normal row', () => {
    expect(tileRows(['a', 'b'])).toEqual([{ items: ['a', 'b'], wide: false }]);
  });

  it('spans a hub of three (Develop) and of one', () => {
    expect(tileRows(['a', 'b', 'c']).map((row) => row.wide)).toEqual([
      false,
      true,
    ]);
    expect(tileRows(['a'])).toEqual([{ items: ['a'], wide: true }]);
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
