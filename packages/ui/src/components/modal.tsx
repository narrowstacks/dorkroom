import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
 * A reusable modal dialog component with backdrop and portal rendering.
 * Provides consistent modal behavior across the application with flexible content.
 *
 * Features:
 * - Portal-based rendering for proper z-index layering
 * - Automatic body scroll prevention when open
 * - Multiple size variants
 * - Optional header, footer, and close button
 * - Backdrop click and ESC key handling
 * - SSR-safe with document availability check
 *
 * @public
 * @param props - Configuration props for the modal
 * @returns Portal-rendered modal dialog or null if closed/SSR
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm Action"
 *   size="md"
 *   footer={
 *     <div className="flex gap-2">
 *       <button onClick={handleCancel}>Cancel</button>
 *       <button onClick={handleConfirm}>Confirm</button>
 *     </div>
 *   }
 * >
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 * ```
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
