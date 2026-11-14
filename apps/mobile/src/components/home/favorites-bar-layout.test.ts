import { describe, expect, it } from 'vitest';
import {
  FAVORITE_TILE_MAX_FONT_SCALE,
  FAVORITES_BAR_GAP,
  favoritesBarBottom,
  favoritesBarFrame,
  favoritesBarItemHint,
  favoritesBarItemLabel,
  favoritesBarItems,
  favoritesContentInset,
  favoriteTileIconSize,
  showsFavoritesBar,
} from './favorites-bar-layout';

const kinds = (ids: string[]) =>
  favoritesBarItems(ids).map((item) =>
    item.kind === 'tool' ? item.tool.id : item.kind
  );

describe('favoritesBarItems', () => {
  it('shows one quiet Add favorites tile with no favorites', () => {
    expect(kinds([])).toEqual(['add']);
    expect(kinds(['gone'])).toEqual(['add']);
  });

  it('shows the favorites in order, then Edit', () => {
    expect(kinds(['timer', 'meter'])).toEqual(['timer', 'meter', 'edit']);
  });

  it('labels each tile for VoiceOver', () => {
    const [timer, edit] = favoritesBarItems(['timer']);
    expect(favoritesBarItemLabel(timer)).toBe('Process Timer');
    expect(favoritesBarItemHint(timer)).toBe('Opens Process Timer.');
    expect(favoritesBarItemLabel(edit)).toBe('Edit favorites');
    expect(favoritesBarItemLabel({ kind: 'add' })).toBe('Add favorites');
  });
});

describe('tile size', () => {
  it('scales the glyph with the text up to the cap', () => {
    expect(favoriteTileIconSize(1)).toBe(18);
    expect(favoriteTileIconSize(0.8)).toBe(18);
    expect(favoriteTileIconSize(1.5)).toBe(27);
    expect(favoriteTileIconSize(3.1)).toBe(18 * FAVORITE_TILE_MAX_FONT_SCALE);
    expect(favoriteTileIconSize(Number.NaN)).toBe(18);
  });
});

describe('placement', () => {
  it('sits above the screen bottom inset (tab bar, timer pill, home indicator)', () => {
    // No run: tab bar and home indicator.
    expect(favoritesBarBottom(83)).toBe(83 + FAVORITES_BAR_GAP);
    // A run going: the tab safe area grows by the pill.
    expect(favoritesBarBottom(83 + 56)).toBe(139 + FAVORITES_BAR_GAP);
    expect(favoritesBarBottom(-4)).toBe(FAVORITES_BAR_GAP);
  });

  it('hides while the keyboard is up on Home, and only then', () => {
    expect(showsFavoritesBar(0, true)).toBe(true);
    expect(showsFavoritesBar(336, true)).toBe(false);
    // Typing in another tab or a pushed screen leaves Home's row alone.
    expect(showsFavoritesBar(336, false)).toBe(true);
    expect(showsFavoritesBar(0, false)).toBe(true);
  });

  it('reserves the row and its gap, from its last measured height', () => {
    expect(favoritesContentInset(60.2)).toBe(61 + FAVORITES_BAR_GAP);
    // Not measured yet: no room (and so no inset props on the scroll view).
    expect(favoritesContentInset(0)).toBe(0);
    expect(favoritesContentInset(Number.NaN)).toBe(0);
  });

  it('has no keyboard term: the room is the same whether the row shows or not', () => {
    // Home keeps the last height while the row is unmounted for the keyboard,
    // and the inset takes nothing about the keyboard, so it cannot change
    // while the keyboard is up (a change would overwrite the keyboard inset).
    expect(favoritesContentInset.length).toBe(1);
  });
});

describe('favoritesBarFrame', () => {
  it('fills a phone width less the 16pt margins', () => {
    expect(favoritesBarFrame(393, 0, 0)).toEqual({ left: 16, width: 361 });
  });

  it('keeps clear of the side safe-area insets', () => {
    expect(favoritesBarFrame(600, 40, 40)).toEqual({ left: 56, width: 488 });
  });

  it('caps at 560pt, centred, on a wide window', () => {
    expect(favoritesBarFrame(1024, 0, 0)).toEqual({ left: 232, width: 560 });
  });

  it('never goes negative', () => {
    expect(favoritesBarFrame(20, 0, 0).width).toBe(0);
  });
});
