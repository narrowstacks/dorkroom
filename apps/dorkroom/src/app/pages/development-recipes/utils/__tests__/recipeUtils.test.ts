import type { Developer, Film } from '@dorkroom/api';
import {
  createCombinationFromCustomRecipe,
  createCustomRecipeStore,
  createMemoryRecipeAdapter,
  type CustomRecipe,
  type CustomRecipeFormData,
  getCustomRecipeDeveloper,
  getCustomRecipeFilm,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { describe, expect, it } from 'vitest';
import {
  convertRecipeToFormData,
  CUSTOM_RECIPE_FORM_DEFAULT,
} from '../recipeUtils';

const stamp = '2024-01-01T00:00:00.000Z';
const catalogueFilm: Film = {
  id: 1,
  uuid: 'film-uuid',
  slug: 'film',
  brand: 'Cat',
  name: 'Film',
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
  dateAdded: stamp,
  createdAt: stamp,
  updatedAt: stamp,
};
const catalogueDeveloper: Developer = {
  id: 1,
  uuid: 'dev-uuid',
  slug: 'dev',
  name: 'Dev',
  manufacturer: 'Cat',
  type: 'powder',
  description: '',
  filmOrPaper: true,
  dilutions: [{ id: '1', name: 'Stock', dilution: 'Stock' }],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: stamp,
  updatedAt: stamp,
};

const getFilmById = (id: string) =>
  id === catalogueFilm.uuid ? catalogueFilm : undefined;
const getDeveloperById = (id: string) =>
  id === catalogueDeveloper.uuid ? catalogueDeveloper : undefined;

const viewOf = (recipe: CustomRecipe): DevelopmentCombinationView => ({
  combination: createCombinationFromCustomRecipe(recipe),
  film: getCustomRecipeFilm(recipe.id, [recipe], getFilmById),
  developer: getCustomRecipeDeveloper(recipe.id, [recipe], getDeveloperById),
  source: 'custom',
});

const customFilm = {
  brand: 'Home',
  name: 'Brew',
  isoSpeed: 200,
  colorType: 'bw' as const,
  grainStructure: '',
  description: '',
};
const customDeveloper = {
  manufacturer: 'Home',
  name: 'Soup',
  type: 'powder' as const,
  filmOrPaper: 'film' as const,
  dilutions: [{ name: 'Stock', dilution: 'Stock' }],
};

const storedRecipe = (overrides: Partial<CustomRecipe>): CustomRecipe => ({
  id: 'custom_1',
  name: 'R',
  filmId: 'film-uuid',
  developerId: 'dev-uuid',
  temperatureF: 68,
  timeMinutes: 9,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateModified: '2024-01-01T00:00:00.000Z',
  isPublic: false,
  ...overrides,
});

describe('convertRecipeToFormData custom flags (#510)', () => {
  it('loads a catalogue recipe as existing film and developer', () => {
    const recipe = storedRecipe({});
    const form = convertRecipeToFormData(viewOf(recipe), recipe);
    expect(form.useExistingFilm).toBe(true);
    expect(form.selectedFilmId).toBe('film-uuid');
    expect(form.useExistingDeveloper).toBe(true);
    expect(form.selectedDeveloperId).toBe('dev-uuid');
  });

  it('loads a prefixed custom recipe as custom', () => {
    const recipe = storedRecipe({
      filmId: 'custom_film_9',
      developerId: 'custom_dev_9',
      isCustomFilm: true,
      isCustomDeveloper: true,
      customFilm,
      customDeveloper,
    });
    const form = convertRecipeToFormData(viewOf(recipe), recipe);
    expect(form.useExistingFilm).toBe(false);
    expect(form.customFilm?.name).toBe('Brew');
    expect(form.useExistingDeveloper).toBe(false);
    expect(form.customDeveloper?.name).toBe('Soup');
  });

  it('trusts the flag over the id for the already-broken stored shape', () => {
    const recipe = storedRecipe({
      isCustomFilm: true,
      isCustomDeveloper: true,
      customFilm,
      customDeveloper,
    });
    const form = convertRecipeToFormData(viewOf(recipe), recipe);
    expect(form.useExistingFilm).toBe(false);
    expect(form.selectedFilmId).toBe('');
    expect(form.customFilm?.name).toBe('Brew');
    expect(form.useExistingDeveloper).toBe(false);
    expect(form.customDeveloper?.name).toBe('Soup');
  });

  it('falls back to the id prefix when there is no stored record', () => {
    const recipe = storedRecipe({
      filmId: 'custom_film_9',
      developerId: 'custom_dev_9',
    });
    const form = convertRecipeToFormData({
      combination: createCombinationFromCustomRecipe(recipe),
      source: 'custom',
    });
    expect(form.useExistingFilm).toBe(false);
    expect(form.useExistingDeveloper).toBe(false);
  });
});

describe('editing a custom recipe twice keeps the custom film (#510)', () => {
  it('survives catalogue -> custom -> unchanged re-save', () => {
    const store = createCustomRecipeStore(createMemoryRecipeAdapter());
    const created = store.add({
      ...CUSTOM_RECIPE_FORM_DEFAULT,
      name: 'Round trip',
      selectedFilmId: 'film-uuid',
      selectedDeveloperId: 'dev-uuid',
    });

    // First edit: switch to a custom film and developer.
    const switched: CustomRecipeFormData = {
      ...convertRecipeToFormData(viewOf(created), created),
      useExistingFilm: false,
      selectedFilmId: '',
      customFilm,
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper,
    };
    const afterFirst = store.update(created.id, switched);

    // Second edit: open the form and save without changes.
    const reopened = convertRecipeToFormData(viewOf(afterFirst), afterFirst);
    expect(reopened.useExistingFilm).toBe(false);
    expect(reopened.useExistingDeveloper).toBe(false);
    const afterSecond = store.update(created.id, reopened);

    expect(afterSecond.isCustomFilm).toBe(true);
    expect(afterSecond.customFilm?.name).toBe('Brew');
    expect(afterSecond.filmId).toBe(afterFirst.filmId);
    expect(afterSecond.isCustomDeveloper).toBe(true);
    expect(afterSecond.customDeveloper?.name).toBe('Soup');
  });

  it('repairs a recipe saved in the broken state on the next save', () => {
    const broken = storedRecipe({
      isCustomFilm: true,
      isCustomDeveloper: true,
      customFilm,
      customDeveloper,
    });
    const store = createCustomRecipeStore(createMemoryRecipeAdapter([broken]));
    const saved = store.update(
      broken.id,
      convertRecipeToFormData(viewOf(broken), broken)
    );

    expect(saved.filmId).toMatch(/^custom_film_/);
    expect(saved.developerId).toMatch(/^custom_dev_/);
    expect(saved.customFilm?.name).toBe('Brew');
    // And it keeps loading as custom afterwards.
    expect(convertRecipeToFormData(viewOf(saved), saved).useExistingFilm).toBe(
      false
    );
  });
});
