import { ColumnDef, CellContext } from '@tanstack/react-table';
import { Beaker, ExternalLink, Edit2, Trash2, Star } from 'lucide-react';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { useTemperature } from '../../contexts/temperature-context';
import { Tag } from '../ui/tag';
import { ShareButton } from '../share-button';
import type { ShareResult } from '../share-button';

/**
 * Formatting utilities (extracted from results-table.tsx)
 */

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

const formatDilution = (row: DevelopmentCombinationView): string => {
  const { combination, developer } = row;
  if (combination.customDilution) {
    return combination.customDilution;
  }

  if (developer && combination.dilutionId) {
    const dilution = developer.dilutions.find(
      (dilutionOption) =>
        String(dilutionOption.id) === String(combination.dilutionId)
    );

    if (dilution) {
      return dilution.dilution || dilution.name;
    }
  }

  return 'Stock';
};

/**
 * Temperature cell renderer component - uses hook to get current temperature unit
 */
function TemperatureCellRenderer({
  cellContext,
}: {
  cellContext: CellContext<DevelopmentCombinationView, unknown>;
}) {
  const { unit } = useTemperature();
  const { temperatureF, temperatureC } = cellContext.row.original.combination;
  const temp = formatTemperatureWithUnit(temperatureF, temperatureC, unit);

  return (
    <span
      className={cn(temp.isNonStandard && 'font-medium')}
      style={{
        color: temp.isNonStandard
          ? 'var(--color-semantic-warning)'
          : 'var(--color-text-primary)',
      }}
    >
      {temp.text}
    </span>
  );
}

/**
 * Column context for handlers - passed through table meta
 */
export interface TableColumnContext {
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (
    view: DevelopmentCombinationView
  ) => void | ShareResult | Promise<void | ShareResult>;
}

/**
 * Create table columns with context-aware handlers
 */
export const createTableColumns = (
  context: TableColumnContext
): ColumnDef<DevelopmentCombinationView>[] => [
  {
    accessorKey: 'film',
    header: 'Film',
    cell: (context: CellContext<DevelopmentCombinationView, unknown>) => {
      const { combination, film } = context.row.original;
      return (
        <div>
          <div
            style={{ color: 'var(--color-text-primary)' }}
            className="font-medium"
          >
            {film ? `${film.brand} ${film.name}` : 'Unknown film'}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {combination.pushPull === 0
              ? 'Box Speed'
              : combination.pushPull > 0
              ? `Push +${combination.pushPull}`
              : `Pull ${combination.pushPull}`}
          </div>
          {combination.tags && combination.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {combination.tags.map((tag: string) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </div>
      );
    },
    enableSorting: true,
    sortingFn: 'favoriteAware',
  },
  {
    accessorKey: 'developer',
    header: 'Developer',
    cell: (context: CellContext<DevelopmentCombinationView, unknown>) => {
      const { developer } = context.row.original;
      const isCustom = context.row.original.source === 'custom';
      return (
        <div>
          <div
            style={{ color: 'var(--color-text-primary)' }}
            className="font-medium"
          >
            {developer
              ? `${developer.manufacturer} ${developer.name}`
              : 'Unknown developer'}
          </div>
          {isCustom && (
            <div
              className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
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
              <Beaker className="h-3 w-3" /> Custom
            </div>
          )}
        </div>
      );
    },
    enableSorting: true,
    sortingFn: 'favoriteAware',
  },
  {
    id: 'combination.shootingIso',
    accessorFn: (row) => row.combination.shootingIso,
    header: 'ISO',
    cell: (context: CellContext<DevelopmentCombinationView, unknown>) => {
      return (
        <div style={{ color: 'var(--color-text-primary)' }}>
          {context.row.original.combination.shootingIso}
        </div>
      );
    },
    enableSorting: true,
    sortingFn: 'favoriteAware',
  },
  {
    id: 'combination.timeMinutes',
    accessorFn: (row) => row.combination.timeMinutes,
    header: 'Time',
    cell: (context: CellContext<DevelopmentCombinationView, unknown>) => {
      return (
        <div style={{ color: 'var(--color-text-primary)' }}>
          {formatTime(context.row.original.combination.timeMinutes)}
        </div>
      );
    },
    enableSorting: true,
    sortingFn: 'favoriteAware',
  },
  {
    id: 'combination.temperatureF',
    accessorFn: (row) => row.combination.temperatureF,
    header: 'Temp',
    cell: (cellContext: CellContext<DevelopmentCombinationView, unknown>) => (
      <TemperatureCellRenderer cellContext={cellContext} />
    ),
    enableSorting: true,
    sortingFn: 'favoriteAware',
  },
  {
    id: 'combination.dilutionId',
    accessorFn: (row) => row.combination.dilutionId,
    header: 'Dilution',
    cell: (cellContext: CellContext<DevelopmentCombinationView, unknown>) => {
      return (
        <div style={{ color: 'var(--color-text-primary)' }}>
          {formatDilution(cellContext.row.original)}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: 'combination.infoSource',
    accessorFn: (row) => row.combination.infoSource,
    header: 'Notes',
    cell: (cellContext: CellContext<DevelopmentCombinationView, unknown>) => {
      const { combination } = cellContext.row.original;
      return (
        <div style={{ color: 'var(--color-text-secondary)' }}>
          {combination.infoSource && (
            <a
              href={combination.infoSource}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" /> Source
            </a>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: (cellCtx: CellContext<DevelopmentCombinationView, unknown>) => {
      const view = cellCtx.row.original;
      const isFav = context.isFavorite?.(view);
      const isCustom = view.source === 'custom';

      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={Boolean(isFav)}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.stopPropagation();
              context.onToggleFavorite?.(view);
            }}
            className="inline-flex items-center justify-center rounded-md p-1.5 transition"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
              color: isFav
                ? 'var(--color-semantic-warning)'
                : 'var(--color-border-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-border-secondary)';
              const star = e.currentTarget.querySelector('svg');
              if (star) {
                star.style.stroke = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-surface-muted)';
              const star = e.currentTarget.querySelector('svg');
              if (star) {
                star.style.stroke = isFav
                  ? 'var(--color-semantic-warning)'
                  : 'var(--color-border-secondary)';
              }
            }}
          >
            <Star
              className="h-4 w-4"
              aria-hidden="true"
              fill={isFav ? 'var(--color-semantic-warning)' : 'none'}
              stroke={
                isFav
                  ? 'var(--color-semantic-warning)'
                  : 'var(--color-border-secondary)'
              }
              strokeWidth={2}
            />
          </button>
          {isCustom ? (
            <div className="flex flex-col items-center gap-2">
              {context.onShareCombination && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ShareButton
                    onClick={() => context.onShareCombination?.(view)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  />
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    context.onEditCustomRecipe?.(view);
                  }}
                  aria-label="Edit"
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    backgroundColor: 'var(--color-surface-muted)',
                    color: 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-border-secondary)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-surface-muted)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                  title="Edit"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    context.onDeleteCustomRecipe?.(view);
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
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()}>
              <ShareButton
                onClick={() => context.onShareCombination?.(view)}
                variant="outline"
                size="sm"
                className="text-xs"
              />
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
];
