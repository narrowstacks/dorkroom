/**
 * MDX Components - Available for use in .mdx files
 * These components can be used directly in MDX content
 */

import { ReactNode } from 'react';
import { FilmCard, DeveloperCard, RecipeTable } from '@dorkroom/ui';
import { useInfobaseData } from '../contexts/infobase-context';
import { Link } from 'react-router-dom';

interface FilmCardWrapperProps {
  filmSlug: string;
}

export function FilmCardWrapper({ filmSlug }: FilmCardWrapperProps) {
  const { films, isLoading, error } = useInfobaseData();

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

  const film = films.find((f) => f.slug === filmSlug || f.uuid === filmSlug);

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
  const { developers, isLoading, error } = useInfobaseData();

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

  const developer = developers.find(
    (d) => d.slug === developerSlug || d.uuid === developerSlug
  );

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
  const { combinations, films, developers, isLoading, error } =
    useInfobaseData();

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
  const { films } = useInfobaseData();
  const film = filmSlug
    ? films.find((f) => f.slug === filmSlug || f.uuid === filmSlug)
    : null;

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
