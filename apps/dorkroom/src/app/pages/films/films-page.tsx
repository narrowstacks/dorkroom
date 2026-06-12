import type { Film } from '@dorkroom/api';
import {
  buildFilmSlugIndex,
  getBaseFilm,
  useFilmDatabase,
} from '@dorkroom/logic';
import { getRouteIcon, useIsMobile } from '@dorkroom/ui';
import { CalculatorPageHeader } from '@dorkroom/ui/calculator';
import { VirtualizedErrorBoundary } from '@dorkroom/ui/development-recipes';
import {
  FilmDetailPanel,
  FilmDetailPanelSkeleton,
  FilmFiltersMobile,
  FilmFiltersPanel,
  FilmResultsVirtualized,
} from '@dorkroom/ui/films';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

type FilmDatabase = ReturnType<typeof useFilmDatabase>;

interface FilmLayoutProps {
  db: FilmDatabase;
  isMobile: boolean;
  selectedFilm: Film | null;
  baseFilm: Film | undefined;
  shouldShowDetailSkeleton: boolean;
  onSelectFilm: (film: Film) => void;
  onClosePanel: () => void;
}

function FilmsMobileLayout({
  db,
  isMobile,
  selectedFilm,
  baseFilm,
  shouldShowDetailSkeleton,
  onSelectFilm,
  onClosePanel,
}: FilmLayoutProps) {
  return (
    <div className="space-y-4">
      <FilmFiltersMobile
        searchQuery={db.searchQuery}
        onSearchChange={db.setSearchQuery}
        colorTypeFilter={db.colorTypeFilter}
        onColorTypeChange={db.setColorTypeFilter}
        isoSpeedFilter={db.isoSpeedFilter}
        onIsoSpeedChange={db.setIsoSpeedFilter}
        brandFilter={db.brandFilter}
        onBrandChange={db.setBrandFilter}
        discontinuedFilter={db.discontinuedFilter}
        onDiscontinuedChange={db.setDiscontinuedFilter}
        brandOptions={db.brandOptions}
        isoOptions={db.isoOptions}
        onClearFilters={db.clearFilters}
        hasActiveFilters={db.hasActiveFilters}
        resultCount={db.filteredFilms.length}
      />

      <VirtualizedErrorBoundary>
        <FilmResultsVirtualized
          films={db.filteredFilms}
          selectedFilmId={selectedFilm?.uuid ?? null}
          onSelectFilm={onSelectFilm}
          isMobile={isMobile}
          isLoading={db.isLoading}
          isDetailOpen={!!selectedFilm || shouldShowDetailSkeleton}
          isFiltersCollapsed={false}
        />
      </VirtualizedErrorBoundary>

      {shouldShowDetailSkeleton ? (
        <FilmDetailPanelSkeleton isMobile={isMobile} />
      ) : (
        <FilmDetailPanel
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

function FilmsDesktopLayout({
  db,
  isMobile,
  selectedFilm,
  shouldShowDetailSkeleton,
  onSelectFilm,
  onClosePanel,
  isFiltersCollapsed,
  onCollapsedChange,
}: FilmLayoutProps & {
  isFiltersCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  return (
    <div className="mt-6 flex gap-6">
      <aside className="flex-shrink-0 transition-all duration-300">
        <FilmFiltersPanel
          onCollapsedChange={onCollapsedChange}
          searchQuery={db.searchQuery}
          onSearchChange={db.setSearchQuery}
          colorTypeFilter={db.colorTypeFilter}
          onColorTypeChange={db.setColorTypeFilter}
          isoSpeedFilter={db.isoSpeedFilter}
          onIsoSpeedChange={db.setIsoSpeedFilter}
          brandFilter={db.brandFilter}
          onBrandChange={db.setBrandFilter}
          discontinuedFilter={db.discontinuedFilter}
          onDiscontinuedChange={db.setDiscontinuedFilter}
          brandOptions={db.brandOptions}
          isoOptions={db.isoOptions}
          onClearFilters={db.clearFilters}
          hasActiveFilters={db.hasActiveFilters}
        />
      </aside>

      <main id="film-results" className="flex-1 min-w-0">
        <VirtualizedErrorBoundary>
          <FilmResultsVirtualized
            films={db.filteredFilms}
            selectedFilmId={selectedFilm?.uuid ?? null}
            onSelectFilm={onSelectFilm}
            isMobile={isMobile}
            isLoading={db.isLoading}
            isDetailOpen={!!selectedFilm || shouldShowDetailSkeleton}
            isFiltersCollapsed={isFiltersCollapsed}
          />
        </VirtualizedErrorBoundary>
      </main>

      {shouldShowDetailSkeleton ? (
        <FilmDetailPanelSkeleton isMobile={isMobile} />
      ) : (
        selectedFilm && (
          <FilmDetailPanel
            film={selectedFilm}
            isOpen={!!selectedFilm}
            onClose={onClosePanel}
            isMobile={isMobile}
          />
        )
      )}
    </div>
  );
}

export default function FilmsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/films' });

  const db = useFilmDatabase();
  const {
    films,
    filteredFilms,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    colorTypeFilter,
    setColorTypeFilter,
    isoSpeedFilter,
    setIsoSpeedFilter,
    brandFilter,
    setBrandFilter,
    discontinuedFilter,
    setDiscontinuedFilter,
  } = db;

  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [resultCountAnnouncement, setResultCountAnnouncement] =
    useState<string>('');

  // Track the last processed URL film slug to avoid reprocessing the same one
  const lastProcessedFilmSlug = useRef<string | null>(null);

  // Get the film slug from URL params (stable reference)
  const urlFilmSlug = searchParams.film;

  // Find the film matching the URL slug from ALL films (not filtered)
  // This ensures we can find the film even if filters would hide it
  const urlFilm = useMemo(() => {
    if (!urlFilmSlug) return null;
    return films.find((f) => f.slug === urlFilmSlug) ?? null;
  }, [films, urlFilmSlug]);

  // Sync URL params to filter state when URL changes (back/forward navigation, bookmarks).
  // Each param syncs in its own effect so a single effect never performs multiple state
  // updates. Effects only run when their URL param changes - they do NOT include the
  // matching state value in deps, to avoid clearing user input before the debounced
  // state→URL sync fires. We don't clear state when a URL param is undefined; the
  // debounced state→URL sync handles that.
  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.search !== undefined &&
      searchParams.search !== searchQuery
    ) {
      setSearchQuery(searchParams.search);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.color !== undefined &&
      searchParams.color !== colorTypeFilter
    ) {
      setColorTypeFilter(searchParams.color);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.color]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (searchParams.iso !== undefined && searchParams.iso !== isoSpeedFilter) {
      setIsoSpeedFilter(searchParams.iso);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.iso]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.brand !== undefined &&
      searchParams.brand !== brandFilter
    ) {
      setBrandFilter(searchParams.brand);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.brand]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setter is a stable ref; state value intentionally excluded
  useEffect(() => {
    if (
      searchParams.status !== undefined &&
      searchParams.status !== discontinuedFilter
    ) {
      setDiscontinuedFilter(searchParams.status);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- setter is a stable ref; state value intentionally excluded to avoid clearing user input before debounced URL sync
  }, [searchParams.status]);

  // Select film from URL param when data loads or URL changes
  useEffect(() => {
    // Skip if no URL film param
    if (!urlFilmSlug) {
      // Clear selection if URL had a film but now doesn't
      if (lastProcessedFilmSlug.current !== null) {
        lastProcessedFilmSlug.current = null;
      }
      return;
    }

    // Skip if we already processed this same slug
    if (lastProcessedFilmSlug.current === urlFilmSlug) return;

    // Wait until loading is complete
    if (isLoading) return;

    // Mark this slug as processed
    lastProcessedFilmSlug.current = urlFilmSlug;

    // Select the film if found
    if (urlFilm) {
      setSelectedFilm(urlFilm);
    }
  }, [urlFilm, urlFilmSlug, isLoading]);

  // Debounced URL sync (500ms)
  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable from TanStack Router
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate({
        to: '/films',
        search: {
          search: searchQuery || undefined,
          color: colorTypeFilter
            ? (colorTypeFilter as 'bw' | 'color' | 'slide')
            : undefined,
          iso: isoSpeedFilter || undefined,
          brand: brandFilter || undefined,
          status: discontinuedFilter !== 'all' ? discontinuedFilter : undefined,
          film: selectedFilm?.slug || undefined,
        },
        replace: true,
      });
    }, 500);

    return () => clearTimeout(timeout);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- navigate is stable from TanStack Router
  }, [
    searchQuery,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
    selectedFilm,
  ]);

  // Update ARIA live region when filteredFilms changes
  useEffect(() => {
    if (!isLoading) {
      const count = filteredFilms.length;
      const announcement =
        count === 1 ? '1 film found' : `${count} films found`;
      setResultCountAnnouncement(announcement);
    }
  }, [filteredFilms.length, isLoading]);

  const filmSlugIndex = useMemo(() => buildFilmSlugIndex(films), [films]);

  const baseFilm = useMemo(
    () => (selectedFilm ? getBaseFilm(selectedFilm, filmSlugIndex) : undefined),
    [selectedFilm, filmSlugIndex]
  );

  const handleSelectFilm = (film: Film) => {
    setSelectedFilm(film);
  };

  const handleClosePanel = () => {
    setSelectedFilm(null);
  };

  // Determine if we should show the loading skeleton in the detail panel position
  // Show when: URL has a film slug, but we haven't found/loaded the film yet, and general loading is done
  const shouldShowDetailSkeleton = Boolean(
    !isLoading &&
      urlFilmSlug &&
      !urlFilm &&
      lastProcessedFilmSlug.current !== urlFilmSlug
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Skip link for accessibility */}
      <a
        href="#film-results"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
        }}
      >
        Skip to film results
      </a>

      {/* ARIA live region for result count announcements */}
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {resultCountAnnouncement}
      </output>

      <CalculatorPageHeader
        title="Film Database"
        icon={getRouteIcon('/films')}
        accentTone="cyan"
        description="Browse and search the complete film stock database"
      />

      {error && (
        <div
          className="mb-6 rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-border-muted)',
            color: 'var(--color-text-primary)',
          }}
        >
          {error}
        </div>
      )}

      {isMobile ? (
        <FilmsMobileLayout
          db={db}
          isMobile={isMobile}
          selectedFilm={selectedFilm}
          baseFilm={baseFilm}
          shouldShowDetailSkeleton={shouldShowDetailSkeleton}
          onSelectFilm={handleSelectFilm}
          onClosePanel={handleClosePanel}
        />
      ) : (
        <FilmsDesktopLayout
          db={db}
          isMobile={isMobile}
          selectedFilm={selectedFilm}
          baseFilm={baseFilm}
          shouldShowDetailSkeleton={shouldShowDetailSkeleton}
          onSelectFilm={handleSelectFilm}
          onClosePanel={handleClosePanel}
          isFiltersCollapsed={isFiltersCollapsed}
          onCollapsedChange={setIsFiltersCollapsed}
        />
      )}
    </div>
  );
}
