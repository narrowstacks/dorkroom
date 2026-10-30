import { useMutation } from '@tanstack/react-query';
import {
  fetchFilmdevRecipe,
  type FilmdevApiError,
  type FilmdevRecipe,
} from '../../services/filmdev-api';

/**
 * Hook to import a recipe from filmdev.org
 * Handles fetching and error states
 */
export function useFilmdevImport() {
  // eslint-disable-next-line react-doctor/query-mutation-missing-invalidation -- read-only fetch of a remote filmdev.org recipe; there is no cached server state to invalidate
  return useMutation<FilmdevRecipe, FilmdevApiError, string>({
    mutationFn: (recipeId: string) => fetchFilmdevRecipe(recipeId),
  });
}
