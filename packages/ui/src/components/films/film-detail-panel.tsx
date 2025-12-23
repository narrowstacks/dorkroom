import type { Film } from '@dorkroom/api';
import {
  ExternalLink,
  GripVertical,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag } from '../ui/tag';
import { FilmImage } from './film-image';

/** Props for the reusable CloseButton component */
interface CloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

/** Reusable close button with hover styling */
const CloseButton: FC<CloseButtonProps> = ({
  onClick,
  ariaLabel = 'Close panel',
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full p-2 transition focus-visible:outline-none focus-visible:ring-2"
    style={
      {
        color: 'var(--color-text-muted)',
        '--tw-ring-color': 'var(--color-border-primary)',
      } as React.CSSProperties
    }
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'var(--color-border-muted)';
      e.currentTarget.style.color = 'var(--color-text-primary)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = 'var(--color-text-muted)';
    }}
    aria-label={ariaLabel}
  >
    <X className="h-4 w-4" />
  </button>
);

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset expanded state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  // Body scroll lock when panel is open (mobile or expanded)
  useEffect(() => {
    if (!isOpen || (!isMobile && !isExpanded)) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isMobile, isExpanded]);

  // Handle escape key - collapse modal first, then close panel
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isExpanded, onClose]);

  // Mobile drag handlers
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    setDragStartY(clientY);
    setDragOffset(0);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;

    const offset = Math.max(0, clientY - dragStartY);
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Close if dragged down more than 100px
    if (dragOffset > 100) {
      onClose();
    }

    setDragOffset(0);
  };

  if (typeof document === 'undefined' || !isOpen || !film) {
    return null;
  }

  const developmentRecipesUrl = `/development?film=${film.slug}`;

  // Expand button component (reused in mobile and desktop)
  const ExpandButton = ({ className = '' }: { className?: string }) => (
    <button
      type="button"
      onClick={() => setIsExpanded(!isExpanded)}
      className={`rounded-full p-2 transition focus-visible:outline-none focus-visible:ring-2 ${className}`}
      style={
        {
          color: 'var(--color-text-muted)',
          '--tw-ring-color': 'var(--color-border-primary)',
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-border-muted)';
        e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-muted)';
      }}
      aria-label={isExpanded ? 'Collapse to panel' : 'Expand to full screen'}
    >
      {isExpanded ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </button>
  );

  // Collapse modal back to panel view
  const handleCollapseModal = () => setIsExpanded(false);

  // Expanded full-screen modal view
  if (isExpanded) {
    return createPortal(
      // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via useEffect hook
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
        style={{
          backgroundColor: 'var(--color-visualization-overlay)',
          height: '100dvh',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${film.brand} ${film.name} details`}
        onClick={handleCollapseModal}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: modal content stops propagation */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled by parent */}
        <div
          className="relative w-full max-w-4xl rounded-2xl border shadow-xl animate-scale-fade-in"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            maxHeight: 'calc(100dvh - 4rem)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with buttons */}
          <div className="absolute right-4 top-4 flex items-center gap-1 z-10">
            <ExpandButton />
            <CloseButton
              onClick={handleCollapseModal}
              ariaLabel="Collapse to panel"
            />
          </div>

          {/* Expanded content - two column layout on larger screens */}
          <div
            className="overflow-y-auto p-6 md:p-8"
            style={{ maxHeight: 'calc(100dvh - 4rem)' }}
          >
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
                {film.manufacturerNotes &&
                  film.manufacturerNotes.length > 0 && (
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
                    e.currentTarget.style.backgroundColor =
                      'var(--color-border-muted)';
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Development Recipes
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Mobile bottom drawer
  if (isMobile) {
    return createPortal(
      // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via useEffect hook
      <div
        className="fixed inset-0 z-[100] flex items-end"
        style={{
          backgroundColor: 'var(--color-visualization-overlay)',
          height: '100dvh',
        }}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: panel content stops propagation to prevent closing when clicking inside */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled by parent dialog */}
        <div
          ref={panelRef}
          className="relative w-full rounded-t-3xl border border-b-0 shadow-xl transition-transform duration-300 ease-out"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            maxHeight: '80vh',
            transform: `translateY(${dragOffset}px)`,
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => {
            if (isDragging) {
              handleDragMove(e.clientY);
            }
          }}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <GripVertical
              className="h-5 w-5"
              style={{ color: 'var(--color-text-muted)' }}
            />
          </div>

          {/* Close button */}
          <div className="absolute right-4 top-3">
            <CloseButton onClick={onClose} />
          </div>

          {/* Content */}
          <div
            className="overflow-y-auto px-6 pb-6"
            style={{ maxHeight: 'calc(80vh - 3rem)' }}
          >
            <FilmDetailContent
              film={film}
              developmentRecipesUrl={developmentRecipesUrl}
            />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop sidebar
  return (
    <section
      className="sticky top-4 w-[360px] flex-shrink-0 rounded-2xl border shadow-xl transition-transform duration-300 ease-out animate-slide-fade-right"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        maxHeight: 'calc(100vh - 2rem)',
      }}
      aria-label="Film details"
    >
      {/* Action buttons */}
      <div className="absolute right-4 top-4 flex items-center gap-1 z-10">
        <ExpandButton />
        <CloseButton onClick={onClose} />
      </div>

      {/* Content */}
      <div
        className="overflow-y-auto p-6"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <FilmDetailContent
          film={film}
          developmentRecipesUrl={developmentRecipesUrl}
        />
      </div>
    </section>
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
