import type { RecipeSearchHit, RecipeSearchResult } from '@dorkroom/logic';
import type { FC, ReactNode, Ref } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';
import { recipeTitle } from './recipe-detail-shared';
import { RecipeOptionList } from './recipe-option-list';
import { titledRecipeToOption } from './recipe-picker-option';

export interface RecipeSearchResultsProps {
  /** What was searched. Blank shows nothing. */
  query: string;
  /** From `searchRecipes`, on that query. */
  result: RecipeSearchResult;
  onSelectHit: (hit: RecipeSearchHit) => void;
  /** Said when nothing matches, where "Try fewer words" would mislead. */
  emptyText?: string;
  /** The first result's button, for Enter in the search box to move to. */
  firstResultRef?: Ref<HTMLButtonElement>;
  /** The scrolling area, for a sheet that pins the search box above it. */
  className?: string;
  /** Drawn after the results, scrolling with them. */
  children?: ReactNode;
}

const statusText = (
  query: string,
  result: RecipeSearchResult,
  emptyText: string
) => {
  if (query.trim() === '') return '';
  if (result.total === 0) return emptyText;
  if (result.truncated) {
    return `Showing the fastest ${result.hits.length} of ${result.total}. Add a word to narrow it.`;
  }
  return result.total === 1
    ? '1 recipe.'
    : `${result.total} recipes, fastest first.`;
};

/** Search matches, fastest first, capped, with a note to narrow when cut short. */
export const RecipeSearchResults: FC<RecipeSearchResultsProps> = ({
  query,
  result,
  onSelectHit,
  emptyText = 'No recipes match. Try fewer words.',
  firstResultRef,
  className,
  children,
}) => {
  const { unit } = useTemperature();
  const hits = query.trim() === '' ? [] : result.hits;
  // The hit's own film and developer, never `view.film`: a rebrand-shared row
  // belongs to another film.
  const options = hits.map((hit) =>
    titledRecipeToOption({
      view: hit.view,
      title: recipeTitle(hit.film, hit.developer),
      dilution: hit.dilution,
      unit,
      showRoomTemperature: true,
    })
  );
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Always mounted: a live region inserted with its text is often skipped. */}
      <output className="block px-2 text-xs text-secondary">
        {statusText(query, result, emptyText)}
      </output>
      {hits.length > 0 && (
        <RecipeOptionList
          label="Search results"
          options={options}
          onSelect={(_value, index) => onSelectHit(hits[index])}
          rowRefValue={options[0]?.value}
          rowRef={firstResultRef}
        />
      )}
      {children}
    </div>
  );
};
