import type { RecipeScope } from '@dorkroom/logic';
import type { FC } from 'react';
import { RecipeChoiceChips } from './recipe-choice-chips';

const SCOPES: ReadonlyArray<{ id: RecipeScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'official', label: 'Official' },
  { id: 'custom', label: 'Custom' },
  { id: 'saved', label: 'Saved' },
];

export interface RecipeScopeFilterProps {
  value: RecipeScope;
  onChange: (scope: RecipeScope) => void;
}

/**
 * Narrows the pickers and search to all, official, custom or saved recipes. All
 * four fit the side column's one row. They wrap rather than
 * scroll: a scrolled row hides "Saved" with no hint it is there.
 */
export const RecipeScopeFilter: FC<RecipeScopeFilterProps> = ({
  value,
  onChange,
}) => (
  <RecipeChoiceChips
    label="Show recipes"
    options={SCOPES}
    value={value}
    onChange={onChange}
  />
);
