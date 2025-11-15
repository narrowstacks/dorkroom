import { useMutation } from '@tanstack/react-query';
import {
  fetchFilmdevRecipe,
  FilmdevRecipe,
  FilmdevApiError,
} from '../../services/filmdev-api';

/**
 * Hook to import a recipe from filmdev.org
 * Handles fetching and error states
 */
export function useFilmdevImport() {
  return useMutation<FilmdevRecipe, FilmdevApiError, string>({
    mutationFn: (recipeId: string) => fetchFilmdevRecipe(recipeId),
  });
}
