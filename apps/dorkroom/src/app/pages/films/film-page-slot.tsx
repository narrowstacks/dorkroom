import type { Film } from '@dorkroom/api';
import { TemperatureProvider } from '@dorkroom/ui';
import {
  FilmPage,
  type FilmPageRecipes,
  FilmPageSkeleton,
} from '@dorkroom/ui/films';

interface FilmPageSlotProps {
  layout: 'narrow' | 'wide';
  /** Null while a deep-linked film is still being found: a skeleton shows. */
  film: Film | null;
  baseFilm: Film | null;
  recipes: FilmPageRecipes | null;
  relatedFilms: Film[];
  focusHeadingOnMount: boolean;
  onSelectFilm: (film: Film) => void;
  onClose: () => void;
  onShare: (film: Film) => void;
}

/** The open film's page, or its skeleton, for either layout. */
export function FilmPageSlot({
  layout,
  film,
  baseFilm,
  recipes,
  relatedFilms,
  focusHeadingOnMount,
  onSelectFilm,
  onClose,
  onShare,
}: FilmPageSlotProps) {
  if (!film) return <FilmPageSkeleton layout={layout} />;
  return (
    <TemperatureProvider>
      <FilmPage
        layout={layout}
        film={film}
        baseFilm={baseFilm}
        recipes={recipes ?? { status: 'unavailable' }}
        relatedFilms={relatedFilms}
        focusHeadingOnMount={focusHeadingOnMount}
        onSelectFilm={onSelectFilm}
        onClose={onClose}
        onShare={onShare}
      />
    </TemperatureProvider>
  );
}
