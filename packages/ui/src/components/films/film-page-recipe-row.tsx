import { type FilmRecipe, formatTemperatureWithUnit } from '@dorkroom/logic';
import type { FC } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTime } from '../development-recipes/recipe-detail-shared';
import { Skeleton } from '../ui/skeleton';

interface FilmPageRecipeRowProps {
  recipe: FilmRecipe;
  /** Developer names and dilutions are resolved; false shows a skeleton in their place. */
  developersReady: boolean;
}

/** One recipe on a film page: a real link to it on /development. */
export const FilmPageRecipeRow: FC<FilmPageRecipeRowProps> = ({
  recipe,
  developersReady,
}) => {
  const { unit } = useTemperature();
  const { combination, developerName, dilution } = recipe;
  const temperature = formatTemperatureWithUnit(
    combination.temperatureF,
    combination.temperatureC,
    unit
  );

  return (
    <a
      href={`/development?recipe=${encodeURIComponent(combination.uuid)}`}
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
      <span className="text-right tabular-nums text-tertiary">
        {temperature.text}
      </span>
    </a>
  );
};
