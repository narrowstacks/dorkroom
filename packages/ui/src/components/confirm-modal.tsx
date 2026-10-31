import { AlertTriangle } from 'lucide-react';
import { useId } from 'react';
import { cn } from '../lib/cn';
import { Modal } from './modal';

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
  const titleId = useId();

  const handleConfirm = () => {
    if (!isProcessing) {
      onConfirm();
    }
  };

  // The shared Modal owns the portal, backdrop, scroll lock and Escape. The
  // confirm keeps its own compact panel (max-w-sm, p-5) and heading, and
  // lays the body out itself. The body's height cap and overflow clip are
  // both lifted: the clip would cut off the footer buttons' focus rings at
  // the panel edge, and keeping the cap without the clip would let a long
  // message spill past the panel on short screens.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      hideCloseButton
      ariaLabelledBy={titleId}
      className="max-w-sm p-5"
      bodyClassName="max-h-none overflow-visible"
    >
      <div>
        {/* Header */}
        <h2
          id={titleId}
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
            className="px-4 py-2 text-sm font-medium rounded-lg text-secondary bg-surface-muted hover:bg-hover-surface hover:text-on-hover-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg text-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] enabled:hover:opacity-90 disabled:opacity-50',
              isDestructive ? 'bg-error' : 'bg-brand'
            )}
          >
            {isProcessing ? 'Deleting…' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
