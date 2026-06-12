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
/** Below this width the mobile grid collapses to 1 column (plan 009 item 5). */
const BREAKPOINT_MOBILE_2COL = 480;

/**
 * Hook to calculate responsive column count based on container width.
 *
 * Desktop: matches Tailwind breakpoints sm:640px, lg:1024px, xl:1280px.
 * Mobile: 1 column below 480px, 2 columns at 480px and above.
 *
 * Uses debounced ResizeObserver to prevent browser lockups during rapid resizing.
 */
function useResponsiveColumnCount(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
): number {
  const [observedColumnCount, setColumnCount] = useState(isMobile ? 2 : 3);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateColumns = (width: number): number => {
      if (isMobile) {
        // 1-col below 480px, 2-col at 480px+ (plan 009 item 5)
        return width >= BREAKPOINT_MOBILE_2COL ? 2 : 1;
      }
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

  return observedColumnCount;
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

/** Filter a recipe's tags into official badges and other display tags in one pass. */
function partitionTags(tags: string[] | undefined): {
  officialTags: string[];
  otherTags: string[];
} {
  const officialTags: string[] = [];
  const otherTags: string[] = [];
  if (tags) {
    for (const tag of tags) {
      if (isOfficialTag(tag)) {
        officialTags.push(tag);
      } else if (tag !== 'custom') {
        otherTags.push(tag);
      }
    }
  }
  return { officialTags, otherTags };
}

/** ISO stat for a recipe card; highlights non-box-speed (push/pull) values. */
function IsoStat({
  combination,
  film,
}: {
  combination: DevelopmentCombinationView['combination'];
  film: DevelopmentCombinationView['film'];
}) {
  // Calculate pushPull from film box speed if available
  const pushPull = film?.isoSpeed
    ? calculatePushPull(combination.shootingIso, film.isoSpeed)
    : (combination.pushPull ?? 0);
  const isPushed = pushPull > 0;
  const isNonBoxSpeed = pushPull !== 0;
  const getIsoColor = () => {
    if (!isNonBoxSpeed) return 'var(--color-text-primary)';
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
        <IsoIcon className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {combination.shootingIso}
    </div>
  );
}

/** Temperature stat for a recipe card; highlights non-standard temperatures. */
function TempStat({
  combination,
  unit,
}: {
  combination: DevelopmentCombinationView['combination'];
  unit: ReturnType<typeof useTemperature>['unit'];
}) {
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
        <TempIcon className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {temp.text}
    </div>
  );
}

interface RecipeCardProps {
  rowData: DevelopmentCombinationView;
  unit: ReturnType<typeof useTemperature>['unit'];
  cardStyles: ReturnType<typeof useRecipeHoverStyles>['custom'];
  deleteButtonStyles: ReturnType<typeof useDeleteButtonStyles>;
  isSelected: boolean;
  isMobile: boolean;
  isFavoriteRecipe: boolean;
  isFavoriteHovered: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onFavoriteHoverChange: (hovered: boolean) => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canShare: boolean;
  canCopy: boolean;
}

/**
 * A single development-recipe card. A transparent overlay button covers the
 * card to make the whole surface a keyboard-accessible "select" control, while
 * the nested action buttons (favorite/share/edit/delete) sit above it.
 */
// eslint-disable-next-line react-doctor/no-many-boolean-props -- internal card row; its boolean inputs are independent display states, not a variant axis
function RecipeCard({
  rowData,
  unit,
  cardStyles,
  deleteButtonStyles,
  isSelected,
  isMobile,
  isFavoriteRecipe,
  isFavoriteHovered,
  onSelect,
  onToggleFavorite,
  onFavoriteHoverChange,
  onShare,
  onEdit,
  onDelete,
  canShare,
  canCopy,
}: RecipeCardProps) {
  const { combination, film, developer } = rowData;
  const isCustom = rowData.source === 'custom';
  const { officialTags, otherTags } = partitionTags(
    combination.tags ?? undefined
  );
  const favoriteLabel = isFavoriteRecipe
    ? 'Remove from favorites'
    : 'Add to favorites';

  return (
    <div
      className={cn(
        'relative cursor-pointer rounded-2xl border p-3 shadow-subtle transition-all duration-200 hover:scale-[1.02]',
        'animate-slide-fade-bottom',
        !isSelected && 'hoverable-card'
      )}
      style={
        {
          '--card-bg': isSelected
            ? cardStyles.selected.backgroundColor
            : cardStyles.default.backgroundColor,
          '--card-bg-hover': cardStyles.hover.backgroundColor,
          '--card-border': isSelected
            ? cardStyles.selected.borderColor
            : cardStyles.default.borderColor,
          '--card-border-hover': cardStyles.hover.borderColor,
          borderColor: isSelected
            ? cardStyles.selected.borderColor
            : cardStyles.default.borderColor,
          backgroundColor: isSelected
            ? cardStyles.selected.backgroundColor
            : cardStyles.default.backgroundColor,
        } as React.CSSProperties
      }
    >
      {/* Full-card overlay button provides the click/keyboard select target */}
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={
          film ? `Select ${film.brand} ${film.name} recipe` : 'Select recipe'
        }
        onClick={onSelect}
        className="absolute inset-0 z-0 size-full cursor-pointer rounded-2xl"
      />

      <div className="relative z-10 flex justify-between items-start pointer-events-none">
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {film ? `${film.brand} ${film.name}` : 'Unknown film'}
          </span>
          <div
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {developer
              ? `${developer.manufacturer} ${developer.name}`
              : 'Unknown developer'}
          </div>
          {otherTags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {otherTags.map((tag: string) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0 pointer-events-auto">
          {isCustom && <CustomBadge showTooltip={!isMobile} />}
          {officialTags.map((tag: string) => (
            <OfficialBadge key={tag} tag={tag} showTooltip={!isMobile} />
          ))}
          <button
            type="button"
            title={favoriteLabel}
            aria-pressed={isFavoriteRecipe}
            aria-label={favoriteLabel}
            onClick={onToggleFavorite}
            className="inline-flex items-center justify-center rounded-md p-1.5 transition hoverable-favorite"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
              color: isFavoriteRecipe
                ? 'var(--color-semantic-warning)'
                : 'var(--color-border-secondary)',
            }}
            onMouseEnter={() => {
              onFavoriteHoverChange(true);
            }}
            onMouseLeave={() => {
              onFavoriteHoverChange(false);
            }}
          >
            <Star
              className="size-4"
              aria-hidden="true"
              fill={isFavoriteRecipe ? 'var(--color-semantic-warning)' : 'none'}
              stroke={
                isFavoriteHovered
                  ? 'var(--color-background)'
                  : isFavoriteRecipe
                    ? 'var(--color-semantic-warning)'
                    : 'var(--color-border-secondary)'
              }
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      <div
        className="relative z-10 mt-3 grid grid-cols-2 gap-1 text-xs pointer-events-none"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <div>
          <div style={{ color: 'var(--color-text-muted)' }}>ISO</div>
          <IsoStat combination={combination} film={film} />
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
          <div style={{ color: 'var(--color-text-muted)' }}>Temperature</div>
          <TempStat combination={combination} unit={unit} />
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
        (!isCustom && (canShare || canCopy))) && (
        <div className="relative z-10 mt-3 space-y-1.5 pointer-events-auto">
          {(combination.infoSource || (!isCustom && (canShare || canCopy))) && (
            <div className="flex justify-between items-center">
              {combination.infoSource && (
                <a
                  href={combination.infoSource}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline hoverable-link"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <ExternalLink className="size-3" aria-hidden="true" /> Source
                </a>
              )}
              {!isCustom && (canShare || canCopy) && onShare && (
                <ShareButton
                  onClick={onShare}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                />
              )}
            </div>
          )}
        </div>
      )}

      {isCustom && (
        <div className="relative z-10 mt-3 space-y-1.5 pointer-events-auto">
          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 hoverable-action-btn"
                style={{
                  backgroundColor: 'var(--color-border-muted)',
                  color: 'var(--color-text-secondary)',
                }}
                title="Edit"
              >
                <Edit2 className="size-3" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 hoverable-delete-btn"
                style={
                  {
                    '--del-bg': deleteButtonStyles.default.backgroundColor,
                    '--del-bg-hover': deleteButtonStyles.hover.backgroundColor,
                    '--del-color': deleteButtonStyles.default.color,
                    '--del-color-hover': deleteButtonStyles.hover.color,
                    backgroundColor: deleteButtonStyles.default.backgroundColor,
                    color: deleteButtonStyles.default.color,
                  } as React.CSSProperties
                }
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
            {onShare && (
              <ShareButton
                onClick={onShare}
                variant="outline"
                size="sm"
                className="text-xs"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  return (
    <div
      ref={parentRef}
      // p-2 (8px) adds padding so the card hover scale effect isn't clipped
      // at the scroll container edges; overflow-auto enables virtualized scroll.
      className="overflow-auto p-2"
      style={{
        height,
        minHeight: MIN_CONTAINER_HEIGHT,
        maxHeight: MAX_CONTAINER_HEIGHT,
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
                  const { combination } = rowData;
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
                    <RecipeCard
                      key={combination.uuid || combination.id}
                      rowData={rowData}
                      unit={unit}
                      cardStyles={cardStyles}
                      deleteButtonStyles={deleteButtonStyles}
                      isSelected={isSelected}
                      isMobile={isMobile}
                      isFavoriteRecipe={Boolean(isFavorite?.(rowData))}
                      isFavoriteHovered={hoveredFavoriteId === id}
                      onSelect={() => onSelectCombination?.(rowData)}
                      onToggleFavorite={() => onToggleFavorite?.(rowData)}
                      onFavoriteHoverChange={(hovered) => {
                        setHoveredFavoriteId(hovered ? id : null);
                      }}
                      onShare={
                        onShareCombination
                          ? () => onShareCombination(rowData)
                          : undefined
                      }
                      onEdit={
                        onEditCustomRecipe
                          ? () => onEditCustomRecipe(rowData)
                          : undefined
                      }
                      onDelete={
                        onDeleteCustomRecipe
                          ? () => onDeleteCustomRecipe(rowData)
                          : undefined
                      }
                      canShare={Boolean(onShareCombination)}
                      canCopy={Boolean(onCopyCombination)}
                    />
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
