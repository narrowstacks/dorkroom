import type { Dilution } from '@dorkroom/api';
import {
  calculatePushPull,
  type DevelopmentCombinationView,
} from '@dorkroom/logic';
import type { Row, Table } from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  ExternalLink,
  Flame,
  Snowflake,
  Star,
  Trash2,
} from 'lucide-react';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import { useTemperature } from '../../contexts/temperature-context';
import { cn } from '../../lib/cn';
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
import {
  useDeleteButtonStyles,
  useRecipeHoverStyles,
} from './use-recipe-hover-styles';
import {
  CARD_OVERSCAN,
  CARD_ROW_ESTIMATED_HEIGHT,
  createDebouncedObserveElementRect,
  DEFAULT_CONTAINER_HEIGHT,
  MAX_CONTAINER_HEIGHT,
  MIN_CONTAINER_HEIGHT,
  RESIZE_DEBOUNCE_MS,
} from './virtualization-constants';

/** Tailwind breakpoint widths in pixels */
const BREAKPOINT_XL = 1280;
const BREAKPOINT_LG = 1024;
const BREAKPOINT_SM = 640;

/**
 * Hook to calculate responsive column count based on container width
 * Matches Tailwind breakpoints: sm:640px, lg:1024px, xl:1280px
 *
 * Uses debounced ResizeObserver to prevent browser lockups during rapid resizing.
 */
function useResponsiveColumnCount(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
): number {
  const [columnCount, setColumnCount] = useState(isMobile ? 2 : 3);

  useEffect(() => {
    if (isMobile) {
      setColumnCount(2);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const calculateColumns = (width: number): number => {
      // Match Tailwind breakpoints for grid-cols
      if (width >= BREAKPOINT_XL) return 4; // xl
      if (width >= BREAKPOINT_LG) return 3; // lg
      if (width >= BREAKPOINT_SM) return 2; // sm
      return 1;
    };

    // Track mount state to prevent updates after unmount
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastColumnCount: number | null = null;

    const updateColumnCount = (width: number) => {
      const newColumnCount = calculateColumns(width);
      // Skip update if column count hasn't changed
      if (lastColumnCount === newColumnCount) return;
      lastColumnCount = newColumnCount;
      setColumnCount(newColumnCount);
    };

    const debouncedUpdate = (width: number) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        if (isMounted) {
          updateColumnCount(width);
        }
        timeoutId = null;
      }, RESIZE_DEBOUNCE_MS);
    };

    const observer = new ResizeObserver((entries) => {
      // Prevent state updates if component unmounted during async callback
      if (!isMounted) return;

      for (const entry of entries) {
        const width = entry.contentRect.width;
        debouncedUpdate(width);
      }
    });

    observer.observe(container);
    // Initial calculation (not debounced)
    updateColumnCount(container.clientWidth);

    return () => {
      isMounted = false; // Set flag first to prevent any in-flight callbacks
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      observer.disconnect();
    };
  }, [containerRef, isMobile]);

  return columnCount;
}

interface DevelopmentResultsCardsVirtualizedProps {
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
  /** Height of the virtualized container. Defaults to calc(100dvh - 280px) */
  height?: string;
  /** Ref to the scroll container, can be used to scroll to top on page change */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** ID of the currently selected recipe to highlight in the grid */
  selectedRecipeId?: string | null;
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

export const DevelopmentResultsCardsVirtualized: FC<
  DevelopmentResultsCardsVirtualizedProps
> = ({
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
  height = DEFAULT_CONTAINER_HEIGHT,
  scrollContainerRef,
  selectedRecipeId,
}) => {
  const { unit } = useTemperature();
  const [hoveredFavoriteId, setHoveredFavoriteId] = useState<string | null>(
    null
  );
  const rows = table.getRowModel().rows;

  // Pre-compute hover styles to avoid recalculating on every hover event
  const hoverStyles = useRecipeHoverStyles();
  const deleteButtonStyles = useDeleteButtonStyles();

  const internalRef = useRef<HTMLDivElement>(null);
  const parentRef = scrollContainerRef || internalRef;

  // Calculate number of columns based on container width (responsive)
  const columnCount = useResponsiveColumnCount(parentRef, isMobile);

  // Memoize the debounced observer to prevent recreation on every render
  const debouncedObserveElementRect = useMemo(
    () => createDebouncedObserveElementRect(),
    []
  );

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(rows.length / columnCount),
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_ROW_ESTIMATED_HEIGHT,
    overscan: CARD_OVERSCAN,
    // Use debounced resize observation to prevent browser lockups during rapid resizing
    observeElementRect: debouncedObserveElementRect,
    // Enable dynamic measurement for rows with varying heights (e.g., custom recipes with extra buttons)
    measureElement:
      typeof window !== 'undefined' &&
      'ResizeObserver' in window &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // Padding to prevent hover scale effect from being clipped at container edges
  const HOVER_OVERFLOW_PADDING = 8;

  return (
    <div
      ref={parentRef}
      style={{
        height,
        minHeight: MIN_CONTAINER_HEIGHT,
        maxHeight: MAX_CONTAINER_HEIGHT,
        overflow: 'auto',
        // Add padding to accommodate hover scale effect overflow
        paddingTop: HOVER_OVERFLOW_PADDING,
        paddingBottom: HOVER_OVERFLOW_PADDING,
        paddingLeft: HOVER_OVERFLOW_PADDING,
        paddingRight: HOVER_OVERFLOW_PADDING,
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow: VirtualItem) => {
          const startIndex = virtualRow.index * columnCount;
          const endIndex = Math.min(startIndex + columnCount, rows.length);
          const rowItems = rows.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-4"
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {rowItems.map((row: Row<DevelopmentCombinationView>) => {
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

                  // Pre-select styles based on source to avoid calculation in event handlers
                  const cardStyles =
                    rowData.source === 'custom'
                      ? hoverStyles.custom
                      : hoverStyles.api;
                  const isSelected = id === selectedRecipeId;

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: Card uses ARIA role with keyboard support instead of button to avoid resetting button styles
                    <div
                      key={combination.uuid || combination.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => onSelectCombination?.(rowData)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectCombination?.(rowData);
                        }
                      }}
                      className={cn(
                        'cursor-pointer rounded-2xl border p-3 shadow-subtle transition-all duration-200 hover:scale-[1.02]',
                        'animate-slide-fade-bottom'
                      )}
                      style={{
                        borderColor: isSelected
                          ? cardStyles.selected.borderColor
                          : cardStyles.default.borderColor,
                        backgroundColor: isSelected
                          ? cardStyles.selected.backgroundColor
                          : cardStyles.default.backgroundColor,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor =
                            cardStyles.hover.borderColor;
                          e.currentTarget.style.backgroundColor =
                            cardStyles.hover.backgroundColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor =
                            cardStyles.default.borderColor;
                          e.currentTarget.style.backgroundColor =
                            cardStyles.default.backgroundColor;
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {film
                              ? `${film.brand} ${film.name}`
                              : 'Unknown film'}
                          </span>
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
                                    (t: string) =>
                                      !isOfficialTag(t) && t !== 'custom'
                                  )
                                  .map((tag: string) => (
                                    <Tag key={tag}>{tag}</Tag>
                                  ))}
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {rowData.source === 'custom' && (
                            <CustomBadge showTooltip={!isMobile} />
                          )}
                          {combination.tags
                            ?.filter(isOfficialTag)
                            .map((tag: string) => (
                              <OfficialBadge
                                key={tag}
                                tag={tag}
                                showTooltip={!isMobile}
                              />
                            ))}
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
                            className="inline-flex items-center justify-center rounded-md p-1.5 transition"
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
                                  ? 'var(--color-background)'
                                  : isFavorite?.(rowData)
                                    ? 'var(--color-semantic-warning)'
                                    : 'var(--color-border-secondary)'
                              }
                              strokeWidth={2}
                            />
                          </button>
                        </div>
                      </div>

                      <div
                        className="mt-3 grid grid-cols-2 gap-1 text-xs"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>
                            ISO
                          </div>
                          {(() => {
                            // Calculate pushPull from film box speed if available
                            const pushPull = film?.isoSpeed
                              ? calculatePushPull(
                                  combination.shootingIso,
                                  film.isoSpeed
                                )
                              : combination.pushPull;
                            const isPushed = pushPull > 0;
                            const isNonBoxSpeed = pushPull !== 0;
                            const getIsoColor = () => {
                              if (!isNonBoxSpeed)
                                return 'var(--color-text-primary)';
                              return isPushed
                                ? 'var(--color-semantic-warning)'
                                : 'var(--color-semantic-info, #3b82f6)';
                            };
                            const IsoIcon = isPushed ? ArrowUp : ArrowDown;
                            return (
                              <div
                                className={cn(
                                  'text-sm inline-flex items-center gap-1',
                                  isNonBoxSpeed && 'font-medium'
                                )}
                                style={{ color: getIsoColor() }}
                              >
                                {isNonBoxSpeed && (
                                  <IsoIcon
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                )}
                                {combination.shootingIso}
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>
                            Time
                          </div>
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
                              if (!temp.isNonStandard)
                                return 'var(--color-text-primary)';
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
                          <div style={{ color: 'var(--color-text-muted)' }}>
                            Dilution
                          </div>
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
                                  style={{
                                    color: 'var(--color-text-tertiary)',
                                  }}
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
                                  <ExternalLink
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />{' '}
                                  Source
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
                                      onClick={() =>
                                        onShareCombination?.(rowData)
                                      }
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
                                  backgroundColor:
                                    deleteButtonStyles.default.backgroundColor,
                                  color: deleteButtonStyles.default.color,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    deleteButtonStyles.hover.backgroundColor;
                                  e.currentTarget.style.color =
                                    deleteButtonStyles.hover.color;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    deleteButtonStyles.default.backgroundColor;
                                  e.currentTarget.style.color =
                                    deleteButtonStyles.default.color;
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
              </div>
            </div>
          );
        })}
      </div>

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
};
