/**
 * MDX Components - Available for use in .mdx files
 * These components can be used directly in MDX content
 */

import { ReactNode, useState, useEffect } from 'react';
import { FilmCard, DeveloperCard, RecipeTable } from '@dorkroom/ui';
import { useInfobaseClient } from '../contexts/infobase-context';
import { Link } from 'react-router-dom';
import { Film, Developer, Combination } from '@dorkroom/api';

interface FilmCardWrapperProps {
  filmSlug: string;
}

export function FilmCardWrapper({ filmSlug }: FilmCardWrapperProps) {
  const client = useInfobaseClient();
  const [film, setFilm] = useState<Film | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the specific film by slug
  // This useEffect is necessary to trigger data fetching when the slug changes
  useEffect(() => {
    let cancelled = false;

    async function fetchFilm() {
      try {
        setIsLoading(true);
        setError(null);

        const fetchedFilm = await client.fetchFilmBySlug(filmSlug);

        if (!cancelled) {
          setFilm(fetchedFilm);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load film';
          setError(errorMessage);
          console.error('[FilmCardWrapper] Error fetching film:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchFilm();

    return () => {
      cancelled = true;
    };
  }, [client, filmSlug]);

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Loading film data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          Error loading film data: {error}
        </p>
      </div>
    );
  }

  if (!film) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          Film not found: {filmSlug}
        </p>
      </div>
    );
  }

  return <FilmCard film={film} />;
}

interface DeveloperCardWrapperProps {
  developerSlug: string;
}

export function DeveloperCardWrapper({
  developerSlug,
}: DeveloperCardWrapperProps) {
  const client = useInfobaseClient();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the specific developer by slug
  // This useEffect is necessary to trigger data fetching when the slug changes
  useEffect(() => {
    let cancelled = false;

    async function fetchDeveloper() {
      try {
        setIsLoading(true);
        setError(null);

        const fetchedDeveloper = await client.fetchDeveloperBySlug(
          developerSlug
        );

        if (!cancelled) {
          setDeveloper(fetchedDeveloper);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load developer';
          setError(errorMessage);
          console.error(
            '[DeveloperCardWrapper] Error fetching developer:',
            err
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDeveloper();

    return () => {
      cancelled = true;
    };
  }, [client, developerSlug]);

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Loading developer data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          Error loading developer data: {error}
        </p>
      </div>
    );
  }

  if (!developer) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          Developer not found: {developerSlug}
        </p>
      </div>
    );
  }

  return <DeveloperCard developer={developer} />;
}

interface RecipeTableWrapperProps {
  film?: string;
  developer?: string;
  maxRows?: number;
}

export function RecipeTableWrapper({
  film,
  developer,
  maxRows,
}: RecipeTableWrapperProps) {
  const client = useInfobaseClient();
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch combinations with optional filters
  // This useEffect is necessary to trigger data fetching when filters change
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch combinations with filters
        const [combinationsRes, filmsRes, developersRes] = await Promise.all([
          client.fetchCombinationsOnDemand({
            film,
            developer,
            limit: maxRows,
          }),
          client.fetchFilmsOnDemand(),
          client.fetchDevelopersOnDemand(),
        ]);

        if (!cancelled) {
          setCombinations(combinationsRes.data);
          setFilms(filmsRes.data);
          setDevelopers(developersRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load recipe data';
          setError(errorMessage);
          console.error('[RecipeTableWrapper] Error fetching data:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [client, film, developer, maxRows]);

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Loading recipe data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-tertiary)' }}>
          Error loading recipe data: {error}
        </p>
      </div>
    );
  }

  return (
    <RecipeTable
      combinations={combinations}
      films={films}
      developers={developers}
      filmSlug={film}
      developerSlug={developer}
      maxRows={maxRows}
    />
  );
}

interface LinkButtonProps {
  to: string;
  children: ReactNode;
}

export function LinkButton({ to, children }: LinkButtonProps) {
  const isExternal =
    to.startsWith('http://') ||
    to.startsWith('https://') ||
    to.startsWith('//');

  if (isExternal) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:brightness-105"
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background)',
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:brightness-105"
      style={{
        backgroundColor: 'var(--color-text-primary)',
        color: 'var(--color-background)',
      }}
    >
      {children}
    </Link>
  );
}

interface ImageGalleryProps {
  filmSlug?: string;
}

export function ImageGallery({ filmSlug }: ImageGalleryProps) {
  const client = useInfobaseClient();
  const [film, setFilm] = useState<Film | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch film data to get image URL
  // This useEffect is necessary to trigger data fetching when the slug changes
  useEffect(() => {
    if (!filmSlug) {
      setIsLoading(false);
      return undefined;
    }

    const slug = filmSlug; // Capture value for async function
    let cancelled = false;

    async function fetchFilm() {
      try {
        setIsLoading(true);

        const fetchedFilm = await client.fetchFilmBySlug(slug);

        if (!cancelled) {
          setFilm(fetchedFilm);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ImageGallery] Error fetching film:', err);
          setFilm(null);
          setIsLoading(false);
        }
      }
    }

    fetchFilm();

    return () => {
      cancelled = true;
    };
  }, [client, filmSlug]);

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!film || !film.staticImageUrl) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          No images available
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <img
        src={film.staticImageUrl}
        alt={`${film.brand} ${film.name}`}
        className="rounded-lg"
        style={{
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      />
    </div>
  );
}

/**
 * MDX Components mapping
 * These are available as standard JSX components in MDX files
 */
export const mdxComponents = {
  // API Data Components
  FilmCard: FilmCardWrapper,
  DeveloperCard: DeveloperCardWrapper,
  RecipeTable: RecipeTableWrapper,
  ImageGallery,
  LinkButton,
};
