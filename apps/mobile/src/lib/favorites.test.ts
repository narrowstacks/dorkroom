import { afterEach, describe, expect, it } from 'vitest';
import {
  addFavorite,
  canAddFavorite,
  favoritesEditorSections,
  MAX_FAVORITES,
  moveFavorite,
  parseFavoriteIds,
  removeFavorite,
  sameFavorites,
  toggleFavorite,
} from './favorites';
import {
  addFavoriteTool,
  FAVORITES_KEY,
  getFavoriteIds,
  moveFavoriteTool,
  removeFavoriteTool,
  setFavoriteIds,
  storage,
  subscribeFavorites,
  toggleFavoriteTool,
} from './favorites-store';
import { TOOLS } from './tools';

const ALL = TOOLS.map((t) => t.id);

describe('parseFavoriteIds', () => {
  it('reads an ordered list of tool ids', () => {
    expect(parseFavoriteIds('["timer","meter","exposure"]')).toEqual([
      'timer',
      'meter',
      'exposure',
    ]);
  });

  it('is empty for nothing, damaged JSON or a non-array', () => {
    for (const raw of [undefined, '', '{', 'null', '{"a":1}', '"meter"', '3']) {
      expect(parseFavoriteIds(raw), String(raw)).toEqual([]);
    }
  });

  it('drops unknown ids and non-strings one by one, keeping the rest in order', () => {
    expect(
      parseFavoriteIds('["gone", 4, "meter", null, "", {"id":"lens"}, "lens"]')
    ).toEqual(['meter', 'lens']);
  });

  it('removes duplicates, keeping the first place', () => {
    expect(parseFavoriteIds('["lens","meter","lens","meter"]')).toEqual([
      'lens',
      'meter',
    ]);
  });

  it(`caps the list at ${MAX_FAVORITES}`, () => {
    expect(parseFavoriteIds(JSON.stringify(ALL))).toEqual(
      ALL.slice(0, MAX_FAVORITES)
    );
  });

  it('accepts every tool in the manifest, sections included', () => {
    for (const id of ALL) expect(parseFavoriteIds(`["${id}"]`)).toEqual([id]);
    expect(ALL).toEqual(
      expect.arrayContaining(['film-log', 'recipes', 'timer'])
    );
  });
});

describe('editing the list', () => {
  it('adds at the end, never twice, never an unknown id, never past the cap', () => {
    expect(addFavorite(['meter'], 'timer')).toEqual(['meter', 'timer']);
    expect(addFavorite(['meter'], 'meter')).toEqual(['meter']);
    expect(addFavorite(['meter'], 'nope')).toEqual(['meter']);
    const full = ALL.slice(0, MAX_FAVORITES);
    expect(canAddFavorite(full, ALL[MAX_FAVORITES])).toBe(false);
    expect(addFavorite(full, ALL[MAX_FAVORITES])).toEqual(full);
  });

  it('removes, and toggles either way', () => {
    expect(removeFavorite(['meter', 'timer'], 'meter')).toEqual(['timer']);
    expect(removeFavorite(['timer'], 'meter')).toEqual(['timer']);
    expect(toggleFavorite(['meter', 'timer'], 'meter')).toEqual(['timer']);
    expect(toggleFavorite(['timer'], 'meter')).toEqual(['timer', 'meter']);
  });

  it('moves one place up or down and stops at the ends', () => {
    const list = ['a', 'b', 'c'];
    expect(moveFavorite(list, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveFavorite(list, 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moveFavorite(list, 'a', -1)).toEqual(list);
    expect(moveFavorite(list, 'c', 1)).toEqual(list);
    expect(moveFavorite(list, 'a', 5)).toEqual(['b', 'c', 'a']);
    expect(moveFavorite(list, 'x', 1)).toEqual(list);
  });

  it('never mutates its input', () => {
    const list = Object.freeze(['meter', 'timer']);
    addFavorite(list, 'lens');
    removeFavorite(list, 'meter');
    moveFavorite(list, 'timer', -1);
    expect(list).toEqual(['meter', 'timer']);
  });

  it('compares by ids and order', () => {
    expect(sameFavorites(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameFavorites(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameFavorites(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('favorites store', () => {
  afterEach(() => storage.remove(FAVORITES_KEY));

  it('starts empty and keeps what is written, in order', () => {
    expect(getFavoriteIds()).toEqual([]);
    addFavoriteTool('timer');
    addFavoriteTool('meter');
    toggleFavoriteTool('exposure');
    expect(getFavoriteIds()).toEqual(['timer', 'meter', 'exposure']);
    moveFavoriteTool('exposure', -1);
    expect(getFavoriteIds()).toEqual(['timer', 'exposure', 'meter']);
    removeFavoriteTool('timer');
    toggleFavoriteTool('meter');
    expect(getFavoriteIds()).toEqual(['exposure']);
  });

  it('stores a JSON array of tool ids and nothing else', () => {
    setFavoriteIds(['lens', 'gone', 'lens', 'timer']);
    expect(storage.getString(FAVORITES_KEY)).toBe('["lens","timer"]');
  });

  it('reads a damaged value as empty and recovers on the next write', () => {
    storage.set(FAVORITES_KEY, '[not json');
    expect(getFavoriteIds()).toEqual([]);
    addFavoriteTool('meter');
    expect(getFavoriteIds()).toEqual(['meter']);
  });

  it('tells subscribers about a change, and not about a write that changes nothing', () => {
    let calls = 0;
    const unsubscribe = subscribeFavorites(() => {
      calls += 1;
    });
    addFavoriteTool('meter');
    addFavoriteTool('meter');
    moveFavoriteTool('meter', -1);
    removeFavoriteTool('lens');
    expect(calls).toBe(1);
    storage.set('somethingElse', '1');
    expect(calls).toBe(1);
    unsubscribe();
    removeFavoriteTool('meter');
    expect(calls).toBe(1);
  });
});

describe('favoritesEditorSections', () => {
  it('lists the favorites in order, then every other tool by phase', () => {
    const sections = favoritesEditorSections(['timer', 'meter']);
    expect(sections.favorites.map((t) => t.id)).toEqual(['timer', 'meter']);
    expect(
      sections.others.map((s) => [s.phase, s.tools.map((t) => t.id)])
    ).toEqual([
      ['shoot', ['film-log', 'reciprocity', 'camera-exposure', 'lens']],
      ['develop', ['recipes', 'negative-inverter']],
      ['print', ['border', 'exposure', 'resize', 'mat']],
    ]);
    expect(sections.full).toBe(false);
  });

  it('drops a phase with nothing left to add, and says when the list is full', () => {
    const sections = favoritesEditorSections([
      'recipes',
      'timer',
      'negative-inverter',
      'meter',
      'lens',
      'border',
      'mat',
      'exposure',
    ]);
    expect(sections.others.map((s) => s.phase)).toEqual(['shoot', 'print']);
    expect(sections.full).toBe(true);
  });
});
