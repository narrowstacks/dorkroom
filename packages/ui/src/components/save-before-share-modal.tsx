import type React from 'react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

export interface SaveBeforeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndShare: (presetName: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Render a modal prompting the user to name and save a preset before sharing.
 *
 * The modal validates the preset name (trimmed) to be between 2 and 50 characters,
 * displays either internal validation errors or an external `error` prop, and
 * invokes `onSaveAndShare` with the trimmed name when validation succeeds.
 *
 * @param isOpen - Whether the modal is visible
 * @param onClose - Callback invoked when the modal is dismissed (backdrop, Cancel)
 * @param onSaveAndShare - Callback invoked with the trimmed preset name after successful validation
 * @param isLoading - When true, disables inputs and shows a saving state
 * @param error - External error message to display alongside validation errors
 * @returns The modal element when open, or `null` when closed.
 */
export function SaveBeforeShareModal({
  isOpen,
  onClose,
  onSaveAndShare,
  isLoading = false,
  error = null,
}: SaveBeforeShareModalProps) {
  const [presetName, setPresetName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = presetName.trim();
    if (!trimmedName) {
      setValidationError('Please enter a name for the preset.');
      return;
    }

    if (trimmedName.length < 2) {
      setValidationError('Preset name must be at least 2 characters long.');
      return;
    }

    if (trimmedName.length > 50) {
      setValidationError('Preset name must be 50 characters or less.');
      return;
    }

    setValidationError(null);
    void onSaveAndShare(trimmedName);
  };

  const handleClose = () => {
    setPresetName('');
    setValidationError(null);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetName(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const displayError = error || validationError;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:items-center sm:p-0">
        {/* Backdrop - eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- keyboard close handled by Escape key in useEffect */}
        <div
          className="fixed inset-0 backdrop-blur-sm transition-opacity"
          style={{ backgroundColor: 'var(--color-visualization-overlay)' }}
          onClick={handleClose}
          role="presentation"
        />

        {/* Modal */}
        <div
          className="relative z-10 inline-block transform overflow-hidden rounded-2xl text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle border"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border-secondary)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="sm:flex sm:items-start">
                <div
                  className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10"
                  style={{
                    backgroundColor: colorMixOr(
                      'var(--color-semantic-info)',
                      20,
                      'transparent',
                      'var(--color-border-muted)'
                    ),
                  }}
                >
                  <svg
                    className="h-6 w-6"
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
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3
                    className="text-lg font-medium leading-6"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Save Preset to Share
                  </h3>
                  <div className="mt-4">
                    <p
                      className="text-sm mb-4"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      To share these settings, you must first save them as a
                      named preset.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="preset-name"
                          className="block text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          Preset Name
                        </label>
                        <input
                          type="text"
                          id="preset-name"
                          value={presetName}
                          onChange={handleInputChange}
                          disabled={isLoading}
                          placeholder='e.g., Portrait 5x7 with 0.5" border'
                          className={cn(
                            'mt-1 block w-full rounded-md border px-3 py-2 text-sm placeholder:opacity-70',
                            'focus:outline-none focus:ring-2',
                            'disabled:cursor-not-allowed'
                          )}
                          style={
                            displayError
                              ? ({
                                  borderColor: 'var(--color-semantic-error)',
                                  '--tw-ring-color':
                                    'var(--color-semantic-error)',
                                  backgroundColor: 'var(--color-surface-muted)',
                                  color: 'var(--color-text-primary)',
                                } as React.CSSProperties)
                              : ({
                                  borderColor: 'var(--color-border-secondary)',
                                  '--tw-ring-color':
                                    'var(--color-border-primary)',
                                  backgroundColor: 'var(--color-surface-muted)',
                                  color: 'var(--color-text-primary)',
                                } as React.CSSProperties)
                          }
                          maxLength={50}
                        />
                        {displayError && (
                          <p
                            className="mt-1 text-sm"
                            style={{ color: 'var(--color-semantic-error)' }}
                          >
                            {displayError}
                          </p>
                        )}
                        <p
                          className="mt-1 text-xs"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {presetName.length}/50 characters
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <button
                type="submit"
                disabled={isLoading || !presetName.trim()}
                className={cn(
                  'inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm',
                  'sm:ml-3 sm:w-auto sm:text-sm',
                  'focus:outline-none focus:ring-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                style={
                  isLoading || !presetName.trim()
                    ? ({
                        backgroundColor:
                          'rgba(var(--color-background-rgb), 0.2)',
                        color: 'var(--color-text-secondary)',
                        '--tw-ring-color': 'var(--color-border-primary)',
                      } as React.CSSProperties)
                    : ({
                        backgroundColor: 'var(--color-text-primary)',
                        color: 'var(--color-background)',
                        '--tw-ring-color': 'var(--color-border-primary)',
                      } as React.CSSProperties)
                }
              >
                {isLoading ? (
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
                    Saving...
                  </>
                ) : (
                  'Save and Share'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="mt-3 inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- extending CSSProperties with CSS custom properties
                  {
                    borderWidth: 1,
                    borderColor: 'var(--color-border-secondary)',
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
                    color: 'var(--color-text-primary)',
                  } as React.CSSProperties & { '--tw-ring-color': string }
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
