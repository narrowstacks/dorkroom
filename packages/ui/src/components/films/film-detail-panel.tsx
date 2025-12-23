import type { Film } from '@dorkroom/api';
import { ExternalLink } from 'lucide-react';
import type { FC } from 'react';
import { DetailPanel } from '../detail-panel';
import { Tag } from '../ui/tag';
import { FilmImage } from './film-image';

/**
 * Props for the FilmDetailPanel component.
 * Configures panel behavior, content, and responsive display.
 *
 * @public
 */
interface FilmDetailPanelProps {
  /** The film to display, or null when closed */
  film: Film | null;
  /** Whether the panel is currently visible */
  isOpen: boolean;
  /** Callback function called when the panel should be closed */
  onClose: () => void;
  /** Whether to render in mobile mode (bottom drawer) vs desktop mode (sidebar) */
  isMobile: boolean;
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
 * @param isOpen - Whether the panel is visible
 * @param onClose - Callback invoked to request closing the panel
 * @param isMobile - If true, renders as mobile bottom drawer; if false, renders as desktop sidebar
 * @returns The panel element, or null when closed or in SSR
 *
 * @public
 */
export const FilmDetailPanel: FC<FilmDetailPanelProps> = ({
  film,
  isOpen,
  onClose,
  isMobile,
}) => {
  if (!film) {
    return null;
  }

  const developmentRecipesUrl = `/development?film=${film.slug}`;

  const ariaLabel = `${film.brand} ${film.name} details`;

  // Panel content (sidebar/drawer view)
  const panelContent = (
    <FilmDetailContent
      film={film}
      developmentRecipesUrl={developmentRecipesUrl}
    />
  );

  // Expanded content (two-column layout)
  const expandedContent = (
    <div className="grid gap-8 md:grid-cols-[auto_1fr]">
      {/* Left column: Image */}
      <div className="flex justify-center md:justify-start">
        <FilmImage
          src={film.staticImageUrl}
          alt={`${film.brand} ${film.name}`}
          size="lg"
          className="!w-48 !h-48 md:!w-56 md:!h-56"
        />
      </div>

      {/* Right column: Details */}
      <div className="space-y-6">
        {/* Title and badges */}
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {film.brand} {film.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Tag>{film.colorType}</Tag>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border"
              style={{
                backgroundColor: 'var(--color-surface-muted)',
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border-secondary)',
              }}
            >
              ISO {film.isoSpeed}
            </span>
            {film.discontinued && (
              <Tag variant="discontinued" size="xs">
                Discontinued
              </Tag>
            )}
          </div>
        </div>

        {/* Description */}
        {film.description && (
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Description
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {film.description}
            </p>
          </div>
        )}

        {/* Two column grid for smaller details */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Grain structure */}
          {film.grainStructure && (
            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Grain Structure
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {film.grainStructure}
              </p>
            </div>
          )}

          {/* Reciprocity failure */}
          {film.reciprocityFailure && (
            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Reciprocity Failure
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {film.reciprocityFailure}
              </p>
            </div>
          )}

          {/* Date added */}
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Date Added
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {new Date(film.dateAdded).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Manufacturer notes - full width */}
        {film.manufacturerNotes && film.manufacturerNotes.length > 0 && (
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Manufacturer Notes
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {film.manufacturerNotes.map((note, index) => (
                <li
                  key={index}
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Development recipes link */}
        <a
          href={developmentRecipesUrl}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
          style={{
            backgroundColor: 'var(--color-border-muted)',
            color: 'var(--color-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              'var(--color-border-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-border-muted)';
          }}
        >
          <ExternalLink className="h-4 w-4" />
          View Development Recipes
        </a>
      </div>
    </div>
  );

  return (
    <DetailPanel
      isOpen={isOpen}
      onClose={onClose}
      isMobile={isMobile}
      ariaLabel={ariaLabel}
      expandedContent={expandedContent}
    >
      {panelContent}
    </DetailPanel>
  );
};

/** Props for the internal FilmDetailContent component */
interface FilmDetailContentProps {
  film: Film;
  developmentRecipesUrl: string;
}

/**
 * Internal component for rendering film detail content.
 * Shared between mobile and desktop layouts.
 */
const FilmDetailContent: FC<FilmDetailContentProps> = ({
  film,
  developmentRecipesUrl,
}) => {
  return (
    <div className="space-y-6">
      {/* Film image */}
      <div className="flex justify-center">
        <FilmImage
          src={film.staticImageUrl}
          alt={`${film.brand} ${film.name}`}
          size="lg"
          className="!w-32 !h-32"
        />
      </div>

      {/* Title */}
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {film.brand} {film.name}
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {film.brand}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{film.colorType}</Tag>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border"
          style={{
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border-secondary)',
          }}
        >
          ISO {film.isoSpeed}
        </span>
        {film.discontinued && (
          <Tag variant="discontinued" size="xs">
            Discontinued
          </Tag>
        )}
      </div>

      {/* Description */}
      {film.description && (
        <div>
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Description
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {film.description}
          </p>
        </div>
      )}

      {/* Grain structure */}
      {film.grainStructure && (
        <div>
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Grain Structure
          </h3>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {film.grainStructure}
          </p>
        </div>
      )}

      {/* Manufacturer notes */}
      {film.manufacturerNotes && film.manufacturerNotes.length > 0 && (
        <div>
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Manufacturer Notes
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {film.manufacturerNotes.map((note, index) => (
              <li
                key={index}
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reciprocity failure */}
      {film.reciprocityFailure && (
        <div>
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Reciprocity Failure
          </h3>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {film.reciprocityFailure}
          </p>
        </div>
      )}

      {/* Date added */}
      <div>
        <h3
          className="text-sm font-semibold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Date Added
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {new Date(film.dateAdded).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Development recipes link */}
      <a
        href={developmentRecipesUrl}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: 'var(--color-border-muted)',
          color: 'var(--color-text-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-border-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-border-muted)';
        }}
      >
        <ExternalLink className="h-4 w-4" />
        View Development Recipes
      </a>
    </div>
  );
};
