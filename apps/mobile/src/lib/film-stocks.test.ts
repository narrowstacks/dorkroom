import type { Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import { mapFilmToStock } from '@/lib/film-stocks';

function makeFilm(overrides: Partial<Film> = {}): Film {
  return {
    id: 1,
    uuid: 'uuid-1',
    slug: 'kodak-tri-x-400',
    brand: 'Kodak',
    name: 'Tri-X 400',
    colorType: 'bw',
    isoSpeed: 400,
    grainStructure: null,
    description: '',
    manufacturerNotes: null,
    reciprocityFailure: null,
    discontinued: false,
    staticImageUrl: null,
    aliases: [],
    baseFilmSlug: null,
    dateAdded: '2024-01-01',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

describe('mapFilmToStock', () => {
  it('maps API fields to the FilmStock subset (id=slug, iso=isoSpeed)', () => {
    expect(mapFilmToStock(makeFilm())).toEqual({
      id: 'kodak-tri-x-400',
      brand: 'Kodak',
      name: 'Tri-X 400',
      iso: 400,
      process: 'bw',
    });
  });

  it('passes through the color and slide process values', () => {
    expect(mapFilmToStock(makeFilm({ colorType: 'color' })).process).toBe(
      'color'
    );
    expect(mapFilmToStock(makeFilm({ colorType: 'slide' })).process).toBe(
      'slide'
    );
  });

  it('falls back to bw for an unrecognized colorType', () => {
    expect(mapFilmToStock(makeFilm({ colorType: 'sepia' })).process).toBe('bw');
  });
});
