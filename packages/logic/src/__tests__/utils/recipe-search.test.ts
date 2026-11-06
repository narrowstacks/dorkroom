import type { Combination, Developer, Film } from '@dorkroom/api';
import { describe, expect, it } from 'vitest';
import type { DevelopmentCombinationView } from '../../types/development-recipe-view';
import { searchRecipes } from '../../utils/recipe-search';
import {
  buildRecipeIndex,
  filterRecipesByScope,
} from '../../utils/recipe-selection';

const film = (
  slug: string,
  brand: string,
  name: string,
  isoSpeed: number,
  overrides: Partial<Film> = {}
): Film => ({
  id: 0,
  uuid: `uuid-${slug}`,
  slug,
  brand,
  name,
  colorType: 'bw',
  isoSpeed,
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
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
  ...overrides,
});

const developer = (
  slug: string,
  manufacturer: string,
  name: string
): Developer => ({
  id: 0,
  uuid: `uuid-${slug}`,
  slug,
  name,
  manufacturer,
  type: 'concentrate',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  imageCredit: null,
  imageSourceUrl: null,
  notes: null,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
});

// Names and aliases spelled as the live catalogue spells them.
const hp5 = film('ilford-hp5-plus', 'Ilford', 'HP5 Plus', 400);
const triX = film('kodak-tri-x-400', 'Kodak', 'Tri-X 400', 400);
const tmax100 = film('kodak-tmax-100', 'Kodak', 'T-MAX/Ektapan 100', 100, {
  aliases: [{ slug: 'kodak-t-max-100', name: 'Kodak T-MAX 100' }],
});
const tmax400 = film('kodak-tmax-400', 'Kodak', 'T-MAX/Ektapan 400', 400, {
  aliases: [{ slug: 'kodak-t-max-400', name: 'Kodak T-MAX 400' }],
});
const delta100 = film('ilford-delta-100', 'Ilford', 'Delta 100', 100);
const delta400 = film('ilford-delta-400', 'Ilford', 'Delta 400', 400);
const delta3200 = film('ilford-delta-3200', 'Ilford', 'Delta 3200', 3200);
// Live, all of Fomapan's recipes are stored under a rebrand; here most are.
const fomapan = film('foma-fomapan-400', 'Foma', 'Fomapan 400 Action', 400);
const ladyGrey = film(
  'lomography-lady-grey',
  'Lomography',
  'Lady Grey 400',
  400,
  {
    baseFilmSlug: 'foma-fomapan-400',
  }
);
const arista = film('arista-edu-ultra-400', 'Arista', 'Edu Ultra 400', 400, {
  baseFilmSlug: 'foma-fomapan-400',
});
const provia = film('fuji-provia-100f', 'Fuji', 'Provia 100F', 100);
const acrosII = film('fuji-acros-ii', 'Fuji', 'Neopan 100 Acros II', 100);
const retro400s = film('rollei-retro-400s', 'Rollei', 'Retro 400S', 400);
const panF = film('ilford-pan-f', 'Ilford', 'Pan F Plus', 50);
// Namesakes with no recipes: their names must not swallow the query.
const acrosOld = film('fuji-neopan-acros-100', 'Fuji', 'Neopan Acros 100', 100);
const retro400 = film('rollei-retro-400', 'Rollei', 'Retro 400', 400);
const pan25 = film('rollei-pan-25', 'Rollei', 'Pan 25', 25);
const FILMS = [
  hp5,
  triX,
  tmax100,
  tmax400,
  delta100,
  delta400,
  delta3200,
  fomapan,
  ladyGrey,
  arista,
  provia,
  acrosII,
  retro400s,
  panF,
  acrosOld,
  retro400,
  pan25,
];

const xtol = developer('kodak-xtol', 'Kodak', 'XTOL');
const ddx = developer('ilford-dd-x', 'Ilford', 'DD-X');
const d76 = developer('kodak-d-76', 'Kodak', 'D-76');
const hc110 = developer('kodak-hc-110', 'Kodak', 'HC-110');
const ilfotecHc = developer('ilford-ilfotec-hc', 'Ilford', 'Ilfotec HC');
const rodinal = developer('agfa-rodinal', 'Agfa', 'Rodinal/Adonal');
const ilfosol3 = developer('ilford-ilfosol-3', 'Ilford', 'ILFOSOL 3');
const tmaxDev = developer('kodak-tmax-dev', 'Kodak', 'T-MAX Developer');
const tmaxRs = developer('kodak-tmax-rs', 'Kodak', 'T-MAX RS Developer');
const id11 = developer('ilford-id-11', 'Ilford', 'ID-11');
const DEVELOPERS = [
  xtol,
  ddx,
  d76,
  hc110,
  ilfotecHc,
  rodinal,
  ilfosol3,
  tmaxDev,
  tmaxRs,
  id11,
];

interface RowOptions {
  iso?: number;
  dilution?: string;
  tempC?: number;
  minutes?: number;
}

const row = (
  uuid: string,
  filmOf: Film,
  developerOf: Developer,
  { iso = 400, dilution = 'Stock', tempC = 20, minutes = 9 }: RowOptions = {},
  source: 'api' | 'custom' = 'api'
): DevelopmentCombinationView => {
  const combination: Combination = {
    id: 1,
    uuid,
    name: '',
    filmStockId: source === 'custom' ? filmOf.uuid : filmOf.slug,
    filmSlug: source === 'api' ? filmOf.slug : filmOf.uuid,
    developerId: developerOf.slug,
    developerSlug: developerOf.slug,
    shootingIso: iso,
    dilutionId: null,
    customDilution: dilution,
    temperatureC: tempC,
    temperatureF: Math.round(((tempC * 9) / 5 + 32) * 10) / 10,
    timeMinutes: minutes,
    agitationMethod: '',
    agitationSchedule: null,
    pushPull: 0,
    tags: source === 'api' ? ['official-ilford'] : [],
    notes: null,
    infoSource: null,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  };
  return { source, film: filmOf, developer: developerOf, combination };
};

const VIEWS = [
  row('hp5-xtol-400', hp5, xtol, { iso: 400, minutes: 9 }),
  row('hp5-xtol-800', hp5, xtol, { iso: 800, minutes: 11 }),
  row('hp5-xtol-800-1+1', hp5, xtol, {
    iso: 800,
    dilution: '1+1',
    minutes: 16,
  }),
  row('hp5-xtol-1600', hp5, xtol, { iso: 1600, minutes: 16.5 }),
  row('hp5-ddx-800', hp5, ddx, { iso: 800, dilution: '1+4', minutes: 12 }),
  row('hp5-ddx-1600', hp5, ddx, { iso: 1600, dilution: '1+4', minutes: 14 }),
  row('hp5-d76-1600', hp5, d76, { iso: 1600, minutes: 13.5 }),
  row('hp5-hc110-400', hp5, hc110, { dilution: '1:31', minutes: 5 }),
  row('trix-d76-400', triX, d76, { minutes: 6.75 }),
  row('trix-d76-400-1+1', triX, d76, { dilution: '1+1', minutes: 9.75 }),
  // Tri-X in XTOL publishes several temperatures for one dilution and EI.
  row('trix-xtol-18', triX, xtol, { tempC: 18, minutes: 7.5 }),
  row('trix-xtol-20', triX, xtol, { tempC: 20, minutes: 6.25 }),
  row('trix-xtol-24', triX, xtol, { tempC: 24, minutes: 4.75 }),
  // Published only at 24C, so it must still be found without typing that.
  row('trix-xtol-1600-24', triX, xtol, { iso: 1600, tempC: 24, minutes: 8 }),
  row('tmax100-xtol', tmax100, xtol, { iso: 100, minutes: 7 }),
  row('tmax400-xtol', tmax400, xtol, { iso: 400, minutes: 7.5 }),
  row('hp5-tmaxdev', hp5, tmaxDev, { dilution: '1+4', minutes: 6 }),
  row('delta100-xtol-100', delta100, xtol, { iso: 100, minutes: 8.5 }),
  row('delta100-xtol-200', delta100, xtol, { iso: 200, minutes: 10 }),
  row('delta400-xtol-100', delta400, xtol, { iso: 100, minutes: 6.5 }),
  row('delta400-xtol-400', delta400, xtol, { iso: 400, minutes: 8 }),
  row('delta400-xtol-800', delta400, xtol, { iso: 800, minutes: 10.5 }),
  row('delta3200-ddx-3200', delta3200, ddx, { iso: 3200, minutes: 9.5 }),
  row('delta400-hc-a', delta400, ilfotecHc, { dilution: '1:31', minutes: 6.5 }),
  row('delta400-hc-b', delta400, ilfotecHc, { dilution: '1:31', minutes: 7 }),
  row('hp5-rodinal', hp5, rodinal, { dilution: '1+25', minutes: 6 }),
  row('hp5-ilfosol', hp5, ilfosol3, { dilution: '1+9', minutes: 6.5 }),
  row('grey-xtol-400', ladyGrey, xtol, { minutes: 7 }),
  row('grey-xtol-800', ladyGrey, xtol, { iso: 800, minutes: 9 }),
  row('foma-xtol-200', fomapan, xtol, { iso: 200, minutes: 5.5 }),
  row('tmax400-tmaxdev', tmax400, tmaxDev, { dilution: '1+4', minutes: 6.5 }),
  row('tmax400-rs', tmax400, tmaxRs, { minutes: 5.75 }),
  row('tmax100-rs', tmax100, tmaxRs, { iso: 100, minutes: 6 }),
  row('tmax100-tmaxdev', tmax100, tmaxDev, {
    iso: 100,
    dilution: '1+4',
    minutes: 6,
  }),
  row('hp5-hc110-c', hp5, hc110, { dilution: '1:19', minutes: 3 }),
  row('trix-hc110-18', triX, hc110, {
    dilution: '1:31',
    tempC: 18,
    minutes: 6,
  }),
  row('acros-d76-100', acrosII, d76, { iso: 100, minutes: 9.5 }),
  row('acros-d76-200', acrosII, d76, { iso: 200, minutes: 13 }),
  row('acros-id11', acrosII, id11, { iso: 100, minutes: 9.5 }),
  row('retro-d76-400', retro400s, d76, { minutes: 7 }),
  row('retro-d76-200', retro400s, d76, { iso: 200, minutes: 6 }),
  row('panf-d76-25', panF, d76, { iso: 25, minutes: 6 }),
  row('panf-d76-50', panF, d76, { iso: 50, minutes: 7 }),
  row('hp5-id11-400', hp5, id11, { minutes: 7.5 }),
  row('delta400-ddx-400', delta400, ddx, { dilution: '1+4', minutes: 8 }),
];

const index = buildRecipeIndex(VIEWS, FILMS, DEVELOPERS);
const ids = (query: string, on = index, limit = 100) =>
  searchRecipes(query, on, { limit }).hits.map((hit) => hit.recipeId);
const idSet = (query: string, on = index) => new Set(ids(query, on));

describe('searchRecipes', () => {
  describe("the issue's example queries", () => {
    it('reads film, speed and developer', () => {
      expect(ids('hp5 800 xtol')).toEqual(['hp5-xtol-800', 'hp5-xtol-800-1+1']);
    });

    it('reads a film and developer without a speed', () => {
      expect(ids('tri-x d-76')).toEqual(['trix-d76-400', 'trix-d76-400-1+1']);
    });

    it('understands the home page wording', () => {
      expect(ids('hp5 at 800 in dd-x')).toEqual(['hp5-ddx-800']);
    });

    it('lists every developer at a speed for hp5 1600', () => {
      expect(ids('hp5 1600')).toEqual([
        'hp5-d76-1600',
        'hp5-ddx-1600',
        'hp5-xtol-1600',
      ]);
    });

    it('fills both pickers from a hit', () => {
      const [hit] = searchRecipes('hp5 at 800 in dd-x', index).hits;
      expect(hit.filmKey).toBe('ilford-hp5-plus');
      expect(hit.developerKey).toBe('ilford-dd-x');
      expect(hit.film.name).toBe('HP5 Plus');
      expect(hit.developer.name).toBe('DD-X');
      expect(hit.dilution).toBe('1+4');
    });

    it('hands back the published row, so time and temperature are never computed', () => {
      const [hit] = searchRecipes('tri-x 400 xtol 24c', index).hits;
      const published = VIEWS.find(
        (view) => view.combination.uuid === 'trix-xtol-24'
      );
      expect(hit.view).toBe(published);
      expect(hit.view.combination.timeMinutes).toBe(4.75);
      expect(hit.view.combination.temperatureC).toBe(24);
    });
  });

  describe('how names are typed', () => {
    it('takes a Kodak edge code', () => {
      expect(ids('tmy')).toEqual([
        'tmax400-rs',
        'tmax400-tmaxdev',
        'tmax400-xtol',
      ]);
      expect(ids('tmx')).toEqual([
        'tmax100-tmaxdev',
        'tmax100-rs',
        'tmax100-xtol',
      ]);
    });

    it('takes a name split or run together', () => {
      expect(ids('tri x d 76')).toEqual(ids('tri-x d-76'));
      expect(ids('trix d76')).toEqual(ids('tri-x d-76'));
      expect(ids('hp 5 hc 110')).toEqual(['hp5-hc110-c', 'hp5-hc110-400']);
      expect(ids('t max 400')).toEqual(ids('tmy'));
      expect(ids('dd x 800')).toEqual(['hp5-ddx-800']);
    });

    it('reads hp5+ as the film, not a dilution of 5+', () => {
      expect(ids('hp5+ xtol')).toEqual(ids('hp5 xtol'));
      expect(ids('hp5+ 800 xtol')).toEqual(ids('hp5 800 xtol'));
      expect(ids('hp5+800 xtol')).toEqual(ids('hp5 800 xtol'));
      expect(ids('hp5 + 800 xtol')).toEqual(ids('hp5 800 xtol'));
    });

    it('takes the second name of a developer and a number in one', () => {
      expect(ids('adonal')).toEqual(['hp5-rodinal']);
      expect(ids('ilfosol 3')).toEqual(['hp5-ilfosol']);
      expect(ids('3 ilfosol')).toEqual(['hp5-ilfosol']);
    });

    it('ignores case and word order', () => {
      expect(ids('XTOL 800 HP5')).toEqual(ids('hp5 800 xtol'));
    });
  });

  describe('a number is a name or a speed', () => {
    it('delta 100 is the film, at any speed, and not Delta 400 at EI 100', () => {
      expect(ids('delta 100')).toEqual([
        'delta100-xtol-100',
        'delta100-xtol-200',
      ]);
    });

    it('delta 3200 is the film', () => {
      expect(ids('delta 3200')).toEqual(['delta3200-ddx-3200']);
    });

    it('still reads as the name with the developer between', () => {
      expect(ids('delta xtol 100')).toEqual([
        'delta100-xtol-100',
        'delta100-xtol-200',
      ]);
    });

    it('hp5 1600 is a speed, since no matching film has 1600 in its name', () => {
      expect(idSet('hp5 1600').has('hp5-xtol-400')).toBe(false);
    });

    it('a second number after the name is the speed', () => {
      expect(ids('delta 400 800')).toEqual(['delta400-xtol-800']);
      expect(ids('tri-x 400 1600')).toEqual(['trix-xtol-1600-24']);
      expect(ids('delta 400 at 800')).toEqual(['delta400-xtol-800']);
    });

    it('the same number twice is the name and then the speed', () => {
      expect(ids('delta 400 400')).toEqual([
        'delta400-hc-a',
        'delta400-hc-b',
        'delta400-ddx-400',
        'delta400-xtol-400',
      ]);
      expect(ids('delta xtol 400 400')).toEqual(['delta400-xtol-400']);
      expect(ids('tmy 400')).toEqual(ids('tmy'));
    });

    it('a number on its own is a speed, whatever films have it in their name', () => {
      const speeds = (query: string) =>
        searchRecipes(query, index, { limit: 100 }).hits.map(
          (hit) => hit.view.combination.shootingIso
        );
      expect(new Set(speeds('100'))).toEqual(new Set([100]));
      expect(ids('100')).toContain('delta400-xtol-100');
      expect(new Set(speeds('3200'))).toEqual(new Set([3200]));
    });

    it('beside only a developer it is a speed', () => {
      expect(ids('xtol 100')).toEqual([
        'delta400-xtol-100',
        'tmax100-xtol',
        'delta100-xtol-100',
      ]);
    });

    it("another film's number does not take over a named film", () => {
      expect(ids('ilford hp5 400 xtol')).toEqual(['hp5-xtol-400']);
    });

    it('lets a box speed typed beside a push give way, as home does', () => {
      expect(ids('hp5 400 xtol 1600')).toEqual(['hp5-xtol-1600']);
      expect(ids('hp5 400 at 800 dd-x')).toEqual(['hp5-ddx-800']);
    });

    it('finds nothing for two speeds that disagree', () => {
      expect(ids('hp5 800 1600')).toEqual([]);
      expect(ids('hp5 at 800 1600')).toEqual([]);
    });

    it('finds nothing for two speeds with no film to give one a box speed', () => {
      expect(ids('100 200')).toEqual([]);
      expect(ids('xtol 400 800')).toEqual([]);
    });

    it('finds nothing at a speed nobody published', () => {
      expect(ids('hp5 6400')).toEqual([]);
      expect(ids('hp5 at 6400 xtol')).toEqual([]);
      expect(ids('hp5 50')).toEqual([]);
    });
  });

  describe('dilutions', () => {
    it('finds a dilution across films', () => {
      expect(ids('1+1')).toEqual(['trix-d76-400-1+1', 'hp5-xtol-800-1+1']);
    });

    it('treats 1:31 and 1+31 as the same mix', () => {
      const expected = new Set([
        'hp5-hc110-400',
        'trix-hc110-18',
        'delta400-hc-a',
        'delta400-hc-b',
      ]);
      expect(idSet('1:31')).toEqual(expected);
      expect(idSet('1+31')).toEqual(expected);
    });

    it('narrows with a film and developer', () => {
      expect(ids('hp5 xtol 1+1')).toEqual(['hp5-xtol-800-1+1']);
      expect(ids('tri-x d-76 stock')).toEqual(['trix-d76-400']);
    });

    it('reads a letter dilution as its ratio', () => {
      expect(ids('hp5 hc-110 dilution b')).toEqual(['hp5-hc110-400']);
    });

    it('finds nothing at a dilution not published for the film', () => {
      expect(ids('tri-x xtol 1+3')).toEqual([]);
    });
  });

  describe('temperatures', () => {
    it('finds a temperature across films', () => {
      expect(ids('24c')).toEqual(['trix-xtol-24', 'trix-xtol-1600-24']);
    });

    it('prefers 20C when none is typed, with one row per mix and speed', () => {
      expect(ids('tri-x 400 xtol at 400')).toEqual(['trix-xtol-20']);
    });

    it('falls to a published temperature when 20C is not one', () => {
      const [hit] = searchRecipes('tri-x xtol at 1600', index).hits;
      expect(hit.recipeId).toBe('trix-xtol-1600-24');
      expect(hit.view.combination.temperatureC).toBe(24);
    });

    it('takes a typed temperature literally', () => {
      expect(ids('tri-x xtol at 400 18c')).toEqual(['trix-xtol-18']);
      expect(ids('tri-x xtol 22c')).toEqual([]);
    });

    it('reads Fahrenheit against the published row', () => {
      expect(ids('tri-x xtol at 400 75f')).toEqual(['trix-xtol-24']);
      expect(ids('tri-x xtol at 400 68f')).toEqual(['trix-xtol-20']);
    });

    it('finds a whole Fahrenheit reading that falls between Celsius rows', () => {
      expect(ids('tri-x hc-110 65f')).toEqual(['trix-hc110-18']);
    });

    it('keeps every row at a typed temperature, custom beside catalogue', () => {
      const custom = row(
        'custom-20-1',
        film('custom_film_e', 'Ilford', 'HP5 Plus', 400),
        xtol,
        { tempC: 20.1, minutes: 8.5 },
        'custom'
      );
      const on = buildRecipeIndex([...VIEWS, custom], FILMS, DEVELOPERS);
      expect(ids('hp5 xtol at 400', on)).toEqual(['hp5-xtol-400']);
      expect(ids('hp5 xtol at 400 20c', on)).toEqual([
        'custom-20-1',
        'hp5-xtol-400',
      ]);
    });

    it('does not read at 24c as EI 24', () => {
      expect(ids('tri-x xtol at 24c')).toContain('trix-xtol-24');
    });
  });

  describe('words matching only a developer', () => {
    it('lists the films in it, each row once', () => {
      const found = ids('xtol');
      expect(found).toContain('hp5-xtol-400');
      expect(found).toContain('delta100-xtol-200');
      expect(new Set(found).size).toBe(found.length);
      expect(found).not.toContain('hp5-ddx-800');
    });

    it('lets a word that names both a film and a developer be either', () => {
      const found = ids('tmax');
      expect(found).toContain('hp5-tmaxdev');
      expect(found).toContain('tmax400-xtol');
    });

    it('reads tmax beside a film as the developer', () => {
      expect(ids('hp5 tmax')).toEqual(['hp5-tmaxdev']);
    });
  });

  describe('no loose matches', () => {
    it.each([
      'banana',
      'hp5 banana',
      'xtol banana',
      'hp5 xtol banana',
      'hp5 tri-x',
      'xtol ddx',
      'plus',
      'xtol plus',
      '7m',
      'min',
      'hp5 minutes',
    ])('finds nothing for %s', (query) => {
      expect(searchRecipes(query, index)).toEqual({
        hits: [],
        total: 0,
        truncated: false,
      });
    });

    it('finds nothing for a real pair with no recipes', () => {
      expect(ids('delta 100 rodinal')).toEqual([]);
      expect(ids('provia xtol')).toEqual([]);
    });

    it.each(['', '   ', 'at', 'recipes for the', 'how long'])(
      'finds nothing, not everything, for %j',
      (query) => {
        expect(searchRecipes(query, index).total).toBe(0);
      }
    );

    it('finds nothing in an empty catalogue', () => {
      expect(searchRecipes('hp5', buildRecipeIndex([], [], [])).hits).toEqual(
        []
      );
    });
  });

  describe('rebrands', () => {
    const keyOf = (query: string, id: string) =>
      searchRecipes(query, index, { limit: 100 }).hits.find(
        (hit) => hit.recipeId === id
      )?.filmKey;

    it('reports the film it was found through', () => {
      expect(keyOf('lady grey xtol', 'grey-xtol-400')).toBe(
        'lomography-lady-grey'
      );
      expect(keyOf('fomapan xtol', 'grey-xtol-400')).toBe('foma-fomapan-400');
      expect(keyOf('arista xtol', 'foma-xtol-200')).toBe(
        'arista-edu-ultra-400'
      );
      expect(keyOf('fomapan xtol', 'foma-xtol-200')).toBe('foma-fomapan-400');
    });

    it('does not reach a sibling rebrand, as /films does not', () => {
      expect(keyOf('arista xtol', 'grey-xtol-400')).toBeUndefined();
    });

    it('names the same film as the key', () => {
      const [hit] = searchRecipes('arista at 200', index).hits;
      expect(hit.recipeId).toBe('foma-xtol-200');
      expect(hit.film.brand).toBe('Arista');
      expect(hit.filmKey).toBe('arista-edu-ultra-400');
      expect(hit.view.film).toBe(fomapan);
    });

    it('lists a shared row once, under its own film, when no film is named', () => {
      const shared = (query: string, id: string) =>
        searchRecipes(query, index, { limit: 100 }).hits.filter(
          (hit) => hit.recipeId === id
        );
      expect(shared('xtol at 800', 'grey-xtol-800')).toEqual([
        expect.objectContaining({ filmKey: 'lomography-lady-grey' }),
      ]);
      expect(shared('xtol at 200', 'foma-xtol-200')).toEqual([
        expect.objectContaining({ filmKey: 'foma-fomapan-400' }),
      ]);
    });

    it('takes the own film over a rebrand that also matches', () => {
      const holga = film('foma-holga-400', 'Foma', 'Holga 400', 400, {
        baseFilmSlug: 'foma-fomapan-400',
      });
      const on = buildRecipeIndex(VIEWS, [...FILMS, holga], DEVELOPERS);
      expect(searchRecipes('holga at 200', on).hits[0].filmKey).toBe(
        'foma-holga-400'
      );
      const hits = searchRecipes('foma at 200', on).hits;
      expect(hits.map((hit) => [hit.recipeId, hit.filmKey])).toEqual([
        ['foma-xtol-200', 'foma-fomapan-400'],
      ]);
    });

    it('takes the lowest key when the own film does not match', () => {
      const base = film('zed-100', 'Zed', 'Base 100', 100);
      const first = film('acme-a', 'Acme', 'Pan 100', 100, {
        baseFilmSlug: 'zed-100',
      });
      const second = film('acme-b', 'Acme', 'Pan 100 X', 100, {
        baseFilmSlug: 'zed-100',
      });
      for (const films of [
        [first, base, second],
        [second, base, first],
      ]) {
        const on = buildRecipeIndex(
          [row('own-base', base, xtol, { iso: 100 })],
          films,
          DEVELOPERS
        );
        const hits = searchRecipes('acme pan', on).hits;
        expect(hits.map((hit) => hit.filmKey)).toEqual(['acme-a']);
      }
    });

    it("takes the row's own film when two match equally", () => {
      const base = film('acme-pan', 'Acme', 'Pan 400', 400);
      const rebrand = film('acme-pan-x', 'Acme', 'Pan 400 X', 400, {
        baseFilmSlug: 'acme-pan',
      });
      const views = [row('own-rebrand', rebrand, xtol)];
      const on = buildRecipeIndex(views, [base, rebrand], DEVELOPERS);
      const hits = searchRecipes('acme pan', on).hits;
      expect(hits.map((hit) => hit.filmKey)).toEqual(['acme-pan-x']);
    });
  });

  describe('custom recipes', () => {
    const soup = developer('custom_dev_a', 'Home', 'Coffee Soup');
    const mystery = film('custom_film_a', 'Acme', 'Mystery 200', 200);
    const custom = [
      row('custom-own', mystery, soup, { iso: 200, minutes: 12 }, 'custom'),
      row(
        'custom-namesake',
        film('custom_film_b', 'Ilford', 'HP5 Plus', 400),
        xtol,
        { iso: 3200, minutes: 30 },
        'custom'
      ),
      row(
        'custom-broken',
        film('custom_film_c', 'Acme', 'Broken', 100),
        { ...soup, slug: 'x' },
        {},
        'custom'
      ),
    ];
    custom[2] = { ...custom[2], developer: undefined };
    const on = buildRecipeIndex([...VIEWS, ...custom], FILMS, DEVELOPERS);

    it('finds a custom film and developer by name', () => {
      const [hit] = searchRecipes('mystery coffee soup', on).hits;
      expect(hit.recipeId).toBe('custom-own');
      expect(hit.filmKey).toBe('custom:acme mystery 200');
      expect(hit.developerKey).toBe('custom:home coffee soup');
      expect(hit.film.name).toBe('Mystery 200');
    });

    it('reports the catalogue key for a custom namesake', () => {
      const [hit] = searchRecipes('hp5 3200', on).hits;
      expect(hit.recipeId).toBe('custom-namesake');
      expect(hit.filmKey).toBe('ilford-hp5-plus');
      expect(hit.film).toBe(hp5);
    });

    it('reads a number in a custom name as the name', () => {
      expect(ids('mystery 200', on)).toEqual(['custom-own']);
    });

    it('leaves out a custom recipe no picker can reach', () => {
      expect(ids('broken', on)).toEqual([]);
    });
  });

  describe('names with no recipes', () => {
    it.each([
      ['acros 100', ['acros-id11', 'acros-d76-100', 'acros-d76-200']],
      ['fuji acros 100', ['acros-id11', 'acros-d76-100', 'acros-d76-200']],
      ['acros 100 d-76', ['acros-d76-100', 'acros-d76-200']],
      ['neopan acros', ['acros-id11', 'acros-d76-100', 'acros-d76-200']],
      ['neopan acros d-76', ['acros-d76-100', 'acros-d76-200']],
      ['retro 400', ['retro-d76-400']],
      ['rollei retro 400', ['retro-d76-400']],
      ['pan 25', ['panf-d76-25']],
    ])('%s finds the film that has recipes', (query, expected) => {
      expect(ids(query)).toEqual(expected);
    });
  });

  describe('words that ask nothing', () => {
    const hp5Xtol = ids('hp5 xtol');

    it.each([
      'hp5 xtol developer',
      'hp5 xtol dev',
      'hp5 xtol box speed',
      'hp5 xtol 9 min',
      'hp5 xtol 9 minutes',
      'hp5 xtol 9m',
    ])('%s is hp5 xtol', (query) => {
      expect(ids(query)).toEqual(hp5Xtol);
    });

    it('does not read the number of a time as a speed, with no developer either', () => {
      expect(ids('hp5 9 min')).toEqual(ids('hp5'));
    });

    it('reads temperature words as a temperature', () => {
      const at24 = ['trix-xtol-24'];
      expect(ids('tri-x xtol at 400 24 degrees')).toEqual(at24);
      expect(ids('tri-x xtol at 400 24 celsius')).toEqual(at24);
      expect(ids('tri-x xtol at 400 24 degrees c')).toEqual(at24);
      expect(ids('tri-x xtol at 400 75 degrees f')).toEqual(at24);
      expect(ids('tri-x xtol at 400 75 fahrenheit')).toEqual(at24);
      expect(ids('tri-x xtol at 400 24°')).toEqual(at24);
      expect(ids('tri-x xtol at 400 24°c')).toEqual(at24);
      expect(ids('tri-x xtol at 400 75°f')).toEqual(at24);
      // Filters rather than asks nothing: HP5 in XTOL is published only at 20C.
      expect(ids('hp5 xtol 24 celsius')).toEqual([]);
      expect(ids('hp5 xtol 20 celsius')).toEqual(hp5Xtol);
    });

    it('reads a degree value with no unit as Fahrenheit from 40 up', () => {
      expect(ids('tri-x xtol at 400 75 degrees')).toEqual(['trix-xtol-24']);
      expect(ids('tri-x xtol at 400 68 degrees')).toEqual(['trix-xtol-20']);
      expect(ids('tri-x xtol at 400 68°')).toEqual(['trix-xtol-20']);
      expect(ids('hp5 xtol 68 degrees')).toEqual(ids('hp5 xtol'));
      const cold = row('hp5-xtol-cold', hp5, xtol, { tempC: 4.5, minutes: 30 });
      const on = buildRecipeIndex([...VIEWS, cold], FILMS, DEVELOPERS);
      expect(ids('hp5 xtol 40°', on)).toEqual(['hp5-xtol-cold']);
      expect(ids('hp5 xtol 39°', on)).toEqual([]);
    });

    it('takes a maker that starts the film name', () => {
      expect(ids('foma fomapan 400 xtol')).toEqual(ids('fomapan 400 xtol'));
    });

    it('takes the other names people use', () => {
      expect(ids('fujifilm acros d-76')).toEqual(ids('acros d-76'));
      expect(ids('hp5 ilfotec dd-x')).toEqual(ids('hp5 dd-x'));
    });

    it('still finds nothing for an unknown word', () => {
      expect(ids('hp5 banana')).toEqual([]);
    });

    it('asks nothing of a query that is only these words', () => {
      expect(ids('box speed')).toEqual([]);
      expect(ids('developer')).toEqual([]);
      expect(ids('9 min')).toEqual([]);
    });

    it('keeps such a word when a name has it', () => {
      const tanol = developer('moersch-tanol', 'Moersch', 'Tanol');
      const speedy = developer('moersch-tanol-speed', 'Moersch', 'Tanol Speed');
      const on = buildRecipeIndex(
        [row('plain', hp5, tanol), row('speedy', hp5, speedy)],
        FILMS,
        [tanol, speedy]
      );
      expect(ids('tanol speed', on)).toEqual(['speedy']);
    });
  });

  describe('a bare number beside a named pair', () => {
    it.each(['hp5 rodinal 50', 'hp5 rodinal 25'])(
      '%s is not a speed: under 100 and unpublished',
      (query) => {
        expect(ids(query)).toEqual(ids('hp5 rodinal'));
      }
    );

    it.each([
      ['hp5 xtol 68', 'hp5 xtol'],
      ['hp5 xtol 20', 'hp5 xtol'],
      ['tri-x xtol 22', 'tri-x xtol'],
      ['hp5 xtol 450', 'hp5 xtol'],
    ])('%s reads as %s', (query, same) => {
      expect(ids(query)).toEqual(ids(same));
    });

    it('stays a speed when the pair publishes it', () => {
      expect(ids('panf d-76 25')).toEqual(['panf-d76-25']);
    });

    it('stays a speed when on the ISO series', () => {
      expect(ids('hp5 xtol 6400')).toEqual([]);
    });

    it('stays a speed with no developer named, or typed as one', () => {
      expect(ids('hp5 50')).toEqual([]);
      expect(ids('hp5 xtol at 50')).toEqual([]);
    });
  });

  describe('a maker beside a developer', () => {
    it('leaves the number a speed across films', () => {
      expect(idSet('kodak xtol 400')).toEqual(
        new Set([
          'hp5-xtol-400',
          'trix-xtol-20',
          'tmax400-xtol',
          'delta400-xtol-400',
          'grey-xtol-400',
        ])
      );
      expect(idSet('ilford dd-x 400')).toEqual(new Set(['delta400-ddx-400']));
      const speeds = searchRecipes('ilford dd-x 800', index).hits.map(
        (hit) => hit.view.combination.shootingIso
      );
      expect(new Set(speeds)).toEqual(new Set([800]));
    });

    it('does not count the maker as naming a film for the number rule', () => {
      expect(idSet('kodak xtol 50')).toEqual(idSet('xtol 50'));
      expect(ids('xtol 68')).toEqual([]);
      expect(ids('kodak xtol 68')).toEqual([]);
      const on = buildRecipeIndex(
        [...VIEWS, row('trix-xtol-800', triX, xtol, { iso: 800 })],
        FILMS,
        DEVELOPERS
      );
      expect(ids('kodak xtol 400 800', on)).toEqual([]);
      expect(ids('tri-x xtol 400 800', on)).toEqual(['trix-xtol-800']);
    });

    it('with no developer the number is still the film', () => {
      const films = new Set(
        searchRecipes('kodak 400', index, { limit: 100 }).hits.map(
          (hit) => hit.film.name
        )
      );
      expect(films).toEqual(new Set(['Tri-X 400', 'T-MAX/Ektapan 400']));
    });

    it('a word that names both the film and the developer still claims it', () => {
      const tanol100 = film('home-tanol-100', 'Home', 'Tanol 100', 100);
      const tanol = developer('moersch-tanol', 'Moersch', 'Tanol');
      const on = buildRecipeIndex(
        [
          row('t100-200', tanol100, tanol, { iso: 200 }),
          row('hp5-100', hp5, tanol, { iso: 100 }),
        ],
        [...FILMS, tanol100],
        [...DEVELOPERS, tanol]
      );
      expect(ids('100 tanol', on)).toEqual(['t100-200']);
    });

    it('a film named by its own words still claims the number', () => {
      expect(idSet('kodak tri-x xtol 400')).toEqual(
        new Set(['trix-xtol-20', 'trix-xtol-1600-24'])
      );
    });
  });

  describe('letter dilutions', () => {
    it.each([
      'hp5 hc-110 b',
      'hp5 hc110 b',
      'hp5 hc 110 b',
      'hp5 hc-110 dilution b',
    ])('%s is 1:31', (query) => {
      expect(ids(query)).toEqual(['hp5-hc110-400']);
    });

    it('reads hc-110 c as dilution C, not 110C', () => {
      expect(ids('hp5 hc-110 c')).toEqual(['hp5-hc110-c']);
    });

    it('takes the letter after Ilfotec HC', () => {
      expect(ids('delta 400 hc b')).toEqual(['delta400-hc-a', 'delta400-hc-b']);
    });
  });

  describe('a film word repeated as the developer', () => {
    it('tmy tmax leaves either T-MAX developer', () => {
      expect(ids('tmy tmax')).toEqual(['tmax400-rs', 'tmax400-tmaxdev']);
    });

    it.each([
      ['tmy tmax dev', ['tmax400-tmaxdev']],
      ['tmy in tmax dev', ['tmax400-tmaxdev']],
      ['tmy tmax developer', ['tmax400-tmaxdev']],
      ['tmax 100 tmax dev', ['tmax100-tmaxdev']],
    ])('%s names T-MAX Developer exactly', (query, expected) => {
      expect(ids(query)).toEqual(expected);
    });

    it('does not put T-MAX RS on top of an exact T-MAX Developer', () => {
      const on = buildRecipeIndex(
        [
          ...VIEWS,
          row('trix-rs', triX, tmaxRs, { minutes: 4.5 }),
          row('trix-tmaxdev', triX, tmaxDev, { dilution: '1+4', minutes: 6 }),
        ],
        FILMS,
        DEVELOPERS
      );
      expect(ids('tri-x t-max developer', on)).toEqual(['trix-tmaxdev']);
      expect(ids('tri-x tmax rs dev', on)).toEqual(['trix-rs']);
    });

    it('reads tmax dev and tmax developer the same, as that developer', () => {
      expect(ids('tmax dev')).toEqual(ids('tmax developer'));
      const developers = new Set(
        searchRecipes('tmax dev', index, { limit: 100 }).hits.map(
          (hit) => hit.developer.name
        )
      );
      expect(developers).toEqual(new Set(['T-MAX Developer']));
    });

    it('gives the word before it to a developer when one has it', () => {
      const makers = new Set(
        searchRecipes('ilford dev', index, { limit: 100 }).hits.map(
          (hit) => hit.developer.manufacturer
        )
      );
      expect(makers).toEqual(new Set(['Ilford']));
    });

    it('leaves a number after it a speed, not the film the word gave up', () => {
      const other = row('delta400-ddx-100', delta400, ddx, {
        iso: 100,
        dilution: '1+4',
        minutes: 5,
      });
      const on = buildRecipeIndex([...VIEWS, other], FILMS, DEVELOPERS);
      expect(ids('ilford dev 100', on)).toEqual([
        'delta400-ddx-100',
        'acros-id11',
      ]);
    });

    it('does not let the film keep a name it gave to the developer', () => {
      const tanol100 = film('home-tanol-100', 'Home', 'Tanol 100', 100);
      const tanol = developer('moersch-tanol', 'Moersch', 'Tanol');
      const on = buildRecipeIndex(
        [
          row('t100-200', tanol100, tanol, { iso: 200 }),
          row('hp5-100', hp5, tanol, { iso: 100 }),
        ],
        [...FILMS, tanol100],
        [...DEVELOPERS, tanol]
      );
      expect(ids('tanol dev 100', on)).toEqual(['hp5-100']);
      expect(ids('tanol dev 50', on)).toEqual([]);
    });

    it('ignores the word when no developer has what came before it', () => {
      expect(ids('hp5 developer')).toEqual(ids('hp5'));
    });
  });

  describe('duplicates', () => {
    it('shows both rows a source publishes at the same mix and speed', () => {
      expect(ids('delta 400 ilfotec hc')).toEqual([
        'delta400-hc-a',
        'delta400-hc-b',
      ]);
    });
  });

  describe('order and cap', () => {
    it('sorts fastest first', () => {
      const minutes = searchRecipes('xtol', index, { limit: 100 }).hits.map(
        (hit) => hit.view.combination.timeMinutes
      );
      expect(minutes).toEqual(minutes.toSorted((a, b) => a - b));
    });

    it('caps at 8 by default and says how many there were', () => {
      const result = searchRecipes('xtol', index);
      expect(result.hits).toHaveLength(8);
      expect(result.total).toBeGreaterThan(8);
      expect(result.truncated).toBe(true);
    });

    it('keeps the fastest when it caps', () => {
      const all = ids('xtol');
      const capped = searchRecipes('xtol', index, { limit: 3 });
      expect(capped.hits.map((hit) => hit.recipeId)).toEqual(all.slice(0, 3));
      expect(capped.total).toBe(all.length);
    });

    it('is not truncated when everything fits', () => {
      const result = searchRecipes('hp5 1600', index);
      expect(result.total).toBe(3);
      expect(result.truncated).toBe(false);
    });

    it('does not depend on input order', () => {
      const reversed = buildRecipeIndex(VIEWS.toReversed(), FILMS, DEVELOPERS);
      expect(ids('xtol', reversed)).toEqual(ids('xtol'));
      expect(ids('400', reversed)).toEqual(ids('400'));
    });
  });

  describe('scope', () => {
    const customRow = row(
      'custom-hp5-xtol',
      film('custom_film_d', 'Ilford', 'HP5 Plus', 400),
      xtol,
      { iso: 1600, minutes: 3 },
      'custom'
    );
    const all = buildRecipeIndex([...VIEWS, customRow], FILMS, DEVELOPERS);
    const none = () => false;

    it('keeps custom recipes out of official', () => {
      const official = filterRecipesByScope(all, 'official', none);
      expect(ids('hp5 1600', official)).not.toContain('custom-hp5-xtol');
      expect(ids('hp5 1600', all)).toContain('custom-hp5-xtol');
    });

    it('searches only custom recipes in custom', () => {
      const custom = filterRecipesByScope(all, 'custom', none);
      expect(ids('hp5', custom)).toEqual(['custom-hp5-xtol']);
    });

    it('searches only saved recipes in saved', () => {
      const saved = filterRecipesByScope(
        all,
        'saved',
        (id) => id === 'hp5-ddx-800'
      );
      expect(ids('hp5', saved)).toEqual(['hp5-ddx-800']);
      expect(ids('xtol', saved)).toEqual([]);
    });

    it('still reads delta 100 as the film when the scope hides its recipes', () => {
      const saved = filterRecipesByScope(
        all,
        'saved',
        (id) => id === 'delta400-xtol-100'
      );
      expect(ids('delta 100', saved)).toEqual([]);
    });
  });
});
