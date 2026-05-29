import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react';
import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { setStyles } from '../../lib/dom';

/** Props for the reusable CloseButton component */
interface CloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

/** Reusable close button with hover styling */
export const DetailPanelCloseButton: FC<CloseButtonProps> = ({
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
      setStyles(e.currentTarget, {
        backgroundColor: 'var(--color-border-muted)',
        color: 'var(--color-text-primary)',
      });
    }}
    onMouseLeave={(e) => {
      setStyles(e.currentTarget, {
        backgroundColor: 'transparent',
        color: 'var(--color-text-muted)',
      });
    }}
    aria-label={ariaLabel}
  >
    <X className="size-4" />
  </button>
);

/** Props for the expand/collapse button */
interface ExpandButtonProps {
  isExpanded: boolean;
  onClick: () => void;
  className?: string;
}

/** Reusable expand/collapse button with hover styling */
export const DetailPanelExpandButton: FC<ExpandButtonProps> = ({
  isExpanded,
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full p-2 transition focus-visible:outline-none focus-visible:ring-2 ${className}`}
    style={
      {
        color: 'var(--color-text-muted)',
        '--tw-ring-color': 'var(--color-border-primary)',
      } as React.CSSProperties
    }
    onMouseEnter={(e) => {
      setStyles(e.currentTarget, {
        backgroundColor: 'var(--color-border-muted)',
        color: 'var(--color-text-primary)',
      });
    }}
    onMouseLeave={(e) => {
      setStyles(e.currentTarget, {
        backgroundColor: 'transparent',
        color: 'var(--color-text-muted)',
      });
    }}
    aria-label={isExpanded ? 'Collapse to panel' : 'Expand to full screen'}
  >
    {isExpanded ? (
      <Minimize2 className="size-4" />
    ) : (
      <Maximize2 className="size-4" />
    )}
  </button>
);

/**
 * Props for the DetailPanel component.
 * Configures panel behavior, content, and responsive display.
 */
export interface DetailPanelProps {
  /** Whether the panel is currently visible */
  isOpen: boolean;
  /** Callback function called when the panel should be closed */
  onClose: () => void;
  /** Whether to render in mobile mode (bottom drawer) vs desktop mode (sidebar) */
  isMobile: boolean;
  /** Aria label for the panel (used for accessibility) */
  ariaLabel: string;
  /** Content to render inside the panel (sidebar/drawer view) */
  children: ReactNode;
  /** Content to render inside the expanded modal view (optional, defaults to children) */
  expandedContent?: ReactNode;
  /** Custom width for desktop sidebar (default: 360px) */
  sidebarWidth?: number;
  /** Whether to show the expand button (default: true) */
  showExpandButton?: boolean;
  /** Additional header buttons to render alongside close/expand */
  headerButtons?: ReactNode;
  /** Max height for the desktop sidebar (constrains to sibling content height) */
  maxHeight?: number;
}

/**
 * Shared detail panel component with three responsive modes:
 * - Desktop: Sticky sidebar on the right
 * - Mobile: Bottom drawer with drag-to-dismiss
 * - Expanded: Full-screen modal overlay
 *
 * @public
 */
export const DetailPanel: FC<DetailPanelProps> = ({
  isOpen,
  onClose,
  isMobile,
  ariaLabel,
  children,
  expandedContent,
  sidebarWidth = 360,
  showExpandButton = true,
  headerButtons,
  maxHeight,
}) => {
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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
    // eslint-disable-next-line react-doctor/prefer-use-effect-event -- a plain keydown listener with intentional deps; useEffectEvent adds no real benefit here
  }, [isOpen, isExpanded, onClose]);

  // Mobile drag handlers
  const handleDragStart = (clientY: number) => {
    isDraggingRef.current = true;
    dragStartYRef.current = clientY;
    setDragOffset(0);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDraggingRef.current) return;

    const offset = Math.max(0, clientY - dragStartYRef.current);
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;

    // Close if dragged down more than 100px
    if (dragOffset > 100) {
      onClose();
    }

    setDragOffset(0);
  };

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  // Collapse modal back to panel view
  const handleCollapseModal = () => setIsExpanded(false);

  // Expanded full-screen modal view
  if (isExpanded) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
        style={{ height: '100dvh' }}
      >
        {/* Backdrop: a real button so click-to-collapse is keyboard-accessible */}
        <button
          type="button"
          aria-label="Collapse to panel"
          tabIndex={-1}
          className="absolute inset-0 cursor-default"
          style={{ backgroundColor: 'var(--color-visualization-overlay)' }}
          onClick={handleCollapseModal}
        />
        <dialog
          open
          aria-modal="true"
          aria-label={ariaLabel}
          className="relative z-10 m-0 max-h-none w-full max-w-4xl rounded-2xl border shadow-xl animate-scale-fade-in"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            maxHeight: 'calc(100dvh - 4rem)',
          }}
        >
          {/* Header with collapse button only (no need for two close buttons) */}
          <div className="absolute right-4 top-4 flex items-center gap-1 z-10">
            {headerButtons}
            <DetailPanelCloseButton
              onClick={handleCollapseModal}
              ariaLabel="Collapse to panel"
            />
          </div>

          {/* Expanded content */}
          <div
            className="overflow-y-auto px-6 pb-6 pt-12 md:px-8 md:pb-8 md:pt-14"
            style={{ maxHeight: 'calc(100dvh - 4rem)' }}
          >
            {expandedContent || children}
          </div>
        </dialog>
      </div>,
      document.body
    );
  }

  // Mobile bottom drawer
  if (isMobile) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end"
        style={{ height: '100dvh' }}
      >
        {/* Backdrop: a real button so click-to-close is keyboard-accessible */}
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          className="absolute inset-0 cursor-default"
          style={{ backgroundColor: 'var(--color-visualization-overlay)' }}
          onClick={onClose}
        />
        <dialog
          open
          aria-modal="true"
          aria-label={ariaLabel}
          className="relative z-10 m-0 max-h-none w-full rounded-t-3xl border border-b-0 shadow-xl transition-transform duration-300 ease-out"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            maxHeight: '80vh',
            transform: `translateY(${dragOffset}px)`,
          }}
        >
          {/* Drag handle (carries drag-to-dismiss interactions) */}
          <div className="flex justify-center pt-3 pb-2">
            <button
              type="button"
              aria-label="Drag handle — swipe down to dismiss"
              className="flex cursor-grab justify-center active:cursor-grabbing"
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
              onMouseDown={(e) => handleDragStart(e.clientY)}
              onMouseMove={(e) => {
                if (isDraggingRef.current) {
                  handleDragMove(e.clientY);
                }
              }}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  onClose();
                }
              }}
            >
              <GripVertical
                className="size-5"
                style={{ color: 'var(--color-text-muted)' }}
              />
            </button>
          </div>

          {/* Close button */}
          <div className="absolute right-4 top-3">
            <DetailPanelCloseButton onClick={onClose} />
          </div>

          {/* Content */}
          <div
            className="overflow-y-auto px-6 pb-6"
            style={{ maxHeight: 'calc(80vh - 3rem)' }}
          >
            {children}
          </div>
        </dialog>
      </div>,
      document.body
    );
  }

  // Desktop sidebar
  return (
    <section
      className="sticky top-3 self-start flex-shrink-0 rounded-2xl border shadow-xl transition-transform duration-300 ease-out animate-slide-fade-right"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        width: `${sidebarWidth}px`,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
      aria-label={ariaLabel}
    >
      {/* Action buttons */}
      <div className="absolute right-4 top-4 flex items-center gap-1 z-10">
        {headerButtons}
        {showExpandButton && (
          <DetailPanelExpandButton
            isExpanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        )}
        <DetailPanelCloseButton onClick={onClose} />
      </div>

      {/* Content */}
      <div
        className="overflow-y-auto p-6"
        style={{
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
      >
        {children}
      </div>
    </section>
  );
};
