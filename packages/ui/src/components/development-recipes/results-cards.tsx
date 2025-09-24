import { Beaker, ExternalLink, Share2, Edit2, Trash2 } from 'lucide-react';
import type { DevelopmentCombinationView } from './results-table';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { cn } from '../../lib/cn';
import { Tag } from '../ui/tag';

interface DevelopmentResultsCardsProps {
  rows: DevelopmentCombinationView[];
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (view: DevelopmentCombinationView) => void;
  onCopyCombination?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  isMobile?: boolean;
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
      (dilution) => String(dilution.id) === String(combination.dilutionId)
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
                  ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)'
                  : 'var(--color-border-secondary)',
              backgroundColor:
                row.source === 'custom'
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : 'var(--color-border-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                row.source === 'custom'
                  ? 'color-mix(in srgb, var(--color-accent) 40%, transparent)'
                  : 'var(--color-border-primary)';
              e.currentTarget.style.backgroundColor =
                row.source === 'custom'
                  ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                  : 'var(--color-border-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                row.source === 'custom'
                  ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)'
                  : 'var(--color-border-secondary)';
              e.currentTarget.style.backgroundColor =
                row.source === 'custom'
                  ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                  : 'var(--color-border-muted)';
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
                {row.source === 'custom' && (
                  <span
                    className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                      color:
                        'color-mix(in srgb, var(--color-accent) 80%, var(--color-text-primary))',
                    }}
                  >
                    <Beaker className="h-3 w-3" /> Custom recipe
                  </span>
                )}
              </div>
              {combination.tags && combination.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-end ml-2">
                  {combination.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              )}
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
                {combination.notes && (
                  <div
                    className="rounded-lg p-2 text-xs"
                    style={{
                      backgroundColor: 'var(--color-border-secondary)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {combination.notes}
                  </div>
                )}
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
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    )}
                    {row.source !== 'custom' &&
                      (onShareCombination || onCopyCombination) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareCombination?.(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition"
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
                          title="Share recipe"
                        >
                          <Share2 className="h-3 w-3" />
                          Share
                        </button>
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
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition"
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
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-semantic-error) 10%, transparent)',
                    color:
                      'color-mix(in srgb, var(--color-semantic-error) 80%, var(--color-text-primary))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'color-mix(in srgb, var(--color-semantic-error) 20%, transparent)';
                    e.currentTarget.style.color =
                      'color-mix(in srgb, var(--color-semantic-error) 90%, var(--color-text-primary))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'color-mix(in srgb, var(--color-semantic-error) 10%, transparent)';
                    e.currentTarget.style.color =
                      'color-mix(in srgb, var(--color-semantic-error) 80%, var(--color-text-primary))';
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
            backgroundColor: 'var(--color-border-muted)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          No recipes match your current filters. Try adjusting your search.
        </div>
      )}
    </div>
  );
}
