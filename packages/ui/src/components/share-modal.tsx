import { useState } from 'react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  webUrl: string;
  nativeUrl?: string;
  onCopyToClipboard: (url: string) => Promise<void>;
  onNativeShare?: () => Promise<void>;
  canShareNatively?: boolean;
  canCopyToClipboard?: boolean;
}

export function ShareModal({
  isOpen,
  onClose,
  presetName,
  webUrl,
  nativeUrl,
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
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyNative = async () => {
    if (!nativeUrl) return;
    try {
      await onCopyToClipboard(nativeUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleNativeShare = async () => {
    if (!onNativeShare) return;
    try {
      setIsSharing(true);
      await onNativeShare();
    } catch (error) {
      console.error('Failed to share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const displayUrl = hasValidUrl ? webUrl.replace(/^https?:\/\//, '') : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 backdrop-blur-sm transition-opacity"
          style={{
            backgroundColor: colorMixOr(
              'var(--color-background)',
              60,
              'transparent',
              'var(--color-surface-muted)'
            ),
          }}
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-10 inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          {!hasValidUrl ? (
            // Error state when no valid URL
            <>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Unable to Share
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        We couldn't generate a share link for your settings.
                        Please try again.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            // Normal sharing content
            <>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Share "{presetName}"
                    </h3>
                    <div className="mt-4 space-y-4">
                      {/* Native Share Option */}
                      {canShareNatively && onNativeShare && (
                        <div className="space-y-2">
                          <button
                            onClick={handleNativeShare}
                            disabled={isSharing}
                            className={cn(
                              'w-full flex items-center justify-center px-4 py-2 rounded-md',
                              'bg-blue-600 text-white hover:bg-blue-700',
                              'transition-colors duration-200',
                              'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            {isSharing ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
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
                                Sharing...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="mr-2 h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
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
                      )}

                      {/* Web URL Section */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Web Link
                        </label>
                        <p className="text-xs text-gray-500">
                          Works on any device with a web browser
                        </p>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={displayUrl}
                            readOnly
                            className="flex-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                          />
                          {canCopyToClipboard && (
                            <button
                              onClick={handleCopyWeb}
                              className={cn(
                                'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                                copySuccess
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-600 text-white hover:bg-gray-700'
                              )}
                            >
                              {copySuccess ? (
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
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
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
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

                      {/* Native URL Section */}
                      {nativeUrl && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            App Link
                          </label>
                          <p className="text-xs text-gray-500">
                            Opens directly in the Dorkroom app
                          </p>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={nativeUrl}
                              readOnly
                              className="flex-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                            />
                            {canCopyToClipboard && (
                              <button
                                onClick={handleCopyNative}
                                className={cn(
                                  'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                                  'bg-gray-600 text-white hover:bg-gray-700'
                                )}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
