import type { Combination, Developer, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import { recentRecipeRows } from './recent-recipes';

// SAFETY (all three records): only the fields recentRecipeRows reads are
// given; the rest of the API record is irrelevant to the lookup under test.
// SAFETY: partial Film, see above.
const film = {
  uuid: 'f1',
  slug: 'hp5-plus',
  brand: 'Ilford',
  name: 'HP5 Plus',
} as Film;
// SAFETY: partial Developer, see above.
const developer = {
  uuid: 'd1',
  slug: 'ddx',
  name: 'DD-X',
  manufacturer: 'Ilford',
} as Developer;
// SAFETY: partial Combination, see above.
const combination = (uuid: string): Combination =>
  ({
    uuid,
    filmSlug: 'hp5-plus',
    filmStockId: 'hp5-plus',
    developerSlug: 'ddx',
    developerId: 'd1',
    shootingIso: 800,
    timeMinutes: 10,
  }) as Combination;

describe('recentRecipeRows', () => {
  it('names recipes newest first, in the order given', () => {
    const rows = recentRecipeRows(['b', 'a'], {
      films: [film],
      developers: [developer],
      combinations: [combination('a'), combination('b')],
    });
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
    expect(rows[0]).toEqual({
      id: 'b',
      title: 'Ilford HP5 Plus',
      detail: 'DD-X, 10m at 800',
    });
  });

  it('skips a recipe the catalog does not have, or has not loaded', () => {
    expect(recentRecipeRows(['gone'], { films: [film] })).toEqual([]);
    expect(recentRecipeRows(['a'], {})).toEqual([]);
  });
});
