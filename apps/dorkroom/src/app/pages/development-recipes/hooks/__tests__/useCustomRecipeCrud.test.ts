import type { Developer, Film } from '@dorkroom/api';
import {
  type CustomRecipe,
  type CustomRecipeFormData,
  roundTemperature,
  toCelsius,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  useCustomRecipeCrud,
  type UseCustomRecipeCrudProps,
} from '../useCustomRecipeCrud';

// Mock data
const mockFilm: Film = {
  id: 1,
  uuid: 'film-uuid-1',
  slug: 'test-film',
  brand: 'Test Brand',
  name: 'Test Film',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: 'fine',
  description: 'A test film',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockDeveloper: Developer = {
  id: 1,
  uuid: 'dev-uuid-1',
  slug: 'test-developer',
  name: 'Test Developer',
  manufacturer: 'Test Manufacturer',
  type: 'powder',
  description: 'A test developer',
  filmOrPaper: true,
  dilutions: [{ id: '1', name: 'Stock', dilution: 'Stock' }],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  imageCredit: null,
  imageSourceUrl: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createMockCustomRecipe = (
  overrides: Partial<CustomRecipe> = {}
): CustomRecipe => ({
  id: 'custom-recipe-1',
  name: 'Test Custom Recipe',
  filmId: 'film-uuid-1',
  developerId: 'dev-uuid-1',
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s every minute',
  notes: 'Test notes',
  customDilution: '',
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: new Date().toISOString(),
  dateModified: new Date().toISOString(),
  isPublic: false,
  tags: ['bw'],
  ...overrides,
});

const createMockView = (recipe: CustomRecipe): DevelopmentCombinationView => ({
  combination: {
    id: -1,
    uuid: recipe.id,
    name: recipe.name,
    filmStockId: recipe.filmId,
    filmSlug: recipe.filmId,
    developerId: recipe.developerId,
    developerSlug: recipe.developerId,
    temperatureF: recipe.temperatureF,
    temperatureC: roundTemperature(toCelsius(recipe.temperatureF)),
    timeMinutes: recipe.timeMinutes,
    shootingIso: recipe.shootingIso,
    pushPull: recipe.pushPull ?? 0,
    agitationMethod: 'Standard',
    agitationSchedule: recipe.agitationSchedule ?? null,
    notes: recipe.notes ?? null,
    customDilution: recipe.customDilution ?? null,
    dilutionId: null,
    createdAt: recipe.dateCreated,
    updatedAt: recipe.dateModified ?? recipe.dateCreated,
    tags: ['custom'],
    infoSource: null,
  },
  film: mockFilm,
  developer: mockDeveloper,
  source: 'custom',
});

const baseFormData: CustomRecipeFormData = {
  name: 'Updated Recipe',
  useExistingFilm: true,
  selectedFilmId: 'film-uuid-1',
  customFilm: undefined,
  useExistingDeveloper: true,
  selectedDeveloperId: 'dev-uuid-1',
  customDeveloper: undefined,
  temperatureF: 70,
  timeMinutes: 10,
  shootingIso: 800,
  pushPull: 1,
  agitationSchedule: '30s initial, 10s every minute',
  notes: 'Updated notes',
  selectedDilutionId: '',
  customDilution: '',
  isPublic: false,
  isFavorite: false,
};

// The delete-confirmation props are not exercised by the submit/edit tests.
const deleteConfirmProps = {
  deleteConfirmRecipe: null,
  openDeleteConfirm: vi.fn(),
  closeDeleteConfirm: vi.fn(),
  setIsDeleting: vi.fn(),
} satisfies Pick<
  UseCustomRecipeCrudProps,
  | 'deleteConfirmRecipe'
  | 'openDeleteConfirm'
  | 'closeDeleteConfirm'
  | 'setIsDeleting'
>;

describe('useCustomRecipeCrud', () => {
  let mockSetIsCustomModalOpen: Mock<
    UseCustomRecipeCrudProps['setIsCustomModalOpen']
  >;
  let mockSetEditingRecipe: Mock<UseCustomRecipeCrudProps['setEditingRecipe']>;
  let mockSetIsSubmittingRecipe: Mock<
    UseCustomRecipeCrudProps['setIsSubmittingRecipe']
  >;
  let mockAddCustomRecipe: Mock<UseCustomRecipeCrudProps['addCustomRecipe']>;
  let mockUpdateCustomRecipe: Mock<
    UseCustomRecipeCrudProps['updateCustomRecipe']
  >;
  let mockDeleteCustomRecipe: Mock<
    UseCustomRecipeCrudProps['deleteCustomRecipe']
  >;
  let mockAddFavorite: Mock<UseCustomRecipeCrudProps['addFavorite']>;
  let mockShowToast: Mock<UseCustomRecipeCrudProps['showToast']>;

  beforeEach(() => {
    mockSetIsCustomModalOpen = vi.fn();
    mockSetEditingRecipe = vi.fn();
    mockSetIsSubmittingRecipe = vi.fn();
    mockAddCustomRecipe = vi.fn().mockReturnValue('new-recipe-id');
    mockUpdateCustomRecipe = vi
      .fn()
      .mockImplementation((id: string) => createMockCustomRecipe({ id }));
    mockDeleteCustomRecipe = vi.fn();
    mockAddFavorite = vi.fn();
    mockShowToast = vi.fn();
  });

  describe('handleCustomRecipeSubmit', () => {
    it('closes modal and clears editing state after successful save', async () => {
      const originalRecipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const updatedRecipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const currentView = createMockView(originalRecipe);

      mockUpdateCustomRecipe.mockReturnValue(updatedRecipe);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [originalRecipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: currentView,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          ...deleteConfirmProps,
        })
      );

      await act(async () => {
        await result.current.handleCustomRecipeSubmit(baseFormData);
      });

      expect(mockSetIsCustomModalOpen).toHaveBeenCalledWith(false);
      expect(mockSetEditingRecipe).toHaveBeenCalledWith(null);
      expect(mockSetIsSubmittingRecipe).toHaveBeenCalledWith(false);
    });
  });

  describe('handleEditCustomRecipe', () => {
    it('opens edit modal with the recipe to edit', () => {
      const recipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const view = createMockView(recipe);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [recipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: null,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          ...deleteConfirmProps,
        })
      );

      act(() => {
        result.current.handleEditCustomRecipe(view);
      });

      expect(mockSetEditingRecipe).toHaveBeenCalledWith(view);
      expect(mockSetIsCustomModalOpen).toHaveBeenCalledWith(true);
    });

    it('does not open modal if recipe is not found in customRecipes', () => {
      const recipe = createMockCustomRecipe({ id: 'non-existent-recipe' });
      const view = createMockView(recipe);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [], // Recipe not in list
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: null,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          ...deleteConfirmProps,
        })
      );

      act(() => {
        result.current.handleEditCustomRecipe(view);
      });

      expect(mockSetEditingRecipe).not.toHaveBeenCalled();
      expect(mockSetIsCustomModalOpen).not.toHaveBeenCalled();
    });
  });
});
