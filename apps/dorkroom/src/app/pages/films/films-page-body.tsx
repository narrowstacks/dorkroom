import type { Film } from '@dorkroom/api';
import type { UseFilmDatabaseReturn } from '@dorkroom/logic';
import { VirtualizedErrorBoundary } from '@dorkroom/ui/development-recipes';
import {
  FilmDetailPanel,
  FilmDetailPanelSkeleton,
  FilmFiltersMobile,
  FilmFiltersPanel,
  FilmResultsVirtualized,
} from '@dorkroom/ui/films';

interface FilmsPageBodyProps {
  db: UseFilmDatabaseReturn;
  isMobile: boolean;
  selectedFilm: Film | null;
  baseFilm: Film | null;
  shouldShowDetailSkeleton: boolean;
  onSelectFilm: (film: Film) => void;
  onClosePanel: () => void;
  isFiltersCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

/**
 * The films page below its header, for both breakpoints. Only the filter
 * module (and the desktop aside/main landmarks around it) swaps by
 * breakpoint; the results list and the detail panel are one tree, and the
 * panel handles drawer vs sidebar itself through `isMobile` (#380).
 */
export function FilmsPageBody({
  db,
  isMobile,
  selectedFilm,
  baseFilm,
  shouldShowDetailSkeleton,
  onSelectFilm,
  onClosePanel,
  isFiltersCollapsed,
  onCollapsedChange,
}: FilmsPageBodyProps) {
  // One props object for whichever filter module the breakpoint mounts.
  const filterProps = {
    searchQuery: db.searchQuery,
    onSearchChange: db.setSearchQuery,
    colorTypeFilter: db.colorTypeFilter,
    onColorTypeChange: db.setColorTypeFilter,
    isoSpeedFilter: db.isoSpeedFilter,
    onIsoSpeedChange: db.setIsoSpeedFilter,
    brandFilter: db.brandFilter,
    onBrandChange: db.setBrandFilter,
    discontinuedFilter: db.discontinuedFilter,
    onDiscontinuedChange: db.setDiscontinuedFilter,
    brandOptions: db.brandOptions,
    isoOptions: db.isoOptions,
    onClearFilters: db.clearFilters,
    hasActiveFilters: db.hasActiveFilters,
  };

  const results = (
    <VirtualizedErrorBoundary>
      <FilmResultsVirtualized
        films={db.filteredFilms}
        selectedFilmId={selectedFilm?.uuid ?? null}
        onSelectFilm={onSelectFilm}
        isMobile={isMobile}
        isLoading={db.isLoading}
        isDetailOpen={!!selectedFilm || shouldShowDetailSkeleton}
        isFiltersCollapsed={!isMobile && isFiltersCollapsed}
        onClearFilters={db.clearFilters}
        hasActiveFilters={db.hasActiveFilters}
      />
    </VirtualizedErrorBoundary>
  );

  return (
    <div className={isMobile ? 'space-y-4' : 'mt-6 flex gap-6'}>
      {isMobile ? (
        <FilmFiltersMobile
          {...filterProps}
          resultCount={db.filteredFilms.length}
        />
      ) : (
        <aside className="flex-shrink-0 transition-[width] duration-300">
          <FilmFiltersPanel
            {...filterProps}
            onCollapsedChange={onCollapsedChange}
          />
        </aside>
      )}

      {isMobile ? (
        results
      ) : (
        <main id="film-results" className="flex-1 min-w-0">
          {results}
        </main>
      )}

      {/* Rendered unconditionally: the panel owns its own visibility. It
          renders nothing without a film, and its stateful inner DetailPanel
          only exists while one is selected, so closing still discards drag
          and expanded state, and there is no exit animation a conditional
          mount could cut short. Keyed by breakpoint so crossing it starts the
          panel fresh (an expanded desktop modal drops back to the mobile
          drawer). */}
      {shouldShowDetailSkeleton ? (
        <FilmDetailPanelSkeleton isMobile={isMobile} />
      ) : (
        <FilmDetailPanel
          key={isMobile ? 'mobile' : 'desktop'}
          film={selectedFilm}
          baseFilm={baseFilm}
          isOpen={!!selectedFilm}
          onClose={onClosePanel}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
