import type { Combination, Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipe,
  CustomRecipeFormData,
  ImportedCustomRecipe,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRecipeCodeImport } from '../useRecipeCodeImport';
import { useSharedRecipeImport } from '../useSharedRecipeImport';

// Regression tests for #322: importing a recipe must carry its dropdown
// dilution (`dilutionId`) into the saved form data, or it displays as Stock.

const DILUTION_ID = '69affee4-6a3f-44d2-8ec3-1dc83eca7449';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const makeFilm = (overrides: Partial<Film>): Film => ({
  id: 1,
  uuid: 'film-uuid-1',
  slug: 'kodak-tri-x',
  brand: 'Kodak',
  name: 'Tri-X',
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
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const makeDeveloper = (overrides: Partial<Developer>): Developer => ({
  id: 1,
  uuid: 'dev-uuid-1',
  slug: 'kodak-hc-110',
  name: 'HC-110',
  manufacturer: 'Kodak',
  type: 'liquid',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const film = makeFilm({});
const developer = makeDeveloper({
  uuid: 'dev-uuid-1',
  dilutions: [{ id: DILUTION_ID, name: 'B', dilution: '1+31' }],
});

const combination: Combination = {
  id: 42,
  uuid: 'combo-uuid',
  name: 'HC-110 B',
  filmStockId: film.uuid,
  filmSlug: 'film',
  developerId: developer.uuid,
  developerSlug: 'hc-110',
  shootingIso: 400,
  dilutionId: DILUTION_ID,
  customDilution: null,
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 5,
  agitationMethod: 'Standard',
  agitationSchedule: null,
  pushPull: 0,
  tags: null,
  notes: null,
  infoSource: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const renderSharedImport = (source: 'shared' | 'custom') => {
  const addCustomRecipe = vi.fn<
    (data: CustomRecipeFormData) => Promise<string>
  >(async () => 'new-id');
  const view: DevelopmentCombinationView = {
    combination,
    film,
    developer,
    source: source === 'custom' ? 'custom' : 'api',
  };
  const { result } = renderHook(() =>
    useSharedRecipeImport({
      addCustomRecipe,
      refreshCustomRecipes: async (): Promise<CustomRecipe[]> => [],
      sharedRecipeView: view,
      sharedRecipeSource: source,
      setIsSharedRecipeModalOpen: vi.fn(),
      setSharedRecipeView: vi.fn(),
      setIsAddingSharedRecipe: vi.fn(),
      showToast: vi.fn(),
    })
  );
  return { result, addCustomRecipe };
};

describe('recipe imports keep the dropdown dilution (#322)', () => {
  it('carries dilutionId when saving a shared API recipe', async () => {
    const { result, addCustomRecipe } = renderSharedImport('shared');

    await act(async () => {
      await result.current.handleAcceptSharedRecipe();
    });

    expect(addCustomRecipe).toHaveBeenCalledOnce();
    expect(addCustomRecipe.mock.calls[0][0].selectedDilutionId).toBe(
      DILUTION_ID
    );
  });

  it('carries dilutionId when saving a shared custom recipe', async () => {
    const { result, addCustomRecipe } = renderSharedImport('custom');

    await act(async () => {
      await result.current.handleAcceptSharedRecipe();
    });

    expect(addCustomRecipe).toHaveBeenCalledOnce();
    expect(addCustomRecipe.mock.calls[0][0].selectedDilutionId).toBe(
      DILUTION_ID
    );
  });

  it('carries dilutionId when importing a recipe code', async () => {
    const addCustomRecipe = vi.fn<
      (data: CustomRecipeFormData) => Promise<string>
    >(async () => 'new-id');
    const imported: ImportedCustomRecipe = {
      encodedData: 'code',
      isValid: true,
      recipe: {
        name: 'HC-110 B',
        filmId: film.uuid,
        developerId: developer.uuid,
        temperatureF: 68,
        timeMinutes: 5,
        shootingIso: 400,
        pushPull: 0,
        dilutionId: DILUTION_ID,
        customDilution: '',
        isCustomFilm: false,
        isCustomDeveloper: false,
        isPublic: false,
      },
    };

    const { result } = renderHook(() =>
      useRecipeCodeImport({
        addCustomRecipe,
        refreshCustomRecipes: async (): Promise<CustomRecipe[]> => [],
        decodeSharedCustomRecipe: () => imported,
        getFilmById: (id) => (id === film.uuid ? film : undefined),
        getDeveloperById: (id) =>
          id === developer.uuid ? developer : undefined,
        setIsImportModalOpen: vi.fn(),
        setIsImporting: vi.fn(),
        setImportError: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleCodeImport('code');
    });

    expect(addCustomRecipe).toHaveBeenCalledOnce();
    expect(addCustomRecipe.mock.calls[0][0].selectedDilutionId).toBe(
      DILUTION_ID
    );
  });
});
