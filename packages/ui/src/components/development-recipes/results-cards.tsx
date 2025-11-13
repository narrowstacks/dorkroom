import { Beaker, ExternalLink, Edit2, Trash2, Star } from 'lucide-react';
import type { DevelopmentCombinationView } from './results-table';
import type { Dilution } from '@dorkroom/api';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { Tag } from '../ui/tag';
import { ShareButton } from '../share-button';

interface DevelopmentResultsCardsProps {
  rows: DevelopmentCombinationView[];
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (
    view: DevelopmentCombinationView
  ) => void | Promise<unknown>;
  onCopyCombination?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  isMobile?: boolean;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
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
  rows,
  onSelectCombination,
  onShareCombination,
  onCopyCombination,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  isMobile = false,
  isFavorite,
  onToggleFavorite,
}: DevelopmentResultsCardsProps) {
  const { unit } = useTemperature();
  return (
    <div
      className={cn(
        'grid gap-4',
        isMobile
          ? 'grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      )}
    >
      {rows.map((row, index) => {
        const { combination, film, developer } = row;
        return (
          <div
            key={combination.uuid || combination.id}
            onClick={() => onSelectCombination?.(row)}
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
                row.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      30,
                      'transparent',
                      'var(--color-border-secondary)'
                    )
                  : 'var(--color-border-secondary)',
              backgroundColor:
                row.source === 'custom'
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
                row.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      40,
                      'transparent',
                      'var(--color-border-primary)'
                    )
                  : 'var(--color-border-primary)';
              e.currentTarget.style.backgroundColor =
                row.source === 'custom'
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
                row.source === 'custom'
                  ? colorMixOr(
                      'var(--color-accent)',
                      30,
                      'transparent',
                      'var(--color-border-secondary)'
                    )
                  : 'var(--color-border-secondary)';
              e.currentTarget.style.backgroundColor =
                row.source === 'custom'
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
                <div
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {film ? `${film.brand} ${film.name}` : 'Unknown film'}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {developer
                    ? `${developer.manufacturer} ${developer.name}`
                    : 'Unknown developer'}
                </div>
                {(row.source === 'custom' ||
                  (combination.tags && combination.tags.length > 0)) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {row.source === 'custom' && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: colorMixOr(
                            'var(--color-accent)',
                            10,
                            'transparent',
                            'var(--color-border-muted)'
                          ),
                          color: colorMixOr(
                            'var(--color-accent)',
                            80,
                            'var(--color-text-primary)',
                            'var(--color-text-primary)'
                          ),
                        }}
                      >
                        <Beaker className="h-3 w-3" aria-hidden="true" /> Custom
                        Recipe
                      </span>
                    )}
                    {combination.tags && combination.tags.length > 0 && (
                      <>
                        {combination.tags.map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                title={
                  isFavorite?.(row)
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                aria-pressed={Boolean(isFavorite?.(row))}
                aria-label={
                  isFavorite?.(row)
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(row);
                }}
                className="ml-2 inline-flex items-center justify-center rounded-md p-1.5 transition"
                style={{
                  backgroundColor: 'var(--color-surface-muted)',
                  color: isFavorite?.(row)
                    ? 'var(--color-semantic-warning)'
                    : 'var(--color-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-border-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-surface-muted)';
                }}
              >
                <Star
                  className="h-4 w-4"
                  aria-hidden="true"
                  style={{
                    fill: isFavorite?.(row)
                      ? 'var(--color-semantic-warning)'
                      : 'transparent',
                  }}
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
                    row.combination.temperatureF,
                    row.combination.temperatureC,
                    unit
                  );
                  return (
                    <div
                      className={cn(
                        'text-sm',
                        temp.isNonStandard && 'font-medium'
                      )}
                      style={{
                        color: temp.isNonStandard
                          ? 'var(--color-semantic-warning)'
                          : 'var(--color-text-primary)',
                      }}
                    >
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
                  {formatDilution(row)}
                </div>
              </div>
            </div>

            {(combination.notes ||
              combination.infoSource ||
              (row.source !== 'custom' &&
                (onShareCombination || onCopyCombination))) && (
              <div className="mt-3 space-y-1.5">
                {(combination.infoSource ||
                  (row.source !== 'custom' &&
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
                        Source
                      </a>
                    )}
                    {row.source !== 'custom' &&
                      (onShareCombination || onCopyCombination) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButton
                            onClick={() => onShareCombination?.(row)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            {row.source === 'custom' && (
              <div className="mt-3 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCustomRecipe?.(row);
                  }}
                  aria-label="Edit custom recipe"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
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
                  title="Edit custom recipe"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomRecipe?.(row);
                  }}
                  aria-label="Delete custom recipe"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
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
                  title="Delete custom recipe"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
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
