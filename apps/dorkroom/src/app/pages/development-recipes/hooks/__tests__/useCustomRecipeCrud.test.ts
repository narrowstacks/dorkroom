import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipe, CustomRecipeFormData } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomRecipeCrud } from '../useCustomRecipeCrud';

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

const createMockDetailView = (
  recipe: CustomRecipe
): DevelopmentCombinationView => ({
  combination: {
    id: -1,
    uuid: recipe.id,
    name: recipe.name,
    filmStockId: recipe.filmId,
    filmSlug: recipe.filmId,
    developerId: recipe.developerId,
    developerSlug: recipe.developerId,
    temperatureF: recipe.temperatureF,
    temperatureC: ((recipe.temperatureF - 32) * 5) / 9,
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
  canShare: true,
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

describe('useCustomRecipeCrud', () => {
  let mockSetIsCustomModalOpen: ReturnType<typeof vi.fn>;
  let mockSetEditingRecipe: ReturnType<typeof vi.fn>;
  let mockSetIsSubmittingRecipe: ReturnType<typeof vi.fn>;
  let mockSetIsDetailOpen: ReturnType<typeof vi.fn>;
  let mockSetDetailView: ReturnType<typeof vi.fn>;
  let mockAddCustomRecipe: ReturnType<typeof vi.fn>;
  let mockUpdateCustomRecipe: ReturnType<typeof vi.fn>;
  let mockDeleteCustomRecipe: ReturnType<typeof vi.fn>;
  let mockRefreshCustomRecipes: ReturnType<typeof vi.fn>;
  let mockAddFavorite: ReturnType<typeof vi.fn>;
  let mockShowToast: ReturnType<typeof vi.fn>;
  let mockGetFilmById: ReturnType<typeof vi.fn>;
  let mockGetDeveloperById: ReturnType<typeof vi.fn>;
  let mockOpenDeleteConfirm: ReturnType<typeof vi.fn>;
  let mockCloseDeleteConfirm: ReturnType<typeof vi.fn>;
  let mockSetIsDeleting: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetIsCustomModalOpen = vi.fn();
    mockSetEditingRecipe = vi.fn();
    mockSetIsSubmittingRecipe = vi.fn();
    mockSetIsDetailOpen = vi.fn();
    mockSetDetailView = vi.fn();
    mockAddCustomRecipe = vi.fn().mockResolvedValue('new-recipe-id');
    mockUpdateCustomRecipe = vi.fn().mockResolvedValue(undefined);
    mockDeleteCustomRecipe = vi.fn().mockResolvedValue(undefined);
    mockRefreshCustomRecipes = vi.fn().mockResolvedValue([]);
    mockAddFavorite = vi.fn();
    mockShowToast = vi.fn();
    mockGetFilmById = vi.fn().mockReturnValue(mockFilm);
    mockGetDeveloperById = vi.fn().mockReturnValue(mockDeveloper);
    mockOpenDeleteConfirm = vi.fn();
    mockCloseDeleteConfirm = vi.fn();
    mockSetIsDeleting = vi.fn();
  });

  describe('handleCustomRecipeSubmit', () => {
    it('updates detailView after editing a recipe that is currently displayed', async () => {
      const originalRecipe = createMockCustomRecipe({
        id: 'recipe-to-edit',
        name: 'Original Name',
      });

      const updatedRecipe = createMockCustomRecipe({
        id: 'recipe-to-edit',
        name: 'Updated Recipe',
        temperatureF: 70,
        timeMinutes: 10,
        shootingIso: 800,
      });

      // Detail view is showing the recipe being edited
      const currentDetailView = createMockDetailView(originalRecipe);

      // After refresh, return the updated recipe
      mockRefreshCustomRecipes.mockResolvedValue([updatedRecipe]);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [originalRecipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: currentDetailView, // Editing the same recipe shown in detail
          detailView: currentDetailView,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: true,
        })
      );

      await act(async () => {
        await result.current.handleCustomRecipeSubmit(baseFormData);
      });

      // Verify detailView was updated with fresh data
      expect(mockSetDetailView).toHaveBeenCalled();
      const updatedDetailView = mockSetDetailView.mock.calls[0][0];
      expect(updatedDetailView.combination.name).toBe('Updated Recipe');
      expect(updatedDetailView.combination.temperatureF).toBe(70);
      expect(updatedDetailView.combination.timeMinutes).toBe(10);
      expect(updatedDetailView.combination.shootingIso).toBe(800);
      expect(updatedDetailView.source).toBe('custom');
      expect(updatedDetailView.canShare).toBe(true);
    });

    it('does not update detailView if a different recipe is displayed', async () => {
      const recipeBeingEdited = createMockCustomRecipe({
        id: 'recipe-to-edit',
        name: 'Recipe Being Edited',
      });

      const differentRecipe = createMockCustomRecipe({
        id: 'different-recipe',
        name: 'Different Recipe',
      });

      const updatedRecipe = createMockCustomRecipe({
        id: 'recipe-to-edit',
        name: 'Updated Recipe',
      });

      // Detail view is showing a DIFFERENT recipe
      const currentDetailView = createMockDetailView(differentRecipe);
      const editingView = createMockDetailView(recipeBeingEdited);

      mockRefreshCustomRecipes.mockResolvedValue([updatedRecipe]);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [recipeBeingEdited, differentRecipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: editingView,
          detailView: currentDetailView, // Different recipe is shown
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: true,
        })
      );

      await act(async () => {
        await result.current.handleCustomRecipeSubmit(baseFormData);
      });

      // setDetailView should NOT have been called since a different recipe is displayed
      expect(mockSetDetailView).not.toHaveBeenCalled();
    });

    it('does not update detailView when adding a new recipe', async () => {
      const newRecipe = createMockCustomRecipe({
        id: 'new-recipe-id',
        name: 'New Recipe',
      });

      mockAddCustomRecipe.mockResolvedValue('new-recipe-id');
      mockRefreshCustomRecipes.mockResolvedValue([newRecipe]);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: null, // No recipe being edited (adding new)
          detailView: null,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: true,
        })
      );

      await act(async () => {
        await result.current.handleCustomRecipeSubmit(baseFormData);
      });

      // setDetailView should NOT have been called for new recipes
      expect(mockSetDetailView).not.toHaveBeenCalled();
    });

    it('respects customRecipeSharingEnabled flag when updating detailView', async () => {
      const originalRecipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const updatedRecipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const currentDetailView = createMockDetailView(originalRecipe);

      mockRefreshCustomRecipes.mockResolvedValue([updatedRecipe]);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [originalRecipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: currentDetailView,
          detailView: currentDetailView,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: false, // Sharing disabled
        })
      );

      await act(async () => {
        await result.current.handleCustomRecipeSubmit(baseFormData);
      });

      const updatedDetailView = mockSetDetailView.mock.calls[0][0];
      expect(updatedDetailView.canShare).toBe(false);
    });

    it('closes modal and clears editing state after successful save', async () => {
      const originalRecipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const updatedRecipe = createMockCustomRecipe({ id: 'recipe-to-edit' });
      const currentDetailView = createMockDetailView(originalRecipe);

      mockRefreshCustomRecipes.mockResolvedValue([updatedRecipe]);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [originalRecipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: currentDetailView,
          detailView: currentDetailView,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: true,
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
      const view = createMockDetailView(recipe);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [recipe],
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: null,
          detailView: null,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: true,
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
      const view = createMockDetailView(recipe);

      const { result } = renderHook(() =>
        useCustomRecipeCrud({
          customRecipes: [], // Recipe not in list
          addCustomRecipe: mockAddCustomRecipe,
          updateCustomRecipe: mockUpdateCustomRecipe,
          deleteCustomRecipe: mockDeleteCustomRecipe,
          refreshCustomRecipes: mockRefreshCustomRecipes,
          addFavorite: mockAddFavorite,
          showToast: mockShowToast,
          editingRecipe: null,
          detailView: null,
          setIsCustomModalOpen: mockSetIsCustomModalOpen,
          setEditingRecipe: mockSetEditingRecipe,
          setIsSubmittingRecipe: mockSetIsSubmittingRecipe,
          setIsDetailOpen: mockSetIsDetailOpen,
          setDetailView: mockSetDetailView,
          deleteConfirmRecipe: null,
          openDeleteConfirm: mockOpenDeleteConfirm,
          closeDeleteConfirm: mockCloseDeleteConfirm,
          setIsDeleting: mockSetIsDeleting,
          getFilmById: mockGetFilmById,
          getDeveloperById: mockGetDeveloperById,
          customRecipeSharingEnabled: true,
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
