import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { Drawer, DrawerBody, DrawerContent } from '../drawer';
import { Modal } from '../modal';
import { DevelopmentRecipeDetail } from './recipe-detail';

interface SharedRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: DevelopmentCombinationView | null;
  onAddToCollection: () => void;
  isProcessing?: boolean;
  recipeSource?: 'shared' | 'custom';
  variant?: 'modal' | 'drawer';
  hideAddToCollection?: boolean;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
}

export function SharedRecipeModal({
  isOpen,
  onClose,
  recipe,
  onAddToCollection,
  isProcessing = false,
  recipeSource = 'shared',
  variant = 'modal',
  hideAddToCollection = false,
  isFavorite,
  onToggleFavorite,
}: SharedRecipeModalProps) {
  if (!recipe) {
    return null;
  }

  const isCustomRecipe = recipeSource === 'custom';
  const recipeName =
    recipe.combination.name ||
    `${recipe.film?.brand} ${recipe.film?.name} + ${recipe.developer?.manufacturer} ${recipe.developer?.name}`;

  const modalTitle = isCustomRecipe ? 'Custom Recipe Shared' : 'Recipe Shared';
  const description = isCustomRecipe
    ? 'Someone has shared a custom development recipe with you.'
    : 'Someone has shared a development recipe with you.';

  const actions = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        className={cn(
          'rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
          hideAddToCollection ? 'border-0 font-semibold' : 'border'
        )}
        style={
          hideAddToCollection
            ? {
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-background)',
              }
            : {
                borderColor: 'var(--color-border-primary)',
                color: 'var(--color-text-secondary)',
              }
        }
        onMouseEnter={(e) => {
          if (hideAddToCollection) {
            e.currentTarget.style.backgroundColor = colorMixOr(
              'var(--color-text-primary)',
              90,
              'transparent',
              'var(--color-text-primary)'
            );
          } else {
            e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (hideAddToCollection) {
            e.currentTarget.style.backgroundColor = 'var(--color-text-primary)';
          } else {
            e.currentTarget.style.borderColor = 'var(--color-border-primary)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }
        }}
      >
        {hideAddToCollection ? 'Close' : 'Not now'}
      </button>
      {onToggleFavorite && recipe && (
        <button
          type="button"
          onClick={() => onToggleFavorite?.(recipe)}
          className={cn(
            'rounded-full px-5 py-2 text-sm font-semibold transition'
          )}
          aria-pressed={isFavorite?.(recipe) ?? false}
          style={{
            backgroundColor: 'var(--color-text-primary)',
            color: 'var(--color-background)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colorMixOr(
              'var(--color-text-primary)',
              90,
              'transparent',
              'var(--color-text-primary)'
            );
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-text-primary)';
          }}
        >
          {isFavorite?.(recipe) ? 'Remove from favorites' : 'Add to favorites'}
        </button>
      )}
      {!hideAddToCollection && (
        <button
          type="button"
          onClick={onAddToCollection}
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
            e.currentTarget.style.backgroundColor = colorMixOr(
              'var(--color-text-primary)',
              90,
              'transparent',
              'var(--color-text-primary)'
            );
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-text-primary)';
          }}
        >
          {isProcessing
            ? 'Adding...'
            : isCustomRecipe
              ? 'Add to My Recipes'
              : 'Save Recipe'}
        </button>
      )}
    </div>
  );

  const body = (
    <div className="space-y-4">
      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-border-muted)',
        }}
      >
        <div
          className="mb-2 text-xs uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Recipe
        </div>
        <div
          className="mb-3 text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {recipeName}
        </div>

        <DevelopmentRecipeDetail view={recipe} />
      </div>

      {!hideAddToCollection && (
        <div
          className="text-sm"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Would you like to add this recipe to your collection?
        </div>
      )}
    </div>
  );

  if (variant === 'drawer') {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="bottom">
        <DrawerContent className="h-full max-h-[85vh]">
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
      size="lg"
      footer={actions}
    >
      {body}
    </Modal>
  );
}
