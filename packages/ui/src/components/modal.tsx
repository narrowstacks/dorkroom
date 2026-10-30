import { X } from 'lucide-react';
import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../hooks/use-body-scroll-lock';
import { useEscapeKey } from '../hooks/use-escape-key';
import { cn } from '../lib/cn';
import { hasGlobal } from '../lib/dom';

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
  /**
   * Id of an element inside `children` that names the dialog. Use it when the
   * dialog renders its own heading instead of passing `title`. Ignored when
   * `title` is set, since the built-in heading names the dialog then.
   */
  ariaLabelledBy?: string;
  /**
   * Extra classes for the dialog panel, merged over the defaults (width,
   * padding). For dialogs that lay out their own sections edge to edge.
   */
  className?: string;
  /** Extra classes for the scrolling body that wraps `children`. */
  bodyClassName?: string;
}

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
} satisfies Record<NonNullable<ModalProps['size']>, string>;

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
  ariaLabelledBy,
  className,
  bodyClassName,
}: ModalProps) {
  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);
  const titleId = useId();

  if (!hasGlobal('document') || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ height: '100dvh' }}
    >
      {/* Backdrop: a real button so click-to-close works; hidden from AT and
          the tab sequence since Escape already covers keyboard dismissal
          (as does the header close button, when shown). */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="modal-backdrop"
        className="absolute inset-0 cursor-default backdrop-blur"
        style={{ backgroundColor: 'var(--color-visualization-overlay)' }}
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby={title ? titleId : ariaLabelledBy}
        className={cn(
          'relative z-10 m-0 max-h-none w-full rounded-2xl border p-6 shadow-xl backdrop-blur-lg animate-scale-fade-in',
          SIZE_CLASSES[size],
          className
        )}
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] hoverable-icon-btn"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        )}
        {title && (
          <div className="mb-4 pr-10">
            <h2
              id={titleId}
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {title}
            </h2>
          </div>
        )}
        <div
          className={cn(
            'max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto text-sm',
            bodyClassName
          )}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {children}
        </div>
        {footer && (
          <div className="mt-6 flex flex-col gap-2 pb-20">{footer}</div>
        )}
      </dialog>
    </div>,
    document.body
  );
}
