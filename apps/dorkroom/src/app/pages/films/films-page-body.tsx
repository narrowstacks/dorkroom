import type { Film } from '@dorkroom/api';
import type { UseFilmDatabaseReturn } from '@dorkroom/logic';
import {
  isEInkDevice,
  useBreakpoint,
  useEscapeKey,
  useTheme,
  type VirtualListFocusHandle,
} from '@dorkroom/ui';
import {
  FilmImageLoaderContext,
  FilmImageModeContext,
  type FilmPageRecipes,
  FilmToolbar,
} from '@dorkroom/ui/films';
import { useLayoutEffect, useRef, useState } from 'react';
import { vercelFilmImageLoader } from '../../lib/film-image-loader';
import { useShareLink } from '../../lib/use-share-link';
import { FilmPageSlot } from './film-page-slot';
import { FilmsPhoneLayout, PHONE_RESULTS_HEIGHT } from './films-phone-layout';
import { FilmsWideLayout } from './films-wide-layout';
import { wideResultsHeight } from './wide-results-height';

/**
 * Resized thumbnails only in a Vercel build, the one place `/_vercel/image`
 * exists. The dev server and builds served elsewhere (`vite preview`, the
 * Cloudflare static build) load originals directly.
 */
const filmImageLoader = __VERCEL__ ? vercelFilmImageLoader : null;

/**
 * On e-ink devices such as the Kindle Scribe (#636), rows show the film icon
 * instead of a thumbnail: each one costs memory and a slow e-ink refresh. The
 * photo of a film the user opens still loads, to identify the packaging.
 */
const einkDevice = isEInkDevice();

interface FilmsPageBodyProps {
  db: UseFilmDatabaseReturn;
  isMobile: boolean;
  selectedFilm: Film | null;
  baseFilm: Film | null;
  /** The selected film's recipes; null while no film is selected. */
  recipes: FilmPageRecipes | null;
  relatedFilms: Film[];
  /** A film is selected, or a deep-linked one is still being found. */
  filmOpen: boolean;
  getRecipeCount: (film: Film) => number;
  onSelectFilm: (film: Film) => void;
  onClosePanel: () => void;
}

/**
 * Phone: opening a film starts the page at the top. Coming back, the router's
 * scroll restoration puts the list's position back.
 */
function usePhoneScrollToTop(phoneFilmOpen: boolean) {
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (phoneFilmOpen && !wasOpen.current) window.scrollTo(0, 0);
    wasOpen.current = phoneFilmOpen;
  }, [phoneFilmOpen]);
}

/**
 * The films page below its header: a toolbar, then the results table and the
 * open film's page. Wide screens keep the results mounted and narrow them to a
 * side list beside the page; phones swap the rows for the page.
 */
export function FilmsPageBody({
  db,
  isMobile,
  selectedFilm,
  baseFilm,
  recipes,
  relatedFilms,
  filmOpen,
  getRecipeCount,
  onSelectFilm,
  onClosePanel,
}: FilmsPageBodyProps) {
  const { share, manualCopyDialog } = useShareLink('film');
  const isDesktop = useBreakpoint('lg');
  // Packshots render at full brightness, which breaks the red-only darkroom
  // theme, so that theme shows no photos: rows keep the film icon and the
  // film page shows neither a photo nor a tile.
  const { resolvedTheme } = useTheme();
  let filmImageMode: 'none' | 'detail-only' | 'all' = 'all';
  if (resolvedTheme === 'darkroom') filmImageMode = 'none';
  else if (einkDevice) filmImageMode = 'detail-only';

  // Closing the film puts focus back on its row (#604).
  const resultsFocusRef = useRef<VirtualListFocusHandle>(null);
  const rowsScrollRef = useRef(0);
  // The row the open film was picked from, so closing returns to it even after
  // a trip through related films.
  const originRow = useRef<string | null>(null);
  // Only a film opened from closed by the user takes focus; a deep link and a
  // switch in the side list leave it where it is.
  const [focusHeadingFor, setFocusHeadingFor] = useState<string | null>(null);

  usePhoneScrollToTop(isMobile && filmOpen);

  const handleSelectFilm = (film: Film) => {
    setFocusHeadingFor(filmOpen ? null : film.slug);
    if (!filmOpen) originRow.current = film.uuid;
    onSelectFilm(film);
  };

  // Driven by the selection changing, however it changed: the Close button,
  // Escape, or browser Back and Forward. Applied once the list is back (a
  // layout effect rather than flushSync, which react-doctor flags in the app).
  const selectedUuid = selectedFilm?.uuid ?? null;
  const previousUuid = useRef<string | null>(null);
  useLayoutEffect(() => {
    const previous = previousUuid.current;
    previousUuid.current = selectedUuid;
    if (!previous) return;
    if (!selectedUuid) {
      if (!filmOpen) {
        resultsFocusRef.current?.focusItem(originRow.current ?? previous);
        originRow.current = null;
        // Dropped so a Forward to the film does not take focus.
        setFocusHeadingFor(null);
      }
      return;
    }
    // History moved between films. If the control that was focused (a related
    // film button) unmounted, focus fell to the body: put it on the heading.
    // A row in the side list keeps its own focus.
    if (previous !== selectedUuid && document.activeElement === document.body) {
      document.querySelector<HTMLElement>('article[aria-label] h2')?.focus();
    }
  }, [selectedUuid, filmOpen]);

  useEscapeKey(Boolean(selectedFilm), onClosePanel);

  const toolbar = (
    <FilmToolbar
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
      resultCount={db.isLoading ? null : db.filteredFilms.length}
      sort={db.effectiveSort}
      onSortChange={db.setSort}
      recipesSortAvailable={db.recipesSortAvailable}
      showSortSelect={isMobile}
    />
  );

  const resultsProps = {
    films: db.filteredFilms,
    selectedFilmId: selectedFilm?.uuid ?? null,
    onSelectFilm: handleSelectFilm,
    sort: db.effectiveSort,
    onSortChange: db.setSort,
    showRecipes: db.recipesSortAvailable,
    getRecipeCount,
    isLoading: db.isLoading,
    onClearFilters: db.clearFilters,
    hasActiveFilters: db.hasActiveFilters,
    focusHandleRef: resultsFocusRef,
  };

  const page = (
    <FilmPageSlot
      layout={isMobile ? 'narrow' : 'wide'}
      film={selectedFilm}
      baseFilm={baseFilm}
      recipes={recipes}
      relatedFilms={relatedFilms}
      focusHeadingOnMount={
        selectedFilm !== null && selectedFilm.slug === focusHeadingFor
      }
      onSelectFilm={handleSelectFilm}
      onClose={onClosePanel}
      onShare={(film) =>
        share({ film: film.slug }, `${film.brand} ${film.name}`)
      }
    />
  );

  const pageLabel = selectedFilm
    ? `${selectedFilm.brand} ${selectedFilm.name}`
    : 'Loading film';

  const getWideView = () => {
    if (filmOpen) return 'list';
    return isDesktop ? 'table' : 'table-compact';
  };

  return (
    // Resized thumbnails for every FilmImage below (rows and the film page).
    <FilmImageLoaderContext value={filmImageLoader}>
      <FilmImageModeContext value={filmImageMode}>
        <div className="mt-4 space-y-4 md:mt-6">
          {isMobile ? (
            <FilmsPhoneLayout
              toolbar={toolbar}
              filmOpen={filmOpen}
              pageLabel={pageLabel}
              page={page}
              results={{
                ...resultsProps,
                view: 'rows',
                height: PHONE_RESULTS_HEIGHT,
                scrollOffsetRef: rowsScrollRef,
              }}
            />
          ) : (
            <>
              {toolbar}
              <FilmsWideLayout
                isDesktop={isDesktop}
                filmOpen={filmOpen}
                pageLabel={pageLabel}
                page={page}
                results={{
                  ...resultsProps,
                  view: getWideView(),
                  height: wideResultsHeight(isDesktop),
                }}
              />
            </>
          )}
          {manualCopyDialog}
        </div>
      </FilmImageModeContext>
    </FilmImageLoaderContext>
  );
}
