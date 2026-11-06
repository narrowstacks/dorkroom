import type { Film } from '@dorkroom/api';
import {
  type DevelopmentCombinationView,
  getKnownCombinationDilution,
} from '@dorkroom/logic';
import { type FC, useId } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { recipeTitle } from './recipe-detail-shared';
import { RecipeOptionList } from './recipe-option-list';
import { titledRecipeToOption } from './recipe-picker-option';

export interface SavedRecipe {
  view: DevelopmentCombinationView;
  /**
   * The film the shortcut opens. Wins over `view.film`, which can name a
   * rebrand sibling.
   */
  film?: Film | null;
}

export interface SavedRecipesProps {
  recipes: readonly SavedRecipe[];
  onSelect: (recipe: SavedRecipe) => void;
  /** Id of the open recipe, from `recipeIdOf`. */
  currentId?: string | null;
}

/** Saved recipes as one-tap shortcuts. Nothing at all when there are none. */
export const SavedRecipes: FC<SavedRecipesProps> = ({
  recipes,
  onSelect,
  currentId,
}) => {
  const { unit } = useTemperature();
  const headingId = useId();
  if (recipes.length === 0) return null;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-1 text-sm font-semibold text-primary">
        Saved recipes
      </h2>
      <RecipeOptionList
        options={recipes.map(({ view, film }) =>
          titledRecipeToOption({
            view,
            title: recipeTitle(
              film === undefined ? view.film : film,
              view.developer
            ),
            dilution: getKnownCombinationDilution(
              view.combination,
              view.developer
            ),
            unit,
          })
        )}
        currentValue={currentId}
        onSelect={(_value, index) => onSelect(recipes[index])}
      />
    </section>
  );
};
