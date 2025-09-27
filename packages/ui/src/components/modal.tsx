import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
};

/**
 * Renders a centered modal dialog portal with optional title, footer, and close control.
 *
 * Prevents background scrolling while open by setting `document.body.style.overflow` to `"hidden"` and restores the original overflow value when the modal closes or the component unmounts. The rendered dialog uses `role="dialog"` and `aria-modal="true"`.
 *
 * @param isOpen - Whether the modal is visible.
 * @param onClose - Callback invoked when the backdrop or close button is clicked.
 * @param title - Optional heading text displayed at the top of the modal.
 * @param size - Modal size key controlling max-width; one of `'sm' | 'md' | 'lg' | 'xl'`. Defaults to `'md'`.
 * @param footer - Optional footer content rendered below the modal body.
 * @param hideCloseButton - If true, the close button is not rendered.
 * @returns The modal element rendered into `document.body` when running in a DOM environment and `isOpen` is true; otherwise `null`.
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
              e.currentTarget.style.backgroundColor = 'var(--modal-close-bg-hover-leave, transparent)';
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
          className="space-y-4 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {children}
        </div>
        {footer && <div className="mt-6 flex flex-col gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
