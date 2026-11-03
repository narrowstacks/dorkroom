import type { Combination, Developer, Film } from '@dorkroom/api';
import { formatRecipeTime } from '@/components/development/recipe-format';

export interface RecentRecipeRow {
  id: string;
  title: string;
  detail: string;
}

/**
 * Names the recipes the user last opened, newest first. A recipe the catalog
 * no longer has (or has not loaded yet) is skipped rather than shown blank.
 */
export function recentRecipeRows(
  ids: readonly string[],
  catalog: {
    films?: readonly Film[];
    developers?: readonly Developer[];
    combinations?: readonly Combination[];
  }
): RecentRecipeRow[] {
  const { films = [], developers = [], combinations = [] } = catalog;
  return ids.flatMap((id) => {
    const recipe = combinations.find((c) => c.uuid === id);
    if (!recipe) return [];
    const film = films.find(
      (f) => f.slug === recipe.filmSlug || f.uuid === recipe.filmStockId
    );
    const developer = developers.find(
      (d) => d.slug === recipe.developerSlug || d.uuid === recipe.developerId
    );
    if (!film || !developer) return [];
    return [
      {
        id,
        title: `${film.brand} ${film.name}`.trim(),
        detail: `${developer.name}, ${formatRecipeTime(recipe.timeMinutes)} at ${recipe.shootingIso}`,
      },
    ];
  });
}
