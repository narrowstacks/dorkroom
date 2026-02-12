import type { Dilution } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { Row, Table } from '@tanstack/react-table';
import {
  Edit2,
  ExternalLink,
  Flame,
  Snowflake,
  Star,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import type { ShareResult } from '../share-button';
import { ShareButton } from '../share-button';
import {
  CustomBadge,
  isOfficialTag,
  OfficialBadge,
} from '../ui/official-badge';
import { SkeletonCard } from '../ui/skeleton';
import { Tag } from '../ui/tag';
import { FavoriteMessageSkeleton } from './favorite-message-skeleton';

interface DevelopmentResultsCardsProps {
  table: Table<DevelopmentCombinationView>;
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (
    view: DevelopmentCombinationView
  ) => undefined | ShareResult | Promise<undefined | ShareResult>;
  onCopyCombination?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  isMobile?: boolean;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
  favoriteTransitions?: Map<string, 'adding' | 'removing'>;
}

const formatTime = (minutes: number) => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) {
    return `${wholeMinutes} min`;
  }
  return `${wholeMinutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const formatDilution = (view: DevelopmentCombinationView): string => {
  const { combination, developer } = view;

  if (combination.customDilution) {
    return combination.customDilution;
  }

  if (developer && combination.dilutionId) {
    const match = developer.dilutions.find(
      (dilution: Dilution) =>
        String(dilution.id) === String(combination.dilutionId)
    );
    if (match) {
      return match.dilution || match.name;
    }
  }

  return 'Stock';
};

export function DevelopmentResultsCards({
  table,
  onSelectCombination,
  onShareCombination,
  onCopyCombination,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  isMobile = false,
  isFavorite,
  onToggleFavorite,
  favoriteTransitions = new Map(),
}: DevelopmentResultsCardsProps) {
  const { unit } = useTemperature();
  const [hoveredFavoriteId, setHoveredFavoriteId] = useState<string | null>(
    null
  );
  const rows = table.getRowModel().rows;
  return (
    <div
      className={cn(
        'grid gap-4',
        isMobile
          ? 'grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      )}
    >
      {rows.map((row: Row<DevelopmentCombinationView>, index: number) => {
        const rowData = row.original;
        const { combination, film, developer } = rowData;
        const id = String(combination.uuid || combination.id);
        const transitionState = favoriteTransitions.get(id);

        // Show skeleton or message during transition
        if (transitionState) {
          if (transitionState === 'adding') {
            return (
              <FavoriteMessageSkeleton
                key={`transition-${id}`}
                message="Added to favorites"
                variant="card"
              />
            );
          } else if (transitionState === 'removing') {
            return <SkeletonCard key={`transition-${id}`} />;
          }
        }

        return (
          // biome-ignore lint/a11y/useSemanticElements: Card uses ARIA role with keyboard support instead of button to avoid resetting button styles
          <div
            key={combination.uuid || combination.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectCombination?.(rowData)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectCombination?.(rowData);
              }
            }}
            className={cn(
              'cursor-pointer rounded-2xl border p-3 shadow-subtle transition-all duration-200 hover:scale-[1.02]',
              'animate-slide-fade-bottom',
              index === 0 && 'animate-delay-100',
              index === 1 && 'animate-delay-200',
              index === 2 && 'animate-delay-300',
              index === 3 && 'animate-delay-400',
              index === 4 && 'animate-delay-500',
              index === 5 && 'animate-delay-600',
              index === 6 && 'animate-delay-700',
              index >= 7 && 'animate-delay-800'
            )}
            style={{
              borderColor:
                rowData.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      30,
                      'transparent',
                      'var(--color-border-secondary)'
                    )
                  : 'var(--color-border-secondary)',
              backgroundColor:
                rowData.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      15,
                      'transparent',
                      'var(--color-border-muted)'
                    )
                  : 'rgba(var(--color-background-rgb), 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                rowData.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      40,
                      'transparent',
                      'var(--color-border-primary)'
                    )
                  : 'var(--color-border-primary)';
              e.currentTarget.style.backgroundColor =
                rowData.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      20,
                      'transparent',
                      'var(--color-border-secondary)'
                    )
                  : 'rgba(var(--color-background-rgb), 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                rowData.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      30,
                      'transparent',
                      'var(--color-border-secondary)'
                    )
                  : 'var(--color-border-secondary)';
              e.currentTarget.style.backgroundColor =
                rowData.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      15,
                      'transparent',
                      'var(--color-border-muted)'
                    )
                  : 'rgba(var(--color-background-rgb), 0.25)';
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {film ? `${film.brand} ${film.name}` : 'Unknown film'}
                  </span>
                  {rowData.source === 'custom' && (
                    <CustomBadge showTooltip={false} />
                  )}
                  {combination.tags
                    ?.filter(isOfficialTag)
                    .map((tag: string) => (
                      <OfficialBadge key={tag} tag={tag} showTooltip={false} />
                    ))}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {developer
                    ? `${developer.manufacturer} ${developer.name}`
                    : 'Unknown developer'}
                </div>
                {combination.tags &&
                  combination.tags.filter(
                    (t: string) => !isOfficialTag(t) && t !== 'custom'
                  ).length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {combination.tags
                        .filter(
                          (t: string) => !isOfficialTag(t) && t !== 'custom'
                        )
                        .map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                    </div>
                  )}
              </div>
              <button
                type="button"
                title={
                  isFavorite?.(rowData)
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                aria-pressed={Boolean(isFavorite?.(rowData))}
                aria-label={
                  isFavorite?.(rowData)
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(rowData);
                }}
                className="ml-2 inline-flex items-center justify-center rounded-md p-1.5 transition"
                style={{
                  backgroundColor: 'var(--color-surface-muted)',
                  borderWidth: 1,
                  borderColor: 'var(--color-border-secondary)',
                  color: isFavorite?.(rowData)
                    ? 'var(--color-semantic-warning)'
                    : 'var(--color-border-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-border-secondary)';
                  setHoveredFavoriteId(id);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-surface-muted)';
                  setHoveredFavoriteId(null);
                }}
              >
                <Star
                  className="h-4 w-4"
                  aria-hidden="true"
                  fill={
                    isFavorite?.(rowData)
                      ? 'var(--color-semantic-warning)'
                      : 'none'
                  }
                  stroke={
                    hoveredFavoriteId === id
                      ? '#ffffff'
                      : isFavorite?.(rowData)
                        ? 'var(--color-semantic-warning)'
                        : 'var(--color-border-secondary)'
                  }
                  strokeWidth={2}
                />
              </button>
            </div>

            <div
              className="mt-3 grid grid-cols-2 gap-1 text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <div>
                <div style={{ color: 'var(--color-text-muted)' }}>ISO</div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {combination.shootingIso}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)' }}>Time</div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatTime(combination.timeMinutes)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Temperature
                </div>
                {(() => {
                  const temp = formatTemperatureWithUnit(
                    combination.temperatureF,
                    combination.temperatureC,
                    unit
                  );
                  const getTempColor = () => {
                    if (!temp.isNonStandard) return 'var(--color-text-primary)';
                    return temp.isHigher
                      ? 'var(--color-semantic-warning)'
                      : 'var(--color-semantic-info, #3b82f6)';
                  };
                  const TempIcon = temp.isHigher ? Flame : Snowflake;
                  return (
                    <div
                      className={cn(
                        'text-sm inline-flex items-center gap-1',
                        temp.isNonStandard && 'font-medium'
                      )}
                      style={{ color: getTempColor() }}
                    >
                      {temp.isNonStandard && (
                        <TempIcon
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      {temp.text}
                    </div>
                  );
                })()}
              </div>
              <div>
                <div style={{ color: 'var(--color-text-muted)' }}>Dilution</div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {formatDilution(rowData)}
                </div>
              </div>
            </div>

            {(combination.notes ||
              combination.infoSource ||
              (rowData.source !== 'custom' &&
                (onShareCombination || onCopyCombination))) && (
              <div className="mt-3 space-y-1.5">
                {(combination.infoSource ||
                  (rowData.source !== 'custom' &&
                    (onShareCombination || onCopyCombination))) && (
                  <div className="flex justify-between items-center">
                    {combination.infoSource && (
                      <a
                        href={combination.infoSource}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color =
                            'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            'var(--color-text-tertiary)';
                        }}
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />{' '}
                        {combination.infoSource.includes('filmdev.org')
                          ? 'FilmDev.org'
                          : 'Source'}
                      </a>
                    )}
                    {rowData.source !== 'custom' &&
                      (onShareCombination || onCopyCombination) && (
                        // biome-ignore lint/a11y/noStaticElementInteractions: wrapper to stop event propagation to parent card
                        <span
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <ShareButton
                            onClick={() => onShareCombination?.(rowData)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          />
                        </span>
                      )}
                  </div>
                )}
              </div>
            )}

            {rowData.source === 'custom' && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCustomRecipe?.(rowData);
                      }}
                      aria-label="Edit"
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        backgroundColor: 'var(--color-border-muted)',
                        color: 'var(--color-text-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-border-secondary)';
                        e.currentTarget.style.color =
                          'var(--color-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--color-border-muted)';
                        e.currentTarget.style.color =
                          'var(--color-text-secondary)';
                      }}
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomRecipe?.(rowData);
                      }}
                      aria-label="Delete"
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        backgroundColor: colorMixOr(
                          'var(--color-semantic-error)',
                          10,
                          'transparent',
                          'var(--color-border-muted)'
                        ),
                        color: colorMixOr(
                          'var(--color-semantic-error)',
                          80,
                          'var(--color-text-primary)',
                          'var(--color-semantic-error)'
                        ),
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colorMixOr(
                          'var(--color-semantic-error)',
                          20,
                          'transparent',
                          'var(--color-border-secondary)'
                        );
                        e.currentTarget.style.color = colorMixOr(
                          'var(--color-semantic-error)',
                          90,
                          'var(--color-text-primary)',
                          'var(--color-semantic-error)'
                        );
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colorMixOr(
                          'var(--color-semantic-error)',
                          10,
                          'transparent',
                          'var(--color-border-muted)'
                        );
                        e.currentTarget.style.color = colorMixOr(
                          'var(--color-semantic-error)',
                          80,
                          'var(--color-text-primary)',
                          'var(--color-semantic-error)'
                        );
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {onShareCombination && (
                    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper to stop event propagation to parent card
                    <span
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <ShareButton
                        onClick={() => onShareCombination?.(rowData)}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {rows.length === 0 && (
        <div
          className="rounded-2xl border p-4 text-center text-sm"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'rgba(var(--color-background-rgb), 0.15)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          No recipes match your current filters. Try adjusting your search.
        </div>
      )}
    </div>
  );
}
