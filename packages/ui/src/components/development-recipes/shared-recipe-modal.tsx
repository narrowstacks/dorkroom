import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { cn } from '../../lib/cn';
import { ResponsiveModal } from '../responsive-modal';
import { DevelopmentRecipeDetail } from './recipe-detail';

interface SharedRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: DevelopmentCombinationView | null;
  onAddToCollection: () => void;
  isProcessing?: boolean;
  recipeSource?: 'shared' | 'custom';
  /**
   * Render as a bottom drawer instead of a centred modal. Defaults to the
   * shared ResponsiveModal's own viewport detection.
   */
  isMobile?: boolean;
  hideAddToCollection?: boolean;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
}

// eslint-disable-next-line react-doctor/no-many-boolean-props -- isOpen/isLoading are modal lifecycle state plus optional favorite affordances; not a variant axis
export function SharedRecipeModal({
  isOpen,
  onClose,
  recipe,
  onAddToCollection,
  isProcessing = false,
  recipeSource = 'shared',
  isMobile,
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
          hideAddToCollection
            ? 'border-0 bg-text-primary font-semibold text-background hover:bg-text-primary/90'
            : 'border border-primary text-secondary hover:border-secondary hover:text-primary'
        )}
      >
        {hideAddToCollection ? 'Close' : 'Not now'}
      </button>
      {onToggleFavorite && recipe && (
        <button
          type="button"
          onClick={() => onToggleFavorite?.(recipe)}
          className="rounded-full bg-text-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-text-primary/90"
          aria-pressed={isFavorite?.(recipe) ?? false}
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
            'rounded-full bg-text-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-text-primary/90',
            isProcessing && 'cursor-wait opacity-70'
          )}
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

      <div className="rounded-xl border border-secondary bg-border-muted p-4">
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

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      mobileSize="lg"
      isMobile={isMobile}
      footer={actions}
    >
      {body}
    </ResponsiveModal>
  );
}
