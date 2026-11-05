import type { Film } from '@dorkroom/api';
import {
  buildFilmSlugIndex,
  type FilmSort,
  getBaseFilm,
  getRelatedFilms,
  SHARED_LINK_MARKER,
  useFilmDatabase,
  useFilmRecipes,
} from '@dorkroom/logic';
import {
  ErrorFallback,
  getRouteAccent,
  getRouteIcon,
  isEInkDevice,
  useIsMobile,
} from '@dorkroom/ui';
import { CalculatorPageHeader } from '@dorkroom/ui/calculator';
import {
  useLocation,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import type { FilmsSearchParams } from '../../../routes/search-schemas';
import { trackEvent } from '../../lib/analytics/tracked-events';
import { useSearchDeadEndAnalytics } from '../../lib/analytics/use-search-analytics';
import { useShareOpened } from '../../lib/analytics/use-share-analytics';
import { FilmsPageBody } from './films-page-body';
import { useFilmPageRecipes } from './use-film-page-recipes';
import {
  buildFilmFilterSearch,
  serializeFilmFilters,
  useDebouncedUrlWrite,
  useUrlFilterSync,
} from './use-url-filter-sync';

declare module '@tanstack/react-router' {
  interface HistoryState {
    /**
     * Film entries pushed above the list entry (or the deep link) in this
     * session of browsing films. Lets the phone's Back to films step over
     * all of them in one go.
     */
    filmDepth?: number;
    /**
     * The filters the list entry under the films was left with, serialized.
     * Closing goes back to that entry only while the live filters still match.
     */
    filmBaseFilters?: string;
  }
}

/**
 * Recipes come from the combinations list, which e-ink devices do not load
 * (#636); they keep the plain link to /development.
 */
const recipesEnabled = !isEInkDevice();

export default function FilmsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/films' });

  const router = useRouter();
  // How many film entries sit above the list entry. 0 on a deep link, and
  // stays 0 when a film is picked from one: the deep link's own entry is a
  // film, so Back to films must not step onto it.
  const filmDepth = useLocation({ select: (l) => l.state.filmDepth ?? 0 });
  const filmBaseFilters = useLocation({
    select: (l) => l.state.filmBaseFilters,
  });

  // Get the film slug from URL params (stable reference). The URL owns the
  // selected film, so Back, Forward and links all drive the page through it.
  const urlFilmSlug = searchParams.film;

  const recipeData = useFilmRecipes({
    enabled: recipesEnabled,
    detailsEnabled: Boolean(urlFilmSlug),
  });
  const db = useFilmDatabase({
    // A failed combinations request means no counts, so a recipes sort does not
    // report as active while every film shows zero recipes.
    recipeCounts:
      recipesEnabled && !recipeData.error ? recipeData.recipeCounts : undefined,
  });
  const {
    films,
    filteredFilms,
    isLoading,
    error,
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter,
  } = db;

  const [resultCountAnnouncement, setResultCountAnnouncement] =
    useState<string>('');

  // Find the film matching the URL slug from ALL films (not filtered)
  // This ensures we can find the film even if filters would hide it
  const urlFilm = useMemo(() => {
    if (!urlFilmSlug) return null;
    return films.find((f) => f.slug === urlFilmSlug) ?? null;
    // eslint-disable-next-line react-doctor/exhaustive-deps -- react-doctor reports "stale searchParams.film" via alias tracing through urlFilmSlug, but urlFilmSlug IS searchParams.film re-derived every render (line 189, not memoized); adding searchParams.film directly is flagged as a redundant dep by react-hooks/exhaustive-deps
  }, [films, urlFilmSlug]);

  useUrlFilterSync(searchParams, db);

  // A film's Share link carries `source=share`: counted once per arrival,
  // then stripped straight away. The strip is its own effect, keyed on the
  // marker alone, because the debounced sync below only reruns when the film
  // or a filter changes, and a marked link to the film already open changes
  // neither. Stripping also ends the arrival (`null`), so the same link
  // opened again later counts again.
  const sharedArrival = searchParams.source === SHARED_LINK_MARKER.value;
  useShareOpened('film', sharedArrival ? (urlFilmSlug ?? '') : null);
  useEffect(() => {
    if (!sharedArrival) return;
    void navigate({
      to: '/films',
      search: (prev: FilmsSearchParams) => ({ ...prev, source: undefined }),
      state: true,
      replace: true,
      resetScroll: false,
    });
  }, [sharedArrival, navigate]);

  // A slug that matches no film is dropped from the URL (a replace, so no
  // history entry) once the catalog has loaded. A failed request says nothing
  // about whether the slug exists, so it keeps the slug and a later successful
  // refetch can still open it.
  useEffect(() => {
    if (isLoading || error || !urlFilmSlug || urlFilm) return;
    void navigate({
      to: '/films',
      search: (prev: FilmsSearchParams) => ({ ...prev, film: undefined }),
      state: true,
      replace: true,
      resetScroll: false,
    });
  }, [isLoading, error, urlFilmSlug, urlFilm, navigate]);

  useDebouncedUrlWrite({
    db,
    urlFilters: serializeFilmFilters(searchParams),
    navigate,
  });

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
    () => (urlFilm && getBaseFilm(urlFilm, filmSlugIndex)) ?? null,
    [urlFilm, filmSlugIndex]
  );

  const filmPageRecipes = useFilmPageRecipes(
    urlFilm,
    recipesEnabled,
    recipeData
  );

  const relatedFilms = useMemo(
    () => (urlFilm ? getRelatedFilms(urlFilm, films) : []),
    [urlFilm, films]
  );

  const activeFilterCount = [
    colorTypeFilter,
    isoSpeedFilter,
    brandFilter,
    discontinuedFilter !== 'all' ? discontinuedFilter : '',
  ].filter(Boolean).length;

  useSearchDeadEndAnalytics({
    tool: 'films',
    query: db.debouncedSearchQuery,
    resultCount: filteredFilms.length,
    activeFilterCount,
    isLoading,
  });

  // Only the setters the UI calls are wrapped. The URL-sync effects above use
  // the destructured setters, so restoring a bookmarked filter does not read as
  // someone reaching for the filter.
  const trackedDb = useMemo(
    () => ({
      ...db,
      setColorTypeFilter: (value: string) => {
        if (value)
          trackEvent('filter_applied', { tool: 'films', filter: 'color' });
        db.setColorTypeFilter(value);
      },
      setIsoSpeedFilter: (value: string) => {
        if (value)
          trackEvent('filter_applied', { tool: 'films', filter: 'iso' });
        db.setIsoSpeedFilter(value);
      },
      setBrandFilter: (value: string) => {
        if (value)
          trackEvent('filter_applied', { tool: 'films', filter: 'brand' });
        db.setBrandFilter(value);
      },
      setDiscontinuedFilter: (value: 'all' | 'active' | 'discontinued') => {
        if (value !== 'all')
          trackEvent('filter_applied', { tool: 'films', filter: 'status' });
        db.setDiscontinuedFilter(value);
      },
      // Every change counts, the 'name' default included: it is a real choice.
      setSort: (value: FilmSort) => {
        trackEvent('filter_applied', { tool: 'films', filter: 'sort' });
        db.setSort(value);
      },
    }),
    [db]
  );

  // A push, so Back returns to the previous film or the list. The list entry
  // behind the first film is first brought up to the live filters (a replace),
  // so a filter typed just before opening is not lost on Back.
  const handleSelectFilm = async (film: Film) => {
    if (film.slug === urlFilmSlug) return;
    trackEvent('detail_opened', { type: 'film' });
    const live = buildFilmFilterSearch(db);
    const fromList = !urlFilmSlug;
    if (
      fromList &&
      serializeFilmFilters(live) !== serializeFilmFilters(searchParams)
    ) {
      await navigate({
        to: '/films',
        search: live,
        replace: true,
        state: true,
        resetScroll: false,
      });
    }
    // A deep link's own entry is a film, so it stays at depth 0.
    const fromDeepLink = filmDepth === 0 && !fromList;
    await navigate({
      to: '/films',
      search: { ...live, film: film.slug },
      state: {
        filmDepth: fromDeepLink ? 0 : filmDepth + 1,
        // Set when leaving a list entry, then carried unchanged.
        filmBaseFilters: fromList
          ? serializeFilmFilters(live)
          : filmBaseFilters,
      },
      resetScroll: false,
    });
  };

  // Back to the list entry under the films, in one step at any width, while
  // the live filters still match what that entry was left with. If a filter
  // changed while the film was open (the toolbar stays usable on wide layouts),
  // that entry is stale: push the current filters instead. A deep link
  // (depth 0) replaces its entry so the close does not leave a film to return to.
  const handleClosePanel = () => {
    const live = buildFilmFilterSearch(db);
    if (filmDepth > 0 && filmBaseFilters === serializeFilmFilters(live)) {
      router.history.go(-filmDepth);
      return;
    }
    void navigate({
      to: '/films',
      search: { ...live, film: undefined },
      replace: filmDepth === 0,
      resetScroll: false,
    });
  };

  // Skeleton in the film's place while a deep-linked film waits for the catalog.
  const shouldShowDetailSkeleton = Boolean(
    urlFilmSlug && !urlFilm && isLoading
  );

  const filmOpen = Boolean(urlFilm) || shouldShowDetailSkeleton;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Skip link for accessibility */}
      {/* A phone with a film open has no results to skip to. */}
      {!(isMobile && filmOpen) && (
        <a
          href="#film-results"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-focus-ring)] transition"
          style={{
            backgroundColor: 'var(--color-brand)',
            color: 'white',
          }}
        >
          Skip to film results
        </a>
      )}

      {/* ARIA live region for result count announcements */}
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {resultCountAnnouncement}
      </output>

      <CalculatorPageHeader
        title="Film Database"
        icon={getRouteIcon('/films')}
        accentTone={getRouteAccent('/films')}
        description="Browse and search the complete film stock database"
      />

      {/* With nothing loaded, an empty result list would blame the filters, so
          replace it outright. A failed background refetch keeps the cached
          catalog and only gets a notice. */}
      {error && films.length === 0 ? (
        <ErrorFallback
          message="We couldn't load the film database. Check your connection and try again."
          reloadLabel="Retry"
          onReload={db.retry}
        />
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-2xl border border-secondary bg-border-muted px-4 py-3 text-sm text-primary">
              Couldn't refresh the film database, so these results may be out of
              date.
            </div>
          )}

          <FilmsPageBody
            db={trackedDb}
            isMobile={isMobile}
            selectedFilm={urlFilm}
            baseFilm={baseFilm}
            recipes={filmPageRecipes}
            relatedFilms={relatedFilms}
            filmOpen={filmOpen}
            getRecipeCount={recipeData.getRecipeCount}
            onSelectFilm={handleSelectFilm}
            onClosePanel={handleClosePanel}
          />
        </>
      )}
    </div>
  );
}
