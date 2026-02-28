import type { Dilution } from '@dorkroom/api';
import {
  calculatePushPull,
  type DevelopmentCombinationView,
} from '@dorkroom/logic';
import { Edit2, ExternalLink, Share2, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { PushPullAlert } from '../push-pull-alert';
import { CollapsibleSection } from '../ui/collapsible-section';
import { Tag } from '../ui/tag';
import { DetailRow, formatTime } from './recipe-detail-shared';
import { VolumeMixer } from './volume-mixer';

interface DevelopmentRecipeDetailProps {
  view: DevelopmentCombinationView;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
  onShareRecipe?: (view: DevelopmentCombinationView) => void;
}

/**
 * Render detailed information for a development recipe, including combination, film, developer, notes, tags, and applicable action buttons.
 *
 * @param view - The combined view model containing `combination`, `film`, and `developer` data to display.
 * @param onEditCustomRecipe - Optional callback invoked with `view` when the "Edit recipe" action is triggered.
 * @param onDeleteCustomRecipe - Optional callback invoked with `view` when the "Delete recipe" action is triggered.
 * @param isFavorite - Optional predicate that returns whether `view` is marked as favorite.
 * @param onToggleFavorite - Optional callback invoked with `view` to toggle its favorite state.
 * @param onShareRecipe - Optional callback invoked with `view` when the "Share recipe" action is triggered.
 * @returns The rendered recipe detail UI as a React element.
 */
export function DevelopmentRecipeDetail({
  view,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  isFavorite,
  onToggleFavorite,
  onShareRecipe,
}: DevelopmentRecipeDetailProps) {
  const { combination, film, developer } = view;
  const { unit } = useTemperature();
  const [isFilmExpanded, setIsFilmExpanded] = useState(false);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(false);
  const [isVolumeMixerExpanded, setIsVolumeMixerExpanded] = useState(true);

  // Calculate pushPull from film box speed if available, otherwise use stored value
  const pushPull = film?.isoSpeed
    ? calculatePushPull(combination.shootingIso, film.isoSpeed)
    : (combination.pushPull ?? 0);

  // Get dilution label for volume mixer
  const dilutionLabel =
    combination.customDilution ||
    (developer && combination.dilutionId
      ? developer.dilutions.find(
          (d: Dilution) => String(d.id) === String(combination.dilutionId)
        )?.dilution
      : undefined) ||
    'Stock';

  return (
    <div className="space-y-5 text-sm">
      <div className="flex justify-end gap-2">
        {onShareRecipe && (
          <button
            type="button"
            title="Share recipe"
            onClick={() => onShareRecipe(view)}
            className="inline-flex items-center gap-2 rounded-full bg-border-muted px-3 py-1 text-xs font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            title={
              isFavorite?.(view) ? 'Remove from favorites' : 'Add to favorites'
            }
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

      {/* Push/pull alert */}
      <PushPullAlert
        shootingIso={combination.shootingIso}
        pushPull={pushPull}
      />

      <div className="space-y-3 rounded-xl border border-secondary bg-border-muted p-4">
        <DetailRow
          label="Development time"
          value={formatTime(combination.timeMinutes)}
        />
        <DetailRow
          label="Temperature"
          value={
            formatTemperatureWithUnit(
              combination.temperatureF,
              combination.temperatureC,
              unit
            ).text
          }
        />
        <DetailRow label="Dilution" value={dilutionLabel} />
        <DetailRow
          label="Agitation"
          value={combination.agitationSchedule || 'Standard'}
        />
        <DetailRow label="ISO" value={combination.shootingIso} />
        <DetailRow label="Push/Pull" value={pushPull} />
        {combination.tags && combination.tags.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 text-xs text-tertiary">
            {combination.tags.map((tag: string) => (
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
          <ExternalLink className="h-3 w-3" />{' '}
          {combination.infoSource.includes('filmdev.org')
            ? 'View on FilmDev.org'
            : 'View source'}
        </a>
      )}

      {view.source === 'custom' &&
        (onEditCustomRecipe || onDeleteCustomRecipe) && (
          <div className="flex gap-2 pt-4">
            {onEditCustomRecipe && (
              <button
                type="button"
                onClick={() => onEditCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center rounded-full bg-border-muted p-2.5 text-sm font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
                aria-label="Edit"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onDeleteCustomRecipe && (
              <button
                type="button"
                onClick={() => onDeleteCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center rounded-full bg-error/10 p-2.5 text-sm font-medium text-error/80 transition hover:bg-error/20 hover:text-error/90"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

      {/* Volume Mixer section */}
      <CollapsibleSection
        title="Volume Mixer"
        subtitle={dilutionLabel}
        isExpanded={isVolumeMixerExpanded}
        onToggle={() => setIsVolumeMixerExpanded(!isVolumeMixerExpanded)}
      >
        <VolumeMixer dilutionString={dilutionLabel} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Film"
        subtitle={film ? `${film.brand} ${film.name}` : 'Unknown film'}
        isExpanded={isFilmExpanded}
        onToggle={() => setIsFilmExpanded(!isFilmExpanded)}
      >
        <div className="space-y-3">
          {film?.description && (
            <p className="text-sm text-secondary">{film.description}</p>
          )}
          {film?.slug && (
            <a
              href={`/films?film=${film.slug}`}
              className="inline-flex items-center gap-2 text-xs text-tertiary underline-offset-4 hover:text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View in Film Database
            </a>
          )}
        </div>
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
