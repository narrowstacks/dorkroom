import React, { useState } from 'react';
import { cn } from '../lib/cn';

export interface SaveBeforeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndShare: (presetName: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

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
    onSaveAndShare(trimmedName);
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
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div
          className="relative z-10 inline-block transform overflow-hidden rounded-lg text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
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
                    backgroundColor:
                      'color-mix(in srgb, var(--color-semantic-info) 20%, transparent)',
                  }}
                >
                  <svg
                    className="h-6 w-6"
                    style={{ color: 'var(--color-semantic-info)' }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
                          className="block text-sm font-medium text-gray-700"
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
                            'mt-1 block w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            'disabled:bg-gray-100 disabled:cursor-not-allowed',
                            displayError
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300'
                          )}
                          autoFocus
                          maxLength={50}
                        />
                        {displayError && (
                          <p className="mt-1 text-sm text-red-600">
                            {displayError}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {presetName.length}/50 characters
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={isLoading || !presetName.trim()}
                className={cn(
                  'inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm',
                  'sm:ml-3 sm:w-auto sm:text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isLoading || !presetName.trim()
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
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
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
