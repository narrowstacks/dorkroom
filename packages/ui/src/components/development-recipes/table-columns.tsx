import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { CellContext, ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import {
  Beaker,
  Edit2,
  ExternalLink,
  Flame,
  Snowflake,
  Star,
  Trash2,
} from 'lucide-react';
import { memo } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import type { ShareResult } from '../share-button';
import { ShareButton } from '../share-button';
import { Tag } from '../ui/tag';

/**
 * Theme-aware action button that uses CSS for hover states.
 * This prevents flickering when components re-render mid-hover.
 */
interface ActionIconButtonProps {
  icon: LucideIcon;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  ariaLabel: string;
  ariaPressed?: boolean;
  variant: 'favorite' | 'favorite-active' | 'edit' | 'delete';
  isDarkroom: boolean;
}

const ActionIconButton = memo(function ActionIconButton({
  icon: Icon,
  onClick,
  title,
  ariaLabel,
  ariaPressed,
  variant,
  isDarkroom,
}: ActionIconButtonProps) {
  // Base classes for all buttons
  const baseClasses =
    'group inline-flex items-center justify-center rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2';

  // Get variant-specific classes and styles
  const getVariantConfig = () => {
    if (isDarkroom) {
      // Darkroom mode: all buttons use red accent, hover fills with red bg and black icon
      return {
        className: cn(
          baseClasses,
          'border',
          // Default state
          'bg-[var(--color-surface-muted)] border-[var(--color-semantic-info)]',
          // Hover state - CSS handles this
          'hover:bg-[var(--color-semantic-info)]'
        ),
        iconClassName:
          'pointer-events-none h-4 w-4 transition-colors stroke-[var(--color-semantic-info)] group-hover:stroke-black',
        iconStyle:
          variant === 'favorite-active'
            ? { fill: 'var(--color-semantic-info)' }
            : undefined,
        iconHoverFill: variant === 'favorite-active' ? 'black' : undefined,
      };
    }

    // Non-darkroom themes
    switch (variant) {
      case 'favorite':
        return {
          className: cn(
            baseClasses,
            'border',
            'bg-[var(--color-surface-muted)] border-[var(--color-border-primary)]',
            'hover:bg-[var(--color-border-secondary)]'
          ),
          iconClassName:
            'pointer-events-none h-4 w-4 transition-colors stroke-[var(--color-border-primary)] group-hover:stroke-white',
        };
      case 'favorite-active':
        return {
          className: cn(
            baseClasses,
            'border',
            'bg-[var(--color-surface-muted)] border-[var(--color-border-primary)]',
            'hover:bg-[var(--color-border-secondary)]'
          ),
          iconClassName:
            'pointer-events-none h-4 w-4 transition-colors stroke-[var(--color-semantic-warning)] group-hover:stroke-white',
          iconStyle: { fill: 'var(--color-semantic-warning)' },
        };
      case 'edit':
        return {
          className: cn(
            baseClasses,
            'border border-transparent', // Transparent border for consistent sizing with bordered buttons
            'bg-[var(--color-surface-muted)]',
            'hover:bg-[var(--color-border-secondary)]'
          ),
          iconClassName:
            'pointer-events-none h-4 w-4 transition-colors stroke-[var(--color-text-secondary)] group-hover:stroke-white',
        };
      case 'delete':
        return {
          className: cn(
            baseClasses,
            'border border-transparent', // Transparent border for consistent sizing with bordered buttons
            // Use color-mix for error tint background
            '[background-color:color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)]',
            // Hover: slightly more saturated
            'hover:[background-color:color-mix(in_srgb,var(--color-semantic-error)_20%,transparent)]'
          ),
          iconClassName: cn(
            'pointer-events-none h-4 w-4 transition-colors',
            // Error color stroke
            '[stroke:color-mix(in_srgb,var(--color-semantic-error)_80%,var(--color-text-primary))]',
            'group-hover:[stroke:color-mix(in_srgb,var(--color-semantic-error)_90%,var(--color-text-primary))]'
          ),
        };
      default:
        return { className: baseClasses, iconClassName: 'h-4 w-4' };
    }
  };

  const config = getVariantConfig();

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={config.className}
    >
      <Icon
        className={config.iconClassName}
        aria-hidden="true"
        strokeWidth={2}
        style={config.iconStyle}
      />
    </button>
  );
});

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
 * Color coding: yellow (warning) + AlertTriangle for higher temps, blue (info) + Snowflake for lower temps
 */
function TemperatureCellRenderer({
  cellContext,
}: {
  cellContext: CellContext<DevelopmentCombinationView, unknown>;
}) {
  const { unit } = useTemperature();
  const { temperatureF, temperatureC } = cellContext.row.original.combination;
  const temp = formatTemperatureWithUnit(temperatureF, temperatureC, unit);

  const getTempColor = () => {
    if (!temp.isNonStandard) return 'var(--color-text-primary)';
    return temp.isHigher
      ? 'var(--color-semantic-warning)'
      : 'var(--color-semantic-info, #3b82f6)';
  };

  const TempIcon = temp.isHigher ? Flame : Snowflake;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        temp.isNonStandard && 'font-medium'
      )}
      style={{ color: getTempColor() }}
    >
      {temp.isNonStandard && (
        <TempIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
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
  ) => undefined | ShareResult | Promise<undefined | ShareResult>;
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
            <div className="mt-1 flex flex-nowrap gap-1">
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
    // Use accessorFn instead of accessorKey for nested fields to ensure
    // proper integration with custom sorting functions (favoriteAware)
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
      const isDarkroom =
        document.documentElement.getAttribute('data-theme') === 'darkroom';

      return (
        // Vertical stack: favorite+share on top, edit+delete below (if custom)
        // This prevents column width changes when custom recipes virtualize in/out
        <div className="flex flex-col gap-1.5">
          {/* Primary actions row - always same width */}
          <div className="flex items-center gap-2">
            <ActionIconButton
              icon={Star}
              onClick={(e) => {
                e.stopPropagation();
                context.onToggleFavorite?.(view);
              }}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              ariaLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
              ariaPressed={Boolean(isFav)}
              variant={isFav ? 'favorite-active' : 'favorite'}
              isDarkroom={isDarkroom}
            />
            {context.onShareCombination && (
              // biome-ignore lint/a11y/noStaticElementInteractions: wrapper to stop event propagation to parent row
              <span
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <ShareButton
                  onClick={() => context.onShareCombination?.(view)}
                  variant="outline"
                  size="sm"
                  iconOnly
                />
              </span>
            )}
          </div>
          {/* Custom recipe actions row - only adds height, not width */}
          {isCustom && (
            <div className="flex items-center gap-2">
              <ActionIconButton
                icon={Edit2}
                onClick={(e) => {
                  e.stopPropagation();
                  context.onEditCustomRecipe?.(view);
                }}
                title="Edit"
                ariaLabel="Edit"
                variant="edit"
                isDarkroom={isDarkroom}
              />
              <ActionIconButton
                icon={Trash2}
                onClick={(e) => {
                  e.stopPropagation();
                  context.onDeleteCustomRecipe?.(view);
                }}
                title="Delete"
                ariaLabel="Delete"
                variant="delete"
                isDarkroom={isDarkroom}
              />
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
];
