import type { Film } from '@dorkroom/api';
import {
  type FilmRecipe,
  filmSupportsRecipes,
  type RecipeIsoGroup,
} from '@dorkroom/logic';
import { ChevronLeft, ExternalLink, Share2 } from 'lucide-react';
import { type FC, use, useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/skeleton';
import { Tag } from '../ui/tag';
import { FilmImage } from './film-image';
import { FilmImageCredit } from './film-image-credit';
import { FilmImageModeContext } from './film-image-mode-context';
import { FilmPageRecipes } from './film-page-recipes';
import { FilmRebrandInfo } from './film-rebrand-info';

/**
 * What the film page knows about the film's recipes:
 * - `unavailable`: e-ink, or the combinations request failed. The page falls
 *   back to a plain link to /development.
 * - `loading`: the combinations request is in flight.
 * - `ready`: recipes grouped by shooting ISO, `count` in total.
 */
export type FilmPageRecipes =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | {
      status: 'ready';
      groups: Array<RecipeIsoGroup<FilmRecipe>>;
      defaultIso: number | undefined;
      developersReady: boolean;
      count: number;
    };

export interface FilmPageProps {
  film: Film;
  /** The film this one repackages, or null. */
  baseFilm: Film | null;
  recipes: FilmPageRecipes;
  /** Other films at the same ISO, already limited. */
  relatedFilms: Film[];
  onSelectFilm: (film: Film) => void;
  /** Share a link to this film; omitted, no Share button renders. */
  onShare?: (film: Film) => void;
  /**
   * `narrow` stacks the photo above the header (sidebar, drawer); `wide` puts
   * it beside the header. A prop rather than a container query: the legacy
   * build has no container queries.
   */
  layout: 'narrow' | 'wide';
  /** When set, a "Back to films" button renders at the top and calls this. */
  onClose?: () => void;
  /**
   * Focus the heading when the page mounts (#604), for a page opened by a
   * user action. Deep links leave focus alone.
   */
  focusHeadingOnMount?: boolean;
  className?: string;
}

const TYPE_LABELS = new Map([
  ['bw', 'Black & white'],
  ['color', 'Color'],
  ['slide', 'Slide'],
]);

const typeLabel = (colorType: string): string =>
  TYPE_LABELS.get(colorType.toLowerCase()) ?? colorType;

/** Catalog grain values mix `fine` and `Fine`; only the display is normalized. */
const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const sectionHeading = 'text-xl font-semibold text-primary';

/**
 * A film's page: header, stats, rebrand link, recipes, about, manufacturer
 * notes and other films at the same ISO. Presentational: the caller supplies
 * the recipe data, the related films and the handlers.
 *
 * Display rules: recipes appear only where `filmSupportsRecipes(film)`, a
 * black and white film without recipes gets no recipes section, and stats show
 * only values the film has.
 */
export const FilmPage: FC<FilmPageProps> = ({
  film,
  baseFilm,
  recipes,
  relatedFilms,
  onSelectFilm,
  onShare,
  layout,
  onClose,
  focusHeadingOnMount = false,
  className,
}) => {
  const wide = layout === 'wide';
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set by a tap on a related film so focus follows the page it opened; any
  // other change of film (Back, a link) leaves focus alone.
  const pendingFocusRef = useRef(false);
  const focusOnMountRef = useRef(focusHeadingOnMount);
  useEffect(() => {
    if (focusOnMountRef.current) headingRef.current?.focus();
  }, []);
  useEffect(() => {
    if (pendingFocusRef.current) {
      pendingFocusRef.current = false;
      headingRef.current?.focus();
    }
  });
  const photoUrl =
    use(FilmImageModeContext) === 'none' ? null : film.staticImageUrl;
  const supportsRecipes = filmSupportsRecipes(film);
  const readyRecipes =
    supportsRecipes && recipes.status === 'ready' && recipes.count > 0
      ? recipes
      : null;

  const stats: Array<{ label: string; value: string }> = [
    { label: 'ISO', value: String(film.isoSpeed) },
    { label: 'Type', value: typeLabel(film.colorType) },
  ];
  if (film.reciprocityFailure) {
    stats.push({ label: 'Reciprocity', value: film.reciprocityFailure });
  }
  if (readyRecipes) {
    stats.push({ label: 'Recipes', value: String(readyRecipes.count) });
  }
  if (film.grainStructure) {
    stats.push({ label: 'Grain', value: capitalize(film.grainStructure) });
  }

  const notes = film.manufacturerNotes ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to films
        </button>
      )}
      <header
        className={cn(
          'flex gap-5',
          wide ? 'flex-row items-start' : 'flex-col items-center'
        )}
      >
        <div
          className={cn(
            'flex flex-col gap-3',
            wide ? 'items-start' : 'items-center'
          )}
        >
          {/* Eager: already in the viewport the moment the page opens. */}
          <FilmImage
            src={photoUrl}
            alt={`${film.brand} ${film.name}`}
            size="lg"
            loading="eager"
            renderedSize={wide ? 224 : 128}
            className={wide ? '!w-48 !h-48 md:!w-56 md:!h-56' : '!w-32 !h-32'}
          />
          {photoUrl && (
            <FilmImageCredit
              credit={film.imageCredit}
              sourceUrl={film.imageSourceUrl}
              className={wide ? 'max-w-48 md:max-w-56' : undefined}
            />
          )}
        </div>
        <div className={cn('min-w-0 space-y-3', !wide && 'w-full')}>
          <div>
            <p className="text-sm text-tertiary">{film.brand}</p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] md:text-3xl"
            >
              {film.name}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{film.colorType}</Tag>
            {film.discontinued && (
              <Tag variant="discontinued" size="xs">
                Discontinued
              </Tag>
            )}
          </div>
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(film)}
              aria-label="Share this film"
              title="Share this film"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-border-muted px-4 py-1 text-sm font-medium text-secondary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] hoverable-action-btn"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </button>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] px-3 py-2"
          >
            <dt className="text-xs text-tertiary">{label}</dt>
            <dd className="text-sm font-bold text-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <FilmRebrandInfo film={film} baseFilm={baseFilm} />

      {supportsRecipes && recipes.status === 'loading' && (
        <output
          aria-busy="true"
          aria-label="Loading"
          className="space-y-2 rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] p-4"
        >
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </output>
      )}
      {supportsRecipes && recipes.status === 'unavailable' && (
        <a
          href={`/development?film=${film.slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-border-muted px-4 py-2.5 text-sm font-medium text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] hoverable-link-tile"
        >
          <ExternalLink className="size-4" />
          View Development Recipes
        </a>
      )}
      {readyRecipes && (
        <FilmPageRecipes
          key={film.uuid}
          groups={readyRecipes.groups}
          defaultIso={readyRecipes.defaultIso}
          developersReady={readyRecipes.developersReady}
        />
      )}

      {film.description && (
        <section>
          <h3 className={cn(sectionHeading, 'mb-1.5')}>About</h3>
          <p className="text-sm leading-relaxed text-secondary">
            {film.description}
          </p>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h3 className={cn(sectionHeading, 'mb-1.5')}>Manufacturer notes</h3>
          <ul className="list-inside list-disc space-y-1">
            {notes.map((note) => (
              <li key={note} className="text-sm text-secondary">
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedFilms.length > 0 && (
        <section>
          <h3 className={cn(sectionHeading, 'mb-2')}>
            Also ISO {film.isoSpeed}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {relatedFilms.map((related) => (
              <li key={related.uuid}>
                <button
                  type="button"
                  onClick={() => {
                    pendingFocusRef.current = true;
                    onSelectFilm(related);
                  }}
                  className="flex min-h-11 w-full flex-col items-start rounded-xl border border-[color:var(--color-border-secondary)] px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                >
                  <span className="text-xs text-tertiary">{related.brand}</span>
                  <span className="font-medium">{related.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
