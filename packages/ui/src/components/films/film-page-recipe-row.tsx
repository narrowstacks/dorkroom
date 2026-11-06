import {
  type FilmRecipe,
  formatTemperatureWithUnit,
  isNonStandardTemperature,
} from '@dorkroom/logic';
import type { FC } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTime } from '../development-recipes/recipe-detail-shared';
import { RecipeTemperatureChip } from '../development-recipes/recipe-temperature-chip';
import { Skeleton } from '../ui/skeleton';

interface FilmPageRecipeRowProps {
  recipe: FilmRecipe;
  /** Slug of the film whose page this is, so a rebrand-shared row opens under it. */
  filmSlug: string;
  /** Developer names and dilutions are resolved; false shows a skeleton in their place. */
  developersReady: boolean;
  /** Called when the row is clicked, before the browser follows the link. */
  onOpen?: () => void;
}

/** One recipe on a film page: a real link to it on /development. */
export const FilmPageRecipeRow: FC<FilmPageRecipeRowProps> = ({
  recipe,
  filmSlug,
  developersReady,
  onOpen,
}) => {
  const { unit } = useTemperature();
  const { combination, developerName, dilution } = recipe;
  const temperature = formatTemperatureWithUnit(
    combination.temperatureF,
    combination.temperatureC,
    unit
  );

  const flagged = isNonStandardTemperature(combination.temperatureF);

  return (
    <a
      onClick={onOpen}
      href={`/development?film=${encodeURIComponent(filmSlug)}&recipe=${encodeURIComponent(combination.uuid)}`}
      className="grid min-h-11 grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-3 border-t border-[color:var(--color-border-muted)] px-1 py-2 text-sm text-primary transition-colors hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)]"
    >
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
        {developersReady ? (
          <>
            {developerName && (
              <span className="font-medium">{developerName}</span>
            )}
            {dilution && <span className="text-secondary">{dilution}</span>}
          </>
        ) : (
          <span aria-hidden="true" className="flex items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </span>
        )}
      </span>
      <span className="text-right font-semibold tabular-nums">
        {formatTime(combination.timeMinutes)}
      </span>
      {/* A flagged row's chip already gives the temperature. */}
      {!flagged && (
        <span className="text-right tabular-nums text-tertiary">
          {temperature.text}
        </span>
      )}
      <RecipeTemperatureChip
        temperatureC={combination.temperatureC}
        temperatureF={combination.temperatureF}
        className="col-span-full mt-1 justify-self-start whitespace-nowrap"
      />
    </a>
  );
};
