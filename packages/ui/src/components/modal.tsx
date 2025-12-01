import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

/**
 * Props for the Modal component.
 * Configures modal behavior, content, and appearance.
 *
 * @public
 */
interface ModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Callback function called when the modal should be closed */
  onClose: () => void;
  /** Optional title text displayed in the modal header */
  title?: string;
  /** Modal content to be rendered inside the modal body */
  children: React.ReactNode;
  /** Size variant for the modal width (defaults to 'md') */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional footer content displayed at the bottom of the modal */
  footer?: React.ReactNode;
  /** Whether to hide the X close button in the header */
  hideCloseButton?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
};

/**
 * Render a modal dialog into a portal with a backdrop and automatic body-scroll locking when open.
 *
 * Renders nothing during server-side rendering or when `isOpen` is false.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback invoked to request closing the modal (e.g., backdrop or close button)
 * @param title - Optional header text displayed at the top of the modal
 * @param children - Modal body content
 * @param size - Width variant; one of `"sm" | "md" | "lg" | "xl"` (defaults to `"md"`)
 * @param footer - Optional footer content rendered below the body
 * @param hideCloseButton - If `true`, the top-right close button is not rendered
 * @returns The modal element appended to `document.body`, or `null` when closed or in SSR
 *
 * @public
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  hideCloseButton,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur"
      style={{
        backgroundColor: 'var(--color-visualization-overlay)',
        height: '100dvh',
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full rounded-2xl border p-6 shadow-xl backdrop-blur-lg',
          SIZE_CLASSES[size]
        )}
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 transition focus-visible:outline-none focus-visible:ring-2"
            style={
              {
                color: 'var(--color-text-muted)',
                '--tw-ring-color': 'var(--color-border-primary)',
              } as React.CSSProperties
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-border-muted)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--modal-close-bg-hover-leave, transparent)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {title && (
          <div className="mb-4 pr-10">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {title}
            </h2>
          </div>
        )}
        <div
          className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {children}
        </div>
        {footer && (
          <div className="mt-6 flex flex-col gap-2 pb-20">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
