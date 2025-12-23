import type { Film } from '@dorkroom/api';
import { useFilmDatabase } from '@dorkroom/logic';
import {
  CalculatorPageHeader,
  FilmDetailPanel,
  FilmDetailPanelSkeleton,
  FilmFiltersMobile,
  FilmFiltersPanel,
  FilmResultsVirtualized,
  useIsMobile,
  VirtualizedErrorBoundary,
} from '@dorkroom/ui';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function FilmsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/films' });

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
    brandOptions,
    isoOptions,
    clearFilters,
    hasActiveFilters,
  } = useFilmDatabase();

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

  // Sync URL params to filter state when URL changes (back/forward navigation, bookmarks)
  // Only runs when URL params change - does NOT include state values in deps to avoid
  // clearing user input before the debounced URL sync fires
  // biome-ignore lint/correctness/useExhaustiveDependencies: setters are stable refs, state values intentionally excluded
  useEffect(() => {
    // Only sync FROM URL when URL has a value and differs from current state
    // We don't clear state when URL is undefined - the debounced state→URL sync handles that
    if (
      searchParams.search !== undefined &&
      searchParams.search !== searchQuery
    ) {
      setSearchQuery(searchParams.search);
    }

    if (
      searchParams.color !== undefined &&
      searchParams.color !== colorTypeFilter
    ) {
      setColorTypeFilter(searchParams.color);
    }

    if (searchParams.iso !== undefined && searchParams.iso !== isoSpeedFilter) {
      setIsoSpeedFilter(searchParams.iso);
    }

    if (
      searchParams.brand !== undefined &&
      searchParams.brand !== brandFilter
    ) {
      setBrandFilter(searchParams.brand);
    }

    if (
      searchParams.status !== undefined &&
      searchParams.status !== discontinuedFilter
    ) {
      setDiscontinuedFilter(searchParams.status);
    }
  }, [
    searchParams.search,
    searchParams.color,
    searchParams.iso,
    searchParams.brand,
    searchParams.status,
  ]);

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
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {resultCountAnnouncement}
      </div>

      <CalculatorPageHeader
        title="Film Database"
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
        <div className="space-y-4">
          <FilmFiltersMobile
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            colorTypeFilter={colorTypeFilter}
            onColorTypeChange={setColorTypeFilter}
            isoSpeedFilter={isoSpeedFilter}
            onIsoSpeedChange={setIsoSpeedFilter}
            brandFilter={brandFilter}
            onBrandChange={setBrandFilter}
            discontinuedFilter={discontinuedFilter}
            onDiscontinuedChange={setDiscontinuedFilter}
            brandOptions={brandOptions}
            isoOptions={isoOptions}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            resultCount={filteredFilms.length}
          />

          <VirtualizedErrorBoundary>
            <FilmResultsVirtualized
              films={filteredFilms}
              selectedFilmId={selectedFilm?.uuid ?? null}
              onSelectFilm={handleSelectFilm}
              isMobile={isMobile}
              isLoading={isLoading}
              isDetailOpen={!!selectedFilm || shouldShowDetailSkeleton}
              isFiltersCollapsed={false}
            />
          </VirtualizedErrorBoundary>

          {shouldShowDetailSkeleton ? (
            <FilmDetailPanelSkeleton isMobile={isMobile} />
          ) : (
            <FilmDetailPanel
              film={selectedFilm}
              isOpen={!!selectedFilm}
              onClose={handleClosePanel}
              isMobile={isMobile}
            />
          )}
        </div>
      ) : (
        <div className="mt-6 flex gap-6">
          <aside className="flex-shrink-0 transition-all duration-300">
            <FilmFiltersPanel
              onCollapsedChange={setIsFiltersCollapsed}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              colorTypeFilter={colorTypeFilter}
              onColorTypeChange={setColorTypeFilter}
              isoSpeedFilter={isoSpeedFilter}
              onIsoSpeedChange={setIsoSpeedFilter}
              brandFilter={brandFilter}
              onBrandChange={setBrandFilter}
              discontinuedFilter={discontinuedFilter}
              onDiscontinuedChange={setDiscontinuedFilter}
              brandOptions={brandOptions}
              isoOptions={isoOptions}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </aside>

          <main id="film-results" className="flex-1 min-w-0">
            <VirtualizedErrorBoundary>
              <FilmResultsVirtualized
                films={filteredFilms}
                selectedFilmId={selectedFilm?.uuid ?? null}
                onSelectFilm={handleSelectFilm}
                isMobile={isMobile}
                isLoading={isLoading}
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
                onClose={handleClosePanel}
                isMobile={isMobile}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
