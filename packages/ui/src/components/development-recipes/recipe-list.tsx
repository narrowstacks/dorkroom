import type { DevelopmentCombinationView, RecipeRow } from '@dorkroom/logic';
import type { FC } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { RecipeOptionList } from './recipe-option-list';
import { recipeRowsToPickerOptions } from './recipe-picker-option';

export interface RecipeListProps {
  /** From `getRecipeRows`. Duplicates stay separate rows. */
  rows: readonly RecipeRow[];
  /** Id of the open recipe, from `recipeIdOf`. */
  currentId?: string | null;
  onSelect: (view: DevelopmentCombinationView) => void;
  /** The film's box speed, so a row can read "box speed" or "push +1". */
  boxIso?: number;
}

/** A film and developer pair's recipes, by dilution and EI, each with its time. */
export const RecipeList: FC<RecipeListProps> = ({
  rows,
  currentId,
  onSelect,
  boxIso,
}) => {
  const { unit } = useTemperature();
  if (rows.length === 0) return null;
  return (
    <RecipeOptionList
      label="Recipes for this film and developer"
      options={recipeRowsToPickerOptions(rows, { unit, boxIso })}
      currentValue={currentId}
      onSelect={(_value, index) => onSelect(rows[index].view)}
    />
  );
};
