import type { Dilution } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { ExternalLink, Star } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { DetailPanel } from '../detail-panel';
import { CollapsibleSection } from '../ui/collapsible-section';
import { Tag } from '../ui/tag';

/**
 * Props for the RecipeDetailPanel component.
 */
export interface RecipeDetailPanelProps {
  /** The recipe view to display, or null when closed */
  view: DevelopmentCombinationView | null;
  /** Whether the panel is currently visible */
  isOpen: boolean;
  /** Callback function called when the panel should be closed */
  onClose: () => void;
  /** Whether to render in mobile mode (bottom drawer) vs desktop mode (sidebar) */
  isMobile: boolean;
  /** Check if a recipe is favorited */
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  /** Toggle favorite status */
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
  /** Edit custom recipe callback */
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  /** Delete custom recipe callback */
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  /** Share recipe callback */
  onShareRecipe?: (view: DevelopmentCombinationView) => void;
  /** Whether custom recipe sharing is enabled */
  customRecipeSharingEnabled?: boolean;
}

/** Format time as "Xm XXs" instead of decimal minutes */
const formatTime = (minutes: number): string => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) {
    return `${wholeMinutes}m`;
  }
  return `${wholeMinutes}m ${seconds.toString().padStart(2, '0')}s`;
};

/** Helper component for detail rows */
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
 * Render recipe details in a responsive panel: desktop sidebar or mobile bottom drawer.
 *
 * Desktop mode displays as a sticky sidebar on the right with slide-in animation.
 * Mobile mode displays as a bottom drawer with drag handle and backdrop overlay.
 *
 * @public
 */
export const RecipeDetailPanel: FC<RecipeDetailPanelProps> = ({
  view,
  isOpen,
  onClose,
  isMobile,
  isFavorite,
  onToggleFavorite,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  onShareRecipe,
  // onCopyRecipe is available but not currently used in sidebar view
  customRecipeSharingEnabled = false,
}) => {
  const { unit } = useTemperature();
  const [isFilmExpanded, setIsFilmExpanded] = useState(false);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(false);
  // State for expanded modal view collapsible sections
  const [isExpandedFilmOpen, setIsExpandedFilmOpen] = useState(false);
  const [isExpandedDeveloperOpen, setIsExpandedDeveloperOpen] = useState(false);

  if (!view) {
    return null;
  }

  const { combination, film, developer } = view;
  const isCustomRecipe = view.source === 'custom';
  const isFav = isFavorite?.(view) ?? false;

  const filmDatabaseUrl = film?.slug ? `/films?film=${film.slug}` : null;

  // Get dilution label
  const dilutionLabel =
    combination.customDilution ||
    (developer && combination.dilutionId
      ? developer.dilutions.find(
          (d: Dilution) => String(d.id) === String(combination.dilutionId)
        )?.dilution
      : undefined) ||
    'Stock';

  const ariaLabel = `${film?.brand ?? 'Unknown'} ${film?.name ?? 'film'} with ${developer?.manufacturer ?? 'Unknown'} ${developer?.name ?? 'developer'} recipe details`;

  // Panel content (sidebar/drawer view)
  const panelContent = (
    <div className="space-y-5 text-sm">
      {/* Title */}
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {film?.brand ?? 'Unknown'} {film?.name ?? 'Film'}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {developer?.manufacturer ?? 'Unknown'}{' '}
          {developer?.name ?? 'Developer'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(view)}
            className="inline-flex items-center gap-2 rounded-full bg-border-muted px-3 py-1 text-xs font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
          >
            <Star
              className="h-4 w-4"
              style={{
                color: isFav
                  ? 'var(--color-semantic-warning)'
                  : 'var(--color-text-tertiary)',
                fill: isFav ? 'var(--color-semantic-warning)' : 'transparent',
              }}
            />
            {isFav ? 'Favorited' : 'Add to favorites'}
          </button>
        )}
        {onShareRecipe && isCustomRecipe && customRecipeSharingEnabled && (
          <button
            type="button"
            onClick={() => onShareRecipe(view)}
            className="inline-flex items-center gap-2 rounded-full bg-border-muted px-3 py-1 text-xs font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
          >
            Share
          </button>
        )}
      </div>

      {/* Main details box */}
      <div className="space-y-3 rounded-xl border border-secondary bg-border-muted p-4">
        <DetailRow label="ISO" value={combination.shootingIso} />
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
        <DetailRow label="Push/Pull" value={combination.pushPull} />
        {combination.tags && combination.tags.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 text-xs text-tertiary">
            {combination.tags.map((tag: string) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </div>

      {/* Notes section */}
      {combination.notes && (
        <div className="rounded-xl border border-secondary bg-border-muted p-4 text-secondary">
          <div className="text-xs uppercase tracking-wide text-muted">
            Notes
          </div>
          <p className="mt-2 leading-relaxed">{combination.notes}</p>
        </div>
      )}

      {/* Info source link */}
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

      {/* Edit/Delete buttons for custom recipes */}
      {isCustomRecipe && (onEditCustomRecipe || onDeleteCustomRecipe) && (
        <div className="flex gap-2 pt-2">
          {onEditCustomRecipe && (
            <button
              type="button"
              onClick={() => onEditCustomRecipe(view)}
              className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition"
              style={{
                backgroundColor: 'var(--color-border-muted)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--color-border-secondary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--color-border-muted)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Edit
            </button>
          )}
          {onDeleteCustomRecipe && (
            <button
              type="button"
              onClick={() => onDeleteCustomRecipe(view)}
              className="flex-1 rounded-full px-4 py-2 text-sm font-medium transition bg-error/10 text-error/80 hover:bg-error/20 hover:text-error/90"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Film section */}
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
          {filmDatabaseUrl && (
            <a
              href={filmDatabaseUrl}
              className="inline-flex items-center gap-2 text-xs text-tertiary underline-offset-4 hover:text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View in Film Database
            </a>
          )}
        </div>
      </CollapsibleSection>

      {/* Developer section */}
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

  // Expanded content (two-column layout)
  const expandedContent = (
    <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
      {/* Left column: Recipe details */}
      <div className="space-y-6">
        {/* Title */}
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {film?.brand ?? 'Unknown'} {film?.name ?? 'Film'}
          </h2>
          <p
            className="text-lg mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {developer?.manufacturer ?? 'Unknown'}{' '}
            {developer?.name ?? 'Developer'}
          </p>
        </div>

        {/* Primary info: Time and Temperature - prominent display */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Development Time
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatTime(combination.timeMinutes)}
            </p>
          </div>
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Temperature
            </div>
            <p className="text-2xl font-bold text-primary">
              {
                formatTemperatureWithUnit(
                  combination.temperatureF,
                  combination.temperatureC,
                  unit
                ).text
              }
            </p>
          </div>
        </div>

        {/* Secondary details grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              ISO
            </div>
            <p className="text-primary font-medium">
              {combination.shootingIso}
            </p>
          </div>
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Dilution
            </div>
            <p className="text-primary font-medium">{dilutionLabel}</p>
          </div>
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Agitation
            </div>
            <p className="text-primary font-medium">
              {combination.agitationSchedule || 'Standard'}
            </p>
          </div>
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Push/Pull
            </div>
            <p className="text-primary font-medium">{combination.pushPull}</p>
          </div>
        </div>

        {/* Tags */}
        {combination.tags && combination.tags.length > 0 && (
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {combination.tags.map((tag: string) => (
                <Tag key={tag} size="xs">
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {combination.notes && (
          <div className="rounded-xl border border-secondary bg-border-muted p-4">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">
              Notes
            </div>
            <p className="text-secondary leading-relaxed">
              {combination.notes}
            </p>
          </div>
        )}
      </div>

      {/* Right column: Film and Developer info (collapsible, collapsed by default) */}
      <div className="space-y-6">
        {/* Film info - collapsible */}
        <CollapsibleSection
          title="Film"
          subtitle={film ? `${film.brand} ${film.name}` : 'Unknown film'}
          isExpanded={isExpandedFilmOpen}
          onToggle={() => setIsExpandedFilmOpen(!isExpandedFilmOpen)}
        >
          <div className="space-y-3">
            {film?.description && (
              <p className="text-sm text-secondary">{film.description}</p>
            )}
            {filmDatabaseUrl && (
              <a
                href={filmDatabaseUrl}
                className="inline-flex items-center gap-2 text-xs text-tertiary underline-offset-4 hover:text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> View in Film Database
              </a>
            )}
          </div>
        </CollapsibleSection>

        {/* Developer info - collapsible */}
        <CollapsibleSection
          title="Developer"
          subtitle={
            developer
              ? `${developer.manufacturer} ${developer.name}`
              : 'Unknown developer'
          }
          isExpanded={isExpandedDeveloperOpen}
          onToggle={() => setIsExpandedDeveloperOpen(!isExpandedDeveloperOpen)}
        >
          {(developer?.description || developer?.notes) && (
            <p className="text-sm text-secondary">
              {developer?.description || developer?.notes}
            </p>
          )}
        </CollapsibleSection>

        {/* Source link */}
        {combination.infoSource && (
          <a
            href={combination.infoSource}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{
              backgroundColor: 'var(--color-border-muted)',
              color: 'var(--color-text-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-border-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-border-muted)';
            }}
          >
            <ExternalLink className="h-4 w-4" />
            View Source
          </a>
        )}
      </div>
    </div>
  );

  return (
    <DetailPanel
      isOpen={isOpen}
      onClose={onClose}
      isMobile={isMobile}
      ariaLabel={ariaLabel}
      expandedContent={expandedContent}
    >
      {panelContent}
    </DetailPanel>
  );
};
