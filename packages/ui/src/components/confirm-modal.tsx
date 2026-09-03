import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../hooks/use-body-scroll-lock';
import { useEscapeKey } from '../hooks/use-escape-key';
import { cssVars, hasGlobal } from '../lib/dom';

interface ConfirmModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Callback function called when the modal should be closed */
  onClose: () => void;
  /** Callback function called when the user confirms the action */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message: string;
  /** Text for the confirm button (defaults to "Confirm") */
  confirmText?: string;
  /** Text for the cancel button (defaults to "Cancel") */
  cancelText?: string;
  /** Whether to show a warning icon (defaults to true for destructive actions) */
  showWarningIcon?: boolean;
  /** Whether the confirm action is destructive (affects button styling) */
  isDestructive?: boolean;
  /** Whether confirmation is in progress */
  isProcessing?: boolean;
}

/**
 * A confirmation modal for actions that require user confirmation.
 * Use this instead of browser's native confirm() dialog.
 */
// eslint-disable-next-line react-doctor/no-many-boolean-props -- isOpen/isProcessing are modal lifecycle state and showWarningIcon/isDestructive are an intentional, well-understood confirm-dialog API
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showWarningIcon = true,
  isDestructive = false,
  isProcessing = false,
}: ConfirmModalProps) {
  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  const handleConfirm = () => {
    if (!isProcessing) {
      onConfirm();
    }
  };

  if (!hasGlobal('document') || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ height: '100dvh' }}
    >
      {/* Backdrop: a real button so click-to-close works; hidden from AT and
          the tab sequence since Escape and the Cancel button already cover
          keyboard dismissal. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="confirm-modal-backdrop"
        className="absolute inset-0 cursor-default backdrop-blur"
        style={{ backgroundColor: 'var(--color-visualization-overlay)' }}
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-label={title}
        className="relative z-10 m-0 max-h-none w-full max-w-sm rounded-2xl border p-5 shadow-xl backdrop-blur-lg animate-scale-fade-in"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
      >
        {/* Header */}
        <h2
          className="text-base font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>

        {/* Content */}
        <div className="flex gap-3 items-start mb-5">
          {showWarningIcon && (
            <div
              className="flex-shrink-0 p-1.5 rounded-full"
              style={{
                backgroundColor: isDestructive
                  ? 'color-mix(in srgb, var(--color-semantic-error) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-semantic-warning) 15%, transparent)',
              }}
            >
              <AlertTriangle
                className="size-4"
                style={{
                  color: isDestructive
                    ? 'var(--color-semantic-error)'
                    : 'var(--color-semantic-warning)',
                }}
              />
            </div>
          )}
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
            style={cssVars({
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
            })}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-border-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-surface-muted)';
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] disabled:opacity-50"
            style={cssVars({
              color: 'var(--color-background)',
              backgroundColor: isDestructive
                ? 'var(--color-semantic-error)'
                : 'var(--color-primary)',
            })}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {isProcessing ? 'Deleting…' : confirmText}
          </button>
        </div>
      </dialog>
    </div>,
    document.body
  );
}
