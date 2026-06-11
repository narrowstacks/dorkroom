import { debugError } from '@dorkroom/logic';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  webUrl: string;
  onCopyToClipboard: (url: string) => Promise<void>;
  onNativeShare?: () => Promise<void>;
  canShareNatively?: boolean;
  canCopyToClipboard?: boolean;
}

const closeButtonStyle = {
  backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
  color: 'var(--color-text-primary)',
  borderWidth: 1,
  borderColor: 'var(--color-border-secondary)',
  '--tw-ring-color': 'var(--color-border-primary)',
} as React.CSSProperties;

/**
 * Footer row containing the modal's close action.
 */
function ModalFooter({
  onClose,
  buttonClassName,
}: {
  onClose: () => void;
  buttonClassName: string;
}) {
  return (
    <div
      className="px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <button
        type="button"
        onClick={onClose}
        className={buttonClassName}
        style={closeButtonStyle}
      >
        Close
      </button>
    </div>
  );
}

/**
 * Error state shown when no valid web URL is available to share.
 */
function ShareModalError({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div
        className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="sm:flex sm:items-start">
          <div
            className="mx-auto flex size-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-10"
            style={{
              backgroundColor: colorMixOr(
                'var(--color-semantic-error)',
                15,
                'transparent',
                'var(--color-border-muted)'
              ),
            }}
          >
            <svg
              className="size-6"
              style={{ color: 'var(--color-semantic-error)' }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3
              className="text-lg font-medium leading-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Unable to Share
            </h3>
            <div className="mt-2">
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                We couldn't generate a share link for your settings. Please try
                again.
              </p>
            </div>
          </div>
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        buttonClassName="inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm sm:ml-3 sm:w-auto sm:text-sm transition focus-visible:outline-none focus-visible:ring-2"
      />
    </>
  );
}

/**
 * Native share button shown when native sharing is enabled and available.
 */
function NativeShareButton({
  isSharing,
  onShare,
}: {
  isSharing: boolean;
  onShare: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onShare}
        disabled={isSharing}
        className={cn(
          'w-full flex items-center justify-center px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2'
        )}
        style={
          (isSharing
            ? {
                backgroundColor: 'rgba(var(--color-background-rgb), 0.2)',
                color: 'var(--color-text-secondary)',
                '--tw-ring-color': 'var(--color-border-primary)',
              }
            : {
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-background)',
                '--tw-ring-color': 'var(--color-border-primary)',
              }) as React.CSSProperties & {
            '--tw-ring-color': string;
          }
        }
      >
        {isSharing ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 size-5"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sharing…
          </>
        ) : (
          <>
            <svg
              className="mr-2 size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3"
              />
            </svg>
            Share via system
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Web link display with an optional copy-to-clipboard control.
 */
function WebLinkSection({
  displayUrl,
  canCopyToClipboard,
  copySuccess,
  onCopy,
}: {
  displayUrl: string;
  canCopyToClipboard: boolean;
  copySuccess: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="share-web-link"
        className="block text-sm font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Web Link
      </label>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Works on any device with a web browser
      </p>
      <div className="flex gap-x-2">
        <input
          id="share-web-link"
          type="text"
          aria-label="Web Link"
          value={displayUrl}
          readOnly
          className="flex-1 block w-full rounded-md px-3 py-2 text-sm placeholder:opacity-70"
          style={{
            borderWidth: 1,
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
          }}
        />
        {canCopyToClipboard && (
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2'
            )}
            style={
              (copySuccess
                ? {
                    backgroundColor: 'var(--color-semantic-success)',
                    color: 'var(--color-background)',
                    '--tw-ring-color': 'var(--color-border-primary)',
                  }
                : {
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.2)',
                    color: 'var(--color-text-primary)',
                    '--tw-ring-color': 'var(--color-border-primary)',
                  }) as React.CSSProperties & {
                '--tw-ring-color': string;
              }
            }
          >
            {copySuccess ? (
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Normal sharing content: title, optional native share, and the web link section.
 */
function ShareModalContent({
  presetName,
  displayUrl,
  canShareNatively,
  onNativeShare,
  isSharing,
  onShare,
  canCopyToClipboard,
  copySuccess,
  onCopy,
  onClose,
}: {
  presetName: string;
  displayUrl: string;
  canShareNatively: boolean;
  onNativeShare?: () => Promise<void>;
  isSharing: boolean;
  onShare: () => void;
  canCopyToClipboard: boolean;
  copySuccess: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="sm:flex sm:items-start">
          <div
            className="mx-auto flex size-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-10"
            style={{
              backgroundColor: colorMixOr(
                'var(--color-semantic-info)',
                15,
                'transparent',
                'var(--color-border-muted)'
              ),
            }}
          >
            <svg
              className="size-6"
              style={{ color: 'var(--color-semantic-info)' }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3
              className="text-lg font-medium leading-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Share "{presetName}"
            </h3>
            <div className="mt-4 space-y-4">
              {canShareNatively && onNativeShare && (
                <NativeShareButton isSharing={isSharing} onShare={onShare} />
              )}

              <WebLinkSection
                displayUrl={displayUrl}
                canCopyToClipboard={canCopyToClipboard}
                copySuccess={copySuccess}
                onCopy={onCopy}
              />
            </div>
          </div>
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        buttonClassName="mt-3 inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition focus-visible:outline-none focus-visible:ring-2"
      />
    </>
  );
}

/**
 * Renders a modal that lets the user copy or natively share a preset's web URL.
 *
 * Displays an error state when no valid web URL is available. When open, the modal shows:
 * - an optional native share action (if enabled and provided),
 * - a web link (with protocol stripped for display) and copy control.
 *
 * @param isOpen - Whether the modal is visible.
 * @param onClose - Callback invoked to close the modal.
 * @param presetName - Human-readable name shown in the modal title.
 * @param webUrl - The web URL used for sharing and copying; must be non-empty to enable sharing UI.
 * @param onCopyToClipboard - Handler invoked to copy a given URL to the clipboard.
 * @param onNativeShare - Optional handler invoked to perform a system/native share action.
 * @param canShareNatively - When true and `onNativeShare` is provided, shows the native share action.
 * @param canCopyToClipboard - When true, shows copy-to-clipboard controls for available URLs.
 * @returns The modal's React element when `isOpen` is true, or `null` when closed.
 */
export function ShareModal({
  isOpen,
  onClose,
  presetName,
  webUrl,
  onCopyToClipboard,
  onNativeShare,
  canShareNatively = false,
  canCopyToClipboard = true,
}: ShareModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) {
    return null;
  }

  // Check if we have valid URLs to share
  const hasValidUrl = webUrl && webUrl.length > 0;

  const handleCopyWeb = async () => {
    try {
      await onCopyToClipboard(webUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      debugError('Failed to copy:', error);
    }
  };

  const handleNativeShare = async () => {
    if (!onNativeShare) return;
    try {
      setIsSharing(true);
      await onNativeShare();
    } catch (error) {
      debugError('Failed to share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const displayUrl = hasValidUrl ? webUrl.replace(/^https?:\/\//, '') : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:items-center sm:p-0">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay dismiss pattern */}
        <div
          className="fixed inset-0 backdrop-blur-sm transition-opacity"
          style={{ backgroundColor: 'var(--color-visualization-overlay)' }}
          role="presentation"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />

        {/* Modal */}
        <div
          className="relative z-10 inline-block transform overflow-hidden rounded-2xl text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle border"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }}
        >
          {!hasValidUrl ? (
            <ShareModalError onClose={onClose} />
          ) : (
            <ShareModalContent
              presetName={presetName}
              displayUrl={displayUrl}
              canShareNatively={canShareNatively}
              onNativeShare={onNativeShare}
              isSharing={isSharing}
              onShare={handleNativeShare}
              canCopyToClipboard={canCopyToClipboard}
              copySuccess={copySuccess}
              onCopy={handleCopyWeb}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
