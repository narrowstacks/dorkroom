import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debugLog, debugError } from "@/utils/debugLogger";
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from "@/types/customRecipeTypes";

const STORAGE_KEY = "customRecipes";

export const useCustomRecipes = () => {
  const [customRecipes, setCustomRecipes] = useState<CustomRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stateVersion, setStateVersion] = useState(0);

  // Simple function to load recipes from storage
  const loadRecipes = useCallback(async () => {
    debugLog("[useCustomRecipes] Loading recipes from storage...");
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const recipes = json ? JSON.parse(json) : [];
      debugLog(
        "[useCustomRecipes] Loaded recipes from storage:",
        recipes.length,
        "recipes",
      );
      setCustomRecipes(recipes);
      setStateVersion((prev) => prev + 1); // Increment version to force re-renders
      return recipes;
    } catch (error) {
      debugError("[useCustomRecipes] Error loading recipes:", error);
      setCustomRecipes([]);
      setStateVersion((prev) => prev + 1); // Increment even on error to ensure consistency
      return [];
    }
  }, []);

  // Simple function to save recipes to storage
  const saveRecipes = useCallback(async (recipes: CustomRecipe[]) => {
    debugLog(
      "[useCustomRecipes] Saving recipes to storage:",
      recipes.length,
      "recipes",
    );
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
      debugLog("[useCustomRecipes] Successfully saved recipes to storage");
    } catch (error) {
      debugError("[useCustomRecipes] Error saving recipes:", error);
      throw error;
    }
  }, []);

  // Load recipes on mount
  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // Add a new custom recipe
  const addCustomRecipe = useCallback(
    async (formData: CustomRecipeFormData): Promise<string> => {
      debugLog("[useCustomRecipes] Adding new recipe");
      setIsLoading(true);

      try {
        // Load current recipes from storage to ensure we have the latest data
        const currentRecipes = await loadRecipes();

        // Validate film selection
        const filmId = formData.useExistingFilm
          ? formData.selectedFilmId || `fallback_film_${Date.now()}`
          : `custom_film_${Date.now()}`;

        // Validate developer selection
        const developerId = formData.useExistingDeveloper
          ? formData.selectedDeveloperId || `fallback_dev_${Date.now()}`
          : `custom_dev_${Date.now()}`;

        // Create new recipe
        const newRecipe: CustomRecipe = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          name: formData.name,
          filmId,
          developerId,
          temperatureF: formData.temperatureF,
          timeMinutes: formData.timeMinutes,
          shootingIso: formData.shootingIso,
          pushPull: formData.pushPull,
          agitationSchedule: formData.agitationSchedule,
          notes: formData.notes,
          customDilution: formData.customDilution,
          isCustomFilm: !formData.useExistingFilm,
          isCustomDeveloper: !formData.useExistingDeveloper,
          customFilm: formData.customFilm,
          customDeveloper: formData.customDeveloper,
          dateCreated: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          isPublic: formData.isPublic,
        };

        debugLog("[useCustomRecipes] Created new recipe:", newRecipe.id);

        // Add to recipes and save
        const updatedRecipes = [...currentRecipes, newRecipe];
        await saveRecipes(updatedRecipes);

        // Reload from storage to ensure state consistency
        await loadRecipes();

        debugLog("[useCustomRecipes] Successfully added recipe:", newRecipe.id);
        return newRecipe.id;
      } catch (error) {
        debugError("[useCustomRecipes] Error adding recipe:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecipes, saveRecipes],
  );

  // Update an existing custom recipe
  const updateCustomRecipe = useCallback(
    async (id: string, formData: CustomRecipeFormData): Promise<void> => {
      debugLog("[useCustomRecipes] Updating recipe:", id);
      setIsLoading(true);

      try {
        // Load current recipes from storage to ensure we have the latest data
        const currentRecipes = await loadRecipes();

        // Find and update the recipe
        const recipeIndex = currentRecipes.findIndex(
          (recipe: CustomRecipe) => recipe.id === id,
        );
        if (recipeIndex === -1) {
          throw new Error(`Recipe with id ${id} not found`);
        }

        const existingRecipe = currentRecipes[recipeIndex];

        // Validate film selection
        const filmId = formData.useExistingFilm
          ? formData.selectedFilmId ||
            existingRecipe.filmId ||
            `fallback_film_${Date.now()}`
          : existingRecipe.filmId;

        // Validate developer selection
        const developerId = formData.useExistingDeveloper
          ? formData.selectedDeveloperId ||
            existingRecipe.developerId ||
            `fallback_dev_${Date.now()}`
          : existingRecipe.developerId;

        const updatedRecipe: CustomRecipe = {
          ...existingRecipe,
          name: formData.name,
          filmId,
          developerId,
          temperatureF: formData.temperatureF,
          timeMinutes: formData.timeMinutes,
          shootingIso: formData.shootingIso,
          pushPull: formData.pushPull,
          agitationSchedule: formData.agitationSchedule,
          notes: formData.notes,
          customDilution: formData.customDilution,
          isCustomFilm: !formData.useExistingFilm,
          isCustomDeveloper: !formData.useExistingDeveloper,
          customFilm: formData.customFilm,
          customDeveloper: formData.customDeveloper,
          dateModified: new Date().toISOString(),
        };

        debugLog("[useCustomRecipes] Updated recipe data:", {
          id: updatedRecipe.id,
          temperatureF: updatedRecipe.temperatureF,
          dateModified: updatedRecipe.dateModified,
        });

        // Update the recipe in the array
        const updatedRecipes = [...currentRecipes];
        updatedRecipes[recipeIndex] = updatedRecipe;

        // Save to storage
        await saveRecipes(updatedRecipes);

        // Reload from storage to ensure state consistency
        await loadRecipes();

        debugLog("[useCustomRecipes] Successfully updated recipe:", id);
      } catch (error) {
        debugError("[useCustomRecipes] Error updating recipe:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecipes, saveRecipes],
  );

  // Delete a custom recipe
  const deleteCustomRecipe = useCallback(
    async (id: string): Promise<void> => {
      debugLog("[useCustomRecipes] Deleting recipe:", id);
      setIsLoading(true);

      try {
        // Load current recipes from storage
        debugLog("[useCustomRecipes] Loading current recipes from storage...");
        const currentRecipes = await loadRecipes();
        debugLog(
          "[useCustomRecipes] Loaded",
          currentRecipes.length,
          "recipes from storage",
        );

        // Check if recipe exists before deletion
        const recipeExists = currentRecipes.some(
          (recipe: CustomRecipe) => recipe.id === id,
        );
        debugLog(
          "[useCustomRecipes] Recipe exists before deletion:",
          recipeExists,
        );

        if (!recipeExists) {
          console.warn("[useCustomRecipes] Recipe not found for deletion:", id);
          return;
        }

        // Filter out the recipe to delete
        const updatedRecipes = currentRecipes.filter(
          (recipe: CustomRecipe) => recipe.id !== id,
        );
        debugLog(
          "[useCustomRecipes] Filtered recipes, count reduced from",
          currentRecipes.length,
          "to",
          updatedRecipes.length,
        );

        // Save updated recipes
        debugLog("[useCustomRecipes] Saving updated recipes to storage...");
        await saveRecipes(updatedRecipes);
        debugLog(
          "[useCustomRecipes] Successfully saved updated recipes to storage",
        );

        // Reload from storage to update component state
        debugLog(
          "[useCustomRecipes] Reloading recipes from storage to update state...",
        );
        await loadRecipes();
        debugLog(
          "[useCustomRecipes] Successfully reloaded recipes from storage",
        );

        debugLog("[useCustomRecipes] Successfully deleted recipe:", id);
      } catch (error) {
        debugError("[useCustomRecipes] Error deleting recipe:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecipes, saveRecipes],
  );

  // Clear all custom recipes
  const clearAllCustomRecipes = useCallback(async (): Promise<void> => {
    debugLog("[useCustomRecipes] Clearing all recipes");
    setIsLoading(true);

    try {
      await saveRecipes([]);
      await loadRecipes();
      debugLog("[useCustomRecipes] Successfully cleared all recipes");
    } catch (error) {
      debugError("[useCustomRecipes] Error clearing recipes:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadRecipes, saveRecipes]);

  // Force refresh - just reload from storage
  const forceRefresh = useCallback(async () => {
    debugLog(
      "[useCustomRecipes] Force refresh triggered - reloading all recipes from storage",
    );
    const recipes = await loadRecipes();
    debugLog(
      "[useCustomRecipes] Force refresh completed - loaded",
      recipes.length,
      "recipes",
    );
    return recipes;
  }, [loadRecipes]);

  debugLog(
    "[useCustomRecipes] Hook render - returning:",
    customRecipes.length,
    "recipes",
  );
  debugLog(
    "[useCustomRecipes] Detailed recipes data:",
    customRecipes.map((recipe: CustomRecipe) => ({
      id: recipe.id,
      name: recipe.name,
      temperatureF: recipe.temperatureF,
      dateModified: recipe.dateModified,
    })),
  );

  return {
    customRecipes,
    isLoading,
    stateVersion,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    clearAllCustomRecipes,
    forceRefresh,
  };
};
