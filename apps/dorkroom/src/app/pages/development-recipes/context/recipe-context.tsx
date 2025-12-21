import type { Developer, Film } from '@dorkroom/api';
import type {
  CustomRecipe,
  CustomRecipeFormData,
  FilmdevMappingResult,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * Modal state for the development recipes page.
 * Contains all modal open/close states and associated data.
 */
export interface RecipeModalsState {
  // Detail drawer
  isDetailOpen: boolean;
  detailView: DevelopmentCombinationView | null;

  // Custom recipe modal
  isCustomModalOpen: boolean;
  editingRecipe: DevelopmentCombinationView | null;
  isSubmittingRecipe: boolean;

  // Import modal
  isImportModalOpen: boolean;
  importError: string | null;
  isImporting: boolean;

  // Filmdev preview
  isFilmdevPreviewOpen: boolean;
  filmdevPreviewData: FilmdevMappingResult | null;
  filmdevPreviewRecipe: DevelopmentCombinationView | null;

  // Shared recipe modal
  isSharedRecipeModalOpen: boolean;
  sharedRecipeView: DevelopmentCombinationView | null;
  sharedRecipeSource: 'shared' | 'custom';
  isAddingSharedRecipe: boolean;
}

/**
 * Actions available for modals.
 * These control opening, closing, and data updates for modals.
 */
export interface RecipeModalsActions {
  openDetailDrawer: (view: DevelopmentCombinationView) => void;
  closeDetailDrawer: () => void;
  openCustomRecipeModal: (recipe?: DevelopmentCombinationView) => void;
  closeCustomRecipeModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  openFilmdevPreview: (
    data: FilmdevMappingResult,
    recipe: DevelopmentCombinationView
  ) => void;
  closeFilmdevPreview: () => void;
  openSharedRecipeModal: (
    view: DevelopmentCombinationView,
    source: 'shared' | 'custom'
  ) => void;
  closeSharedRecipeModal: () => void;
}

/**
 * Recipe data and CRUD operations.
 */
export interface RecipeDataState {
  customRecipes: CustomRecipe[];
  allFilms: Film[];
  allDevelopers: Developer[];
  getFilmById: (id: string) => Film | undefined;
  getDeveloperById: (id: string) => Developer | undefined;
}

/**
 * Recipe action handlers.
 * These are the main actions users can take on recipes.
 */
export interface RecipeActions {
  // CRUD operations
  addCustomRecipe: (data: CustomRecipeFormData) => Promise<string>;
  updateCustomRecipe: (id: string, data: CustomRecipeFormData) => Promise<void>;
  deleteCustomRecipe: (id: string) => Promise<void>;
  refreshCustomRecipes: () => Promise<unknown>;

  // Recipe interactions
  handleOpenDetail: (view: DevelopmentCombinationView) => void;
  handleShareCombination: (view: DevelopmentCombinationView) => Promise<void>;
  handleCopyCombination: (view: DevelopmentCombinationView) => Promise<void>;
  handleCustomRecipeSubmit: (data: CustomRecipeFormData) => Promise<void>;
  handleEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  handleDeleteCustomRecipe: (view: DevelopmentCombinationView) => Promise<void>;

  // Favorites
  isFavorite: (id: string) => boolean;
  handleCheckFavorite: (view: DevelopmentCombinationView) => boolean;
  handleToggleFavorite: (view: DevelopmentCombinationView) => void;

  // Shared recipe handling
  handleAcceptSharedRecipe: () => Promise<void>;
  handleDeclineSharedRecipe: () => void;

  // Import handling
  handleImportRecipe: (input: string) => Promise<void>;
  handleCloseFilmdevPreview: () => void;
  handleConfirmFilmdevImport: () => Promise<void>;

  // Data refresh
  handleRefreshAll: () => Promise<void>;
}

/**
 * UI state like mobile detection, animations, etc.
 */
export interface RecipeUIState {
  isMobile: boolean;
  animationsEnabled: boolean;
  favoriteTransitions: Map<string, 'adding' | 'removing'>;
  pageIndex: number;
  showToast: (message: string, type: 'success' | 'error') => void;
}

/**
 * Combined context value for the recipe system.
 * Split into logical groups for better organization and potential memoization.
 */
export interface RecipeContextValue {
  modals: RecipeModalsState & RecipeModalsActions;
  data: RecipeDataState;
  actions: RecipeActions;
  ui: RecipeUIState;
}

/**
 * Context for recipe modals state and actions.
 * Separated to allow independent updates.
 */
export const RecipeModalsContext = createContext<
  (RecipeModalsState & RecipeModalsActions) | null
>(null);

/**
 * Context for recipe data.
 * Separated to allow independent updates.
 */
export const RecipeDataContext = createContext<RecipeDataState | null>(null);

/**
 * Context for recipe actions.
 * Actions are stable references that don't change often.
 */
export const RecipeActionsContext = createContext<RecipeActions | null>(null);

/**
 * Context for UI state.
 * Contains mobile detection, animations, etc.
 */
export const RecipeUIContext = createContext<RecipeUIState | null>(null);

/**
 * Hook to access recipe modals state and actions.
 * Must be used within a RecipeProvider.
 */
export function useRecipeModalsContext() {
  const context = useContext(RecipeModalsContext);
  if (!context) {
    throw new Error(
      'useRecipeModalsContext must be used within a RecipeProvider'
    );
  }
  return context;
}

/**
 * Hook to access recipe data.
 * Must be used within a RecipeProvider.
 */
export function useRecipeDataContext() {
  const context = useContext(RecipeDataContext);
  if (!context) {
    throw new Error(
      'useRecipeDataContext must be used within a RecipeProvider'
    );
  }
  return context;
}

/**
 * Hook to access recipe actions.
 * Must be used within a RecipeProvider.
 */
export function useRecipeActionsContext() {
  const context = useContext(RecipeActionsContext);
  if (!context) {
    throw new Error(
      'useRecipeActionsContext must be used within a RecipeProvider'
    );
  }
  return context;
}

/**
 * Hook to access UI state.
 * Must be used within a RecipeProvider.
 */
export function useRecipeUIContext() {
  const context = useContext(RecipeUIContext);
  if (!context) {
    throw new Error('useRecipeUIContext must be used within a RecipeProvider');
  }
  return context;
}

/**
 * Props for the RecipeProvider component.
 */
export interface RecipeProviderProps {
  children: ReactNode;
  modals: RecipeModalsState & RecipeModalsActions;
  data: RecipeDataState;
  actions: RecipeActions;
  ui: RecipeUIState;
}

/**
 * Provider component that makes recipe context available to children.
 *
 * This allows incremental adoption: wrap parts of the component tree
 * with this provider to enable context-based access to recipe state.
 *
 * @example
 * ```tsx
 * <RecipeProvider modals={modals} data={data} actions={actions} ui={ui}>
 *   <RecipeModals />
 *   <RecipeResultsSection />
 * </RecipeProvider>
 * ```
 */
export function RecipeProvider({
  children,
  modals,
  data,
  actions,
  ui,
}: RecipeProviderProps) {
  return (
    <RecipeModalsContext.Provider value={modals}>
      <RecipeDataContext.Provider value={data}>
        <RecipeActionsContext.Provider value={actions}>
          <RecipeUIContext.Provider value={ui}>
            {children}
          </RecipeUIContext.Provider>
        </RecipeActionsContext.Provider>
      </RecipeDataContext.Provider>
    </RecipeModalsContext.Provider>
  );
}
