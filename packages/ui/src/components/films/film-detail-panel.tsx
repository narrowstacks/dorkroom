import type { Film } from '@dorkroom/api';
import type { FC } from 'react';
import { DetailPanel } from '../detail-panel/detail-panel';
import { FilmPage, type FilmPageRecipes } from './film-page';

/**
 * Props for the FilmDetailPanel component.
 * Configures panel behavior, content, and responsive display.
 *
 * @public
 */
interface FilmDetailPanelProps {
  /** The film to display, or null when closed */
  film: Film | null;
  /**
   * The base/OEM film if this film is a rebrand, or null. Required so a caller
   * cannot silently drop it: omitted, the rebrand line falls back to a
   * slug-derived title (#329).
   */
  baseFilm: Film | null;
  /** The film's recipes, as the film page shows them. */
  recipes: FilmPageRecipes;
  /** Other films at the same ISO, already limited. */
  relatedFilms: Film[];
  /** Open another film, from the related films list. */
  onSelectFilm: (film: Film) => void;
  /** Whether the panel is currently visible */
  isOpen: boolean;
  /** Callback function called when the panel should be closed */
  onClose: () => void;
  /** Whether to render in mobile mode (bottom drawer) vs desktop mode (sidebar) */
  isMobile: boolean;
  /** Share a link to this film. When provided, the panel shows a Share button. */
  onShare?: (film: Film) => void;
  /**
   * Called when the desktop sidebar closes with focus inside it, to put focus
   * back on whatever opened it (see `DetailPanel`).
   */
  returnFocus?: () => void;
}

/**
 * Render film details in a responsive panel: desktop sidebar or mobile bottom drawer.
 *
 * Desktop mode displays as a sticky sidebar on the right with slide-in animation.
 * Mobile mode displays as a bottom drawer with drag handle and backdrop overlay.
 *
 * Renders nothing during server-side rendering or when `isOpen` is false or `film` is null.
 *
 * @param film - The film object to display details for
 * @param baseFilm - The base film a rebrand repackages, or null
 * @param recipes - The film's recipes, or why they are not shown
 * @param relatedFilms - Other films at the same ISO
 * @param onSelectFilm - Opens a related film
 * @param isOpen - Whether the panel is visible
 * @param onClose - Callback invoked to request closing the panel
 * @param isMobile - If true, renders as mobile bottom drawer; if false, renders as desktop sidebar
 * @param onShare - Shares a link to the film; omitted, no Share button renders
 * @returns The panel element, or null when closed or in SSR
 *
 * @public
 */
export const FilmDetailPanel: FC<FilmDetailPanelProps> = ({
  film,
  baseFilm,
  recipes,
  relatedFilms,
  onSelectFilm,
  isOpen,
  onClose,
  isMobile,
  onShare,
  returnFocus,
}) => {
  if (!film) {
    return null;
  }

  const pageProps = {
    film,
    baseFilm,
    recipes,
    relatedFilms,
    onSelectFilm,
    onShare,
  };
  const ariaLabel = `${film.brand} ${film.name} details`;

  return (
    <DetailPanel
      isOpen={isOpen}
      onClose={onClose}
      returnFocus={returnFocus}
      isMobile={isMobile}
      ariaLabel={ariaLabel}
      expandedContent={<FilmPage {...pageProps} layout="wide" />}
    >
      <FilmPage {...pageProps} layout="narrow" />
    </DetailPanel>
  );
};
