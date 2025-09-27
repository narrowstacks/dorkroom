import { ExternalLink, Edit2, Trash2, Star } from 'lucide-react';
import { useState } from 'react';
import type { DevelopmentCombinationView } from './results-table';
import { formatTemperature } from '@dorkroom/logic';
import { Tag } from '../ui/tag';
import { CollapsibleSection } from '../ui/collapsible-section';

interface DevelopmentRecipeDetailProps {
  view: DevelopmentCombinationView;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
}

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between gap-6 text-sm">
    <span className="text-tertiary">{label}</span>
    <span className="text-right text-primary">{value}</span>
  </div>
);

/**
 * Render a detailed, collapsible view of a development recipe with optional favorite, edit, and delete actions.
 *
 * @param view - The recipe view to display, including combination, film, and developer data
 * @param onEditCustomRecipe - Optional callback invoked with `view` when the user clicks "Edit recipe"
 * @param onDeleteCustomRecipe - Optional callback invoked with `view` when the user clicks "Delete recipe"
 * @param isFavorite - Optional predicate that returns `true` when `view` is marked as a favorite
 * @param onToggleFavorite - Optional callback invoked with `view` when the user toggles the favorite button
 * @returns A JSX element containing the recipe detail UI
 */
export function DevelopmentRecipeDetail({
  view,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  isFavorite,
  onToggleFavorite,
}: DevelopmentRecipeDetailProps) {
  const { combination, film, developer } = view;
  const [isFilmExpanded, setIsFilmExpanded] = useState(false);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(false);

  return (
    <div className="space-y-5 text-sm">
      <div className="flex justify-end">
        {onToggleFavorite && (
          <button
            type="button"
            title={isFavorite?.(view) ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => onToggleFavorite(view)}
            className="inline-flex items-center gap-2 rounded-full bg-border-muted px-3 py-1 text-xs font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
          >
            <Star
              className="h-4 w-4"
              style={{
                color: isFavorite?.(view)
                  ? 'var(--color-semantic-warning)'
                  : 'var(--color-text-tertiary)',
                fill: isFavorite?.(view)
                  ? 'var(--color-semantic-warning)'
                  : 'transparent',
              }}
            />
            {isFavorite?.(view) ? 'Favorited' : 'Add to favorites'}
          </button>
        )}
      </div>
      <div className="space-y-3 rounded-xl border border-secondary bg-border-muted p-4">
        <DetailRow label="ISO" value={combination.shootingIso} />
        <DetailRow
          label="Development time"
          value={`${combination.timeMinutes.toFixed(2)} minutes`}
        />
        <DetailRow label="Temperature" value={formatTemperature(combination)} />
        <DetailRow
          label="Dilution"
          value={
            combination.customDilution ||
            (developer && combination.dilutionId
              ? developer.dilutions.find(
                  (d) => String(d.id) === String(combination.dilutionId)
                )?.dilution
              : undefined) ||
            'Stock'
          }
        />
        <DetailRow
          label="Agitation"
          value={combination.agitationSchedule || 'Standard'}
        />
        <DetailRow label="Push/Pull" value={combination.pushPull} />
        {combination.tags && combination.tags.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 text-xs text-tertiary">
            {combination.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </div>

      {combination.notes && (
        <div className="rounded-xl border border-secondary bg-border-muted p-4 text-secondary">
          <div className="text-xs uppercase tracking-wide text-muted">
            Notes
          </div>
          <p className="mt-2 leading-relaxed">{combination.notes}</p>
        </div>
      )}

      {combination.infoSource && (
        <a
          href={combination.infoSource}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs text-tertiary underline-offset-4 hover:text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> View source
        </a>
      )}

      {view.source === 'custom' &&
        (onEditCustomRecipe || onDeleteCustomRecipe) && (
          <div className="flex gap-3 pt-4">
            {onEditCustomRecipe && (
              <button
                type="button"
                onClick={() => onEditCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-border-muted px-4 py-2 text-sm font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
              >
                <Edit2 className="h-4 w-4" />
                Edit recipe
              </button>
            )}
            {onDeleteCustomRecipe && (
              <button
                type="button"
                onClick={() => onDeleteCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-error/10 px-4 py-2 text-sm font-medium text-error/80 transition hover:bg-error/20 hover:text-error/90"
              >
                <Trash2 className="h-4 w-4" />
                Delete recipe
              </button>
            )}
          </div>
        )}
      <CollapsibleSection
        title="Film"
        subtitle={film ? `${film.brand} ${film.name}` : 'Unknown film'}
        isExpanded={isFilmExpanded}
        onToggle={() => setIsFilmExpanded(!isFilmExpanded)}
      >
        {film?.description && (
          <p className="text-sm text-secondary">
            {film.description}
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Developer"
        subtitle={
          developer
            ? `${developer.manufacturer} ${developer.name}`
            : 'Unknown developer'
        }
        isExpanded={isDeveloperExpanded}
        onToggle={() => setIsDeveloperExpanded(!isDeveloperExpanded)}
      >
        {(developer?.description || developer?.notes) && (
          <p className="text-sm text-secondary">
            {developer?.description || developer?.notes}
          </p>
        )}
      </CollapsibleSection>
    </div>
  );
}
