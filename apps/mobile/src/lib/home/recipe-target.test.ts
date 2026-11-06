import { describe, expect, it } from 'vitest';
import { developer, film } from '@/test/fixtures';
import { resolveRecipeTarget } from './recipe-target';

const hp5 = film({ slug: 'hp5-plus', brand: 'Ilford', name: 'HP5 Plus' });
const portra = film({ slug: 'portra-400', brand: 'Kodak', name: 'Portra 400' });
const rodinal = developer({
  slug: 'rodinal',
  manufacturer: 'Agfa',
  name: 'Rodinal',
});
const dektol = developer({
  slug: 'dektol',
  manufacturer: 'Kodak',
  name: 'Dektol',
});

const listed = { films: [hp5], developers: [rodinal] };
const catalog = { films: [hp5, portra], developers: [rodinal, dektol] };

describe('resolveRecipeTarget', () => {
  it('resolves listed slugs', () => {
    expect(
      resolveRecipeTarget(
        { film: 'hp5-plus', developer: 'rodinal' },
        listed,
        catalog
      )
    ).toEqual({ film: hp5, developer: rodinal, unavailable: null });
  });

  it('names a catalog film the browser cannot list', () => {
    expect(
      resolveRecipeTarget({ film: 'portra-400' }, listed, catalog)
    ).toEqual({ film: null, developer: null, unavailable: 'Kodak Portra 400' });
  });

  it('names a catalog developer the browser cannot list', () => {
    expect(
      resolveRecipeTarget({ developer: 'dektol' }, listed, catalog).unavailable
    ).toBe('Kodak Dektol');
  });

  it('falls back to the slug when the catalog has not loaded', () => {
    expect(resolveRecipeTarget({ film: 'nope' }, listed, {}).unavailable).toBe(
      'nope'
    );
  });

  it('is empty without params', () => {
    expect(resolveRecipeTarget({}, listed, catalog)).toEqual({
      film: null,
      developer: null,
      unavailable: null,
    });
  });
});
