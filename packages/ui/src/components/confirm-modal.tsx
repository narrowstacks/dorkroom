import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (!isProcessing) {
      onConfirm();
    }
  };

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click closes modal, keyboard Escape handled separately
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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal content stops propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled by parent */}
      <div
        className="relative w-full max-w-sm rounded-2xl border p-5 shadow-xl backdrop-blur-lg animate-scale-fade-in"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
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
                className="h-4 w-4"
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
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={
              {
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface-muted)',
                '--tw-ring-color': 'var(--color-border-primary)',
              } as React.CSSProperties
            }
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
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            style={
              {
                color: 'white',
                backgroundColor: isDestructive
                  ? 'var(--color-semantic-error)'
                  : 'var(--color-primary)',
                '--tw-ring-color': isDestructive
                  ? 'var(--color-semantic-error)'
                  : 'var(--color-primary)',
              } as React.CSSProperties
            }
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {isProcessing ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
