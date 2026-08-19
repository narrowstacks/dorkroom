// Complete, correctly typed fixtures for the film-development API shapes.
// Kept in one place so a new required field on Film/Developer/Combination fails
// to compile here instead of being papered over with a cast in each test.
import type { Combination, Developer, Film } from '@dorkroom/api';

const baseFilm: Film = {
  id: 1,
  uuid: 'f1',
  slug: 'hp5',
  brand: 'Ilford',
  name: 'HP5 Plus',
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
  dateAdded: '',
  createdAt: '',
  updatedAt: '',
};

export const film = (over: Partial<Film>): Film => ({ ...baseFilm, ...over });

const baseDeveloper: Developer = {
  id: 1,
  uuid: 'd1',
  slug: 'd76',
  name: 'D-76',
  manufacturer: 'Kodak',
  type: 'Powder',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: '',
  updatedAt: '',
};

export const developer = (over: Partial<Developer>): Developer => ({
  ...baseDeveloper,
  ...over,
});

const baseCombination: Combination = {
  id: 1,
  uuid: 'c1',
  name: '',
  filmStockId: 'f1',
  filmSlug: 'hp5',
  developerId: 'd1',
  developerSlug: 'd76',
  shootingIso: 400,
  dilutionId: null,
  customDilution: '1+1',
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 8.5,
  agitationMethod: '',
  agitationSchedule: null,
  pushPull: 0,
  tags: ['pictorial'],
  notes: null,
  infoSource: null,
  createdAt: '',
  updatedAt: '',
};

export const combo = (over: Partial<Combination>): Combination => ({
  ...baseCombination,
  ...over,
});
