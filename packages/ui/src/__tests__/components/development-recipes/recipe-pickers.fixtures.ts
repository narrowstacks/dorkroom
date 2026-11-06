import type { Combination, Developer, Film } from '@dorkroom/api';
import {
  buildRecipeIndex,
  type DevelopmentCombinationView,
  getRecipeRows,
  type RecipeIndex,
} from '@dorkroom/logic';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const makeFilm = (
  slug: string,
  overrides: Partial<Film> = {}
): Film => ({
  id: 1,
  uuid: `film-${slug}`,
  slug,
  name: slug,
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

export const makeDeveloper = (
  slug: string,
  overrides: Partial<Developer> = {}
): Developer => ({
  id: 1,
  uuid: `dev-${slug}`,
  slug,
  name: slug,
  manufacturer: 'Kodak',
  type: 'powder',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  imageCredit: null,
  imageSourceUrl: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

export const hp5 = makeFilm('hp5-plus', { name: 'HP5 Plus' });
export const delta400 = makeFilm('delta-400', { name: 'Delta 400' });
export const xtol = makeDeveloper('xtol', { name: 'XTOL' });
export const ilfotec = makeDeveloper('ilfotec-hc', {
  name: 'Ilfotec HC',
  manufacturer: 'Ilford',
});

export const makeView = (
  uuid: string,
  film: Film,
  developer: Developer,
  overrides: Partial<Combination> = {},
  source: DevelopmentCombinationView['source'] = 'api'
): DevelopmentCombinationView => {
  const combination: Combination = {
    id: 1,
    uuid,
    name: uuid,
    filmStockId: film.uuid,
    filmSlug: film.slug,
    developerId: developer.uuid,
    developerSlug: developer.slug,
    shootingIso: film.isoSpeed,
    dilutionId: null,
    customDilution: '1+1',
    temperatureC: 20,
    temperatureF: 68,
    timeMinutes: 9.5,
    agitationMethod: '',
    agitationSchedule: null,
    pushPull: 0,
    tags: ['official-ilford'],
    notes: null,
    infoSource: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
  return { combination, film, developer, source };
};

/** Two 1:31 rows at EI 400 with different times, like the live Delta 400 in Ilfotec HC. */
export const delta400Pair = [
  makeView('delta-hc-a', delta400, ilfotec, {
    customDilution: '1:31',
    timeMinutes: 6.5,
  }),
  makeView('delta-hc-b', delta400, ilfotec, {
    customDilution: '1:31',
    timeMinutes: 7,
  }),
  makeView('delta-hc-c', delta400, ilfotec, {
    customDilution: '1:47',
    timeMinutes: 9,
  }),
];

export const rowsFor = (
  pair: readonly DevelopmentCombinationView[],
  current: DevelopmentCombinationView | null = null
) => getRecipeRows(pair, current);

export const indexOf = (
  views: readonly DevelopmentCombinationView[],
  films: Film[],
  developers: Developer[]
): RecipeIndex => buildRecipeIndex(views, films, developers);
