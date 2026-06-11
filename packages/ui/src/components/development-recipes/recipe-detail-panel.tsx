import type { Dilution } from '@dorkroom/api';
import {
  calculatePushPull,
  type DevelopmentCombinationView,
} from '@dorkroom/logic';
import { ExternalLink, Star } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { setStyles } from '../../lib/dom';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { DetailPanel } from '../detail-panel/detail-panel';
import { PushPullAlert } from '../push-pull-alert';
import { TemperatureAlert } from '../temperature-alert';
import { CollapsibleSection } from '../ui/collapsible-section';
import { Tag } from '../ui/tag';
import { DetailRow, formatTime } from './recipe-detail-shared';
import { VolumeMixer } from './volume-mixer';

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
  /** Max height for the desktop sidebar */
  maxHeight?: number;
}

/** Resolve the human-readable dilution label for a recipe view. */
function getDilutionLabel(view: DevelopmentCombinationView): string {
  const { combination, developer } = view;
  return (
    combination.customDilution ||
    (developer && combination.dilutionId
      ? developer.dilutions.find(
          (d: Dilution) => String(d.id) === String(combination.dilutionId)
        )?.dilution
      : undefined) ||
    'Stock'
  );
}

interface FilmCollapsibleSectionProps {
  view: DevelopmentCombinationView;
  filmDatabaseUrl: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Collapsible "Film" section shared by sidebar and expanded layouts. */
const FilmCollapsibleSection: FC<FilmCollapsibleSectionProps> = ({
  view,
  filmDatabaseUrl,
  isExpanded,
  onToggle,
}) => {
  const { film } = view;
  return (
    <CollapsibleSection
      title="Film"
      subtitle={film ? `${film.brand} ${film.name}` : 'Unknown film'}
      isExpanded={isExpanded}
      onToggle={onToggle}
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
            <ExternalLink className="size-3" /> View in Film Database
          </a>
        )}
      </div>
    </CollapsibleSection>
  );
};

interface DeveloperCollapsibleSectionProps {
  view: DevelopmentCombinationView;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Collapsible "Developer" section shared by sidebar and expanded layouts. */
const DeveloperCollapsibleSection: FC<DeveloperCollapsibleSectionProps> = ({
  view,
  isExpanded,
  onToggle,
}) => {
  const { developer } = view;
  return (
    <CollapsibleSection
      title="Developer"
      subtitle={
        developer
          ? `${developer.manufacturer} ${developer.name}`
          : 'Unknown developer'
      }
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {(developer?.description || developer?.notes) && (
        <p className="text-sm text-secondary">
          {developer?.description || developer?.notes}
        </p>
      )}
    </CollapsibleSection>
  );
};

interface SectionExpandState {
  isFilmExpanded: boolean;
  setIsFilmExpanded: (value: boolean) => void;
  isDeveloperExpanded: boolean;
  setIsDeveloperExpanded: (value: boolean) => void;
  isVolumeMixerExpanded: boolean;
  setIsVolumeMixerExpanded: (value: boolean) => void;
}

interface PanelLayoutProps {
  view: DevelopmentCombinationView;
  dilutionLabel: string;
  pushPull: number;
  filmDatabaseUrl: string | null;
  unit: ReturnType<typeof useTemperature>['unit'];
  expand: SectionExpandState;
  isFav: boolean;
  isCustomRecipe: boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onShareRecipe?: (view: DevelopmentCombinationView) => void;
  customRecipeSharingEnabled: boolean;
}

/** Action buttons (favorite / share) for the sidebar layout. */
const SidebarActionButtons: FC<
  Pick<
    PanelLayoutProps,
    | 'view'
    | 'isFav'
    | 'isCustomRecipe'
    | 'onToggleFavorite'
    | 'onShareRecipe'
    | 'customRecipeSharingEnabled'
  >
> = ({
  view,
  isFav,
  isCustomRecipe,
  onToggleFavorite,
  onShareRecipe,
  customRecipeSharingEnabled,
}) => (
  <div className="flex flex-wrap gap-2">
    {onToggleFavorite && (
      <button
        type="button"
        onClick={() => onToggleFavorite(view)}
        className="inline-flex items-center gap-2 rounded-full bg-border-muted px-3 py-1 text-xs font-medium text-secondary transition hover:bg-border-secondary hover:text-primary"
      >
        <Star
          className="size-4"
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
);

/** Edit / delete buttons for custom recipes in the sidebar layout. */
const SidebarCustomRecipeButtons: FC<
  Pick<PanelLayoutProps, 'view' | 'onEditCustomRecipe' | 'onDeleteCustomRecipe'>
> = ({ view, onEditCustomRecipe, onDeleteCustomRecipe }) => (
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
          setStyles(e.currentTarget, {
            backgroundColor: 'var(--color-border-secondary)',
            color: 'var(--color-text-primary)',
          });
        }}
        onMouseLeave={(e) => {
          setStyles(e.currentTarget, {
            backgroundColor: 'var(--color-border-muted)',
            color: 'var(--color-text-secondary)',
          });
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
);

/** Panel content for the sidebar / mobile drawer layout. */
const SidebarPanelContent: FC<PanelLayoutProps> = ({
  view,
  dilutionLabel,
  pushPull,
  filmDatabaseUrl,
  unit,
  expand,
  isFav,
  isCustomRecipe,
  onToggleFavorite,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  onShareRecipe,
  customRecipeSharingEnabled,
}) => {
  const { combination, film, developer } = view;
  return (
    <div className="space-y-5 text-sm">
      {/* Title */}
      <div>
        <h2
          className="text-xl font-semibold mb-1"
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
      <SidebarActionButtons
        view={view}
        isFav={isFav}
        isCustomRecipe={isCustomRecipe}
        onToggleFavorite={onToggleFavorite}
        onShareRecipe={onShareRecipe}
        customRecipeSharingEnabled={customRecipeSharingEnabled}
      />

      {/* Non-standard temperature alert */}
      <TemperatureAlert
        temperatureF={combination.temperatureF}
        temperatureC={combination.temperatureC}
      />

      {/* Push/pull alert */}
      <PushPullAlert
        shootingIso={combination.shootingIso}
        pushPull={pushPull}
      />

      {/* Main details box */}
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
          <ExternalLink className="size-3" />{' '}
          {combination.infoSource.includes('filmdev.org')
            ? 'View on FilmDev.org'
            : 'View source'}
        </a>
      )}

      {/* Edit/Delete buttons for custom recipes */}
      {isCustomRecipe && (onEditCustomRecipe || onDeleteCustomRecipe) && (
        <SidebarCustomRecipeButtons
          view={view}
          onEditCustomRecipe={onEditCustomRecipe}
          onDeleteCustomRecipe={onDeleteCustomRecipe}
        />
      )}

      {/* Volume Mixer section */}
      <CollapsibleSection
        title="Volume Mixer"
        subtitle={`Calculate for ${dilutionLabel}`}
        isExpanded={expand.isVolumeMixerExpanded}
        onToggle={() =>
          expand.setIsVolumeMixerExpanded(!expand.isVolumeMixerExpanded)
        }
      >
        <VolumeMixer dilutionString={dilutionLabel} />
      </CollapsibleSection>

      {/* Film section */}
      <FilmCollapsibleSection
        view={view}
        filmDatabaseUrl={filmDatabaseUrl}
        isExpanded={expand.isFilmExpanded}
        onToggle={() => expand.setIsFilmExpanded(!expand.isFilmExpanded)}
      />

      {/* Developer section */}
      <DeveloperCollapsibleSection
        view={view}
        isExpanded={expand.isDeveloperExpanded}
        onToggle={() =>
          expand.setIsDeveloperExpanded(!expand.isDeveloperExpanded)
        }
      />
    </div>
  );
};

/** Left column of the expanded layout: recipe metrics, tags, notes. */
const ExpandedRecipeDetails: FC<
  Pick<PanelLayoutProps, 'view' | 'dilutionLabel' | 'pushPull' | 'unit'>
> = ({ view, dilutionLabel, pushPull, unit }) => {
  const { combination, film, developer } = view;
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2
          className="text-2xl md:text-3xl font-semibold mb-2"
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

      {/* Non-standard temperature alert */}
      <TemperatureAlert
        temperatureF={combination.temperatureF}
        temperatureC={combination.temperatureC}
      />

      {/* Push/pull alert */}
      <PushPullAlert
        shootingIso={combination.shootingIso}
        pushPull={pushPull}
      />

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
          <p className="text-primary font-medium">{combination.shootingIso}</p>
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
          <p className="text-primary font-medium">{pushPull}</p>
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
          <p className="text-secondary leading-relaxed">{combination.notes}</p>
        </div>
      )}
    </div>
  );
};

/** Right column of the expanded layout: collapsible sections and source link. */
const ExpandedSideColumn: FC<PanelLayoutProps> = ({
  view,
  dilutionLabel,
  filmDatabaseUrl,
  expand,
}) => {
  const { combination } = view;
  return (
    <div className="space-y-6">
      {/* Volume Mixer - collapsible */}
      <CollapsibleSection
        title="Volume Mixer"
        subtitle={`Calculate for ${dilutionLabel}`}
        isExpanded={expand.isVolumeMixerExpanded}
        onToggle={() =>
          expand.setIsVolumeMixerExpanded(!expand.isVolumeMixerExpanded)
        }
      >
        <VolumeMixer dilutionString={dilutionLabel} />
      </CollapsibleSection>

      {/* Film info - collapsible */}
      <FilmCollapsibleSection
        view={view}
        filmDatabaseUrl={filmDatabaseUrl}
        isExpanded={expand.isFilmExpanded}
        onToggle={() => expand.setIsFilmExpanded(!expand.isFilmExpanded)}
      />

      {/* Developer info - collapsible */}
      <DeveloperCollapsibleSection
        view={view}
        isExpanded={expand.isDeveloperExpanded}
        onToggle={() =>
          expand.setIsDeveloperExpanded(!expand.isDeveloperExpanded)
        }
      />

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
            setStyles(e.currentTarget, {
              backgroundColor: 'var(--color-border-primary)',
            });
          }}
          onMouseLeave={(e) => {
            setStyles(e.currentTarget, {
              backgroundColor: 'var(--color-border-muted)',
            });
          }}
        >
          <ExternalLink className="size-4" />
          {combination.infoSource.includes('filmdev.org')
            ? 'View on FilmDev.org'
            : 'View Source'}
        </a>
      )}
    </div>
  );
};

/** Expanded (two-column) layout content. */
const ExpandedPanelContent: FC<PanelLayoutProps> = (props) => (
  <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
    <ExpandedRecipeDetails
      view={props.view}
      dilutionLabel={props.dilutionLabel}
      pushPull={props.pushPull}
      unit={props.unit}
    />
    <ExpandedSideColumn {...props} />
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
  maxHeight,
}) => {
  const { unit } = useTemperature();
  const [isFilmExpanded, setIsFilmExpanded] = useState(false);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(false);
  const [isVolumeMixerExpanded, setIsVolumeMixerExpanded] = useState(true);

  if (!view) {
    return null;
  }

  const { combination, film, developer } = view;
  const isCustomRecipe = view.source === 'custom';
  const isFav = isFavorite?.(view) ?? false;

  // Calculate pushPull from film box speed if available, otherwise use stored value
  const pushPull = film?.isoSpeed
    ? calculatePushPull(combination.shootingIso, film.isoSpeed)
    : (combination.pushPull ?? 0);

  const filmDatabaseUrl = film?.slug ? `/films?film=${film.slug}` : null;

  const dilutionLabel = getDilutionLabel(view);

  const ariaLabel = `${film?.brand ?? 'Unknown'} ${film?.name ?? 'film'} with ${developer?.manufacturer ?? 'Unknown'} ${developer?.name ?? 'developer'} recipe details`;

  const expand: SectionExpandState = {
    isFilmExpanded,
    setIsFilmExpanded,
    isDeveloperExpanded,
    setIsDeveloperExpanded,
    isVolumeMixerExpanded,
    setIsVolumeMixerExpanded,
  };

  const layoutProps: PanelLayoutProps = {
    view,
    dilutionLabel,
    pushPull,
    filmDatabaseUrl,
    unit,
    expand,
    isFav,
    isCustomRecipe,
    onToggleFavorite,
    onEditCustomRecipe,
    onDeleteCustomRecipe,
    onShareRecipe,
    customRecipeSharingEnabled,
  };

  return (
    <DetailPanel
      isOpen={isOpen}
      onClose={onClose}
      isMobile={isMobile}
      ariaLabel={ariaLabel}
      expandedContent={<ExpandedPanelContent {...layoutProps} />}
      maxHeight={maxHeight}
    >
      <SidebarPanelContent {...layoutProps} />
    </DetailPanel>
  );
};
