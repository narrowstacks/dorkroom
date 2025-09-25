import { Modal } from '../modal';
import { Drawer, DrawerBody, DrawerContent } from '../drawer';
import { DevelopmentRecipeDetail } from './recipe-detail';
import type { DevelopmentCombinationView } from './results-table';
import type { FilmdevMappingResult } from '@dorkroom/logic';
import { cn } from '../../lib/cn';
import { X, ExternalLink } from 'lucide-react';

interface FilmdevPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mappingResult: FilmdevMappingResult | null;
  previewRecipe: DevelopmentCombinationView | null;
  isProcessing?: boolean;
  variant?: 'modal' | 'drawer';
}

export function FilmdevPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  mappingResult,
  previewRecipe,
  isProcessing = false,
  variant = 'modal',
}: FilmdevPreviewModalProps) {
  if (!mappingResult || !previewRecipe) {
    return null;
  }

  const { originalRecipe, isFilmCustom, isDeveloperCustom } = mappingResult;

  const recipeName = mappingResult.formData.name;
  const modalTitle = 'Preview Recipe from filmdev.org';

  // Determine matching status message
  let matchingStatusMessage = '';
  let matchingStatusColor = 'var(--color-text-secondary)';

  if (isFilmCustom && isDeveloperCustom) {
    matchingStatusMessage =
      'Both film and developer will be added as custom entries';
    matchingStatusColor = 'var(--color-text-warning)';
  } else if (isFilmCustom) {
    matchingStatusMessage =
      'Film will be added as custom entry • Developer matched to existing';
    matchingStatusColor = 'var(--color-text-warning)';
  } else if (isDeveloperCustom) {
    matchingStatusMessage =
      'Film matched to existing • Developer will be added as custom entry';
    matchingStatusColor = 'var(--color-text-warning)';
  } else {
    matchingStatusMessage =
      'Both film and developer matched to existing entries';
    matchingStatusColor = 'var(--color-text-success)';
  }

  const actions = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        className="rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: 'var(--color-border-primary)',
          color: 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isProcessing}
        className={cn(
          'rounded-full px-5 py-2 text-sm font-semibold transition',
          isProcessing && 'cursor-wait opacity-70'
        )}
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            'color-mix(in srgb, var(--color-text-primary) 90%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-text-primary)';
        }}
      >
        {isProcessing ? 'Adding...' : 'Add to My Recipes'}
      </button>
    </div>
  );

  const body = (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Source Information */}
      <div className="space-y-2">
        <div
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          This recipe will be imported from filmdev.org and automatically
          tagged.
        </div>

        {/* Link to original recipe */}
        <a
          href={originalRecipe.recipe_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm transition"
          style={{ color: 'var(--color-text-link)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-link-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-link)';
          }}
        >
          <ExternalLink className="h-4 w-4" />
          View original on filmdev.org
        </a>
      </div>

      {/* Matching Status */}
      <div
        className="rounded-lg border px-3 py-2 text-sm"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-background-muted)',
        }}
      >
        <div
          className="font-medium text-xs uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Film & Developer Matching
        </div>
        <div className="text-sm" style={{ color: matchingStatusColor }}>
          {matchingStatusMessage}
        </div>
      </div>

      {/* Recipe Preview */}
      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-border-muted)',
        }}
      >
        <div
          className="mb-2 text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {recipeName}
        </div>

        <DevelopmentRecipeDetail view={previewRecipe} />

        {/* Tags Preview - Inline with recipe */}
        <div
          className="mt-2 pt-2 border-t"
          style={{ borderColor: 'var(--color-border-secondary)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Tags:
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-background-tag)',
                color: 'var(--color-text-tag)',
                border: '1px solid var(--color-border-tag)',
              }}
            >
              filmdev.org
            </span>
          </div>
        </div>
      </div>

      {/* Original Recipe Details - Only show if exists and make compact */}
      {originalRecipe.notes && (
        <div>
          <div
            className="mb-1 text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Original Notes
          </div>
          <div
            className="text-sm rounded-lg border p-2 max-h-20 overflow-y-auto"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-background-muted)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {originalRecipe.notes}
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'drawer') {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="bottom">
        <DrawerContent className="h-full max-h-[80vh]">
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            <div
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {modalTitle}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border p-2 transition"
              style={{
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--color-border-secondary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--color-border-primary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
          <DrawerBody className="px-4 pb-6 pt-4">{body}</DrawerBody>
          <div
            className="border-t px-4 pb-4 pt-3"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            {actions}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="md"
      footer={actions}
    >
      {body}
    </Modal>
  );
}
