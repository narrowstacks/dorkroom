import {
  type DevelopmentCombinationView,
  DevelopmentRecipeDetail,
  ResponsiveModal,
} from '@dorkroom/ui';
import type { FC } from 'react';

export interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detailView: DevelopmentCombinationView | null;
  isMobile: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  onEditCustomRecipe: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  onShareRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  onCopyRecipe: (view: DevelopmentCombinationView) => Promise<void>;
  customRecipeSharingEnabled: boolean;
}

export const RecipeDetailModal: FC<RecipeDetailModalProps> = ({
  isOpen,
  onClose,
  detailView,
  isMobile,
  isFavorite,
  toggleFavorite,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  onShareRecipe,
  onCopyRecipe,
  customRecipeSharingEnabled,
}) => {
  if (!detailView) {
    return null;
  }

  const recipeId = String(
    detailView.combination.uuid || detailView.combination.id
  );
  const isRecipeFavorite = isFavorite(recipeId);
  const isCustomRecipe = detailView.source === 'custom';

  const actionButtons = (
    <div className={isMobile ? 'flex flex-col gap-2' : 'flex gap-2 pt-4'}>
      <button
        type="button"
        onClick={() => toggleFavorite(recipeId)}
        className={`${isMobile ? 'w-full' : 'flex-1'} rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105`}
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background)',
        }}
      >
        {isRecipeFavorite ? 'Remove from favorites' : 'Add to favorites'}
      </button>
      {isCustomRecipe && customRecipeSharingEnabled && (
        <>
          <button
            type="button"
            onClick={() => onShareRecipe(detailView)}
            className={`${isMobile ? 'w-full' : 'flex-1'} rounded-full px-4 py-2 text-sm font-semibold transition hover:brightness-105`}
            style={{
              backgroundColor: 'var(--color-text-primary)',
              color: 'var(--color-background)',
            }}
          >
            Share recipe
          </button>
          <button
            type="button"
            onClick={() => onCopyRecipe(detailView)}
            className={`${isMobile ? 'w-full' : 'flex-1'} rounded-full px-4 py-2 text-sm font-medium transition`}
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border-secondary)',
              borderWidth: 1,
            }}
          >
            Copy link
          </button>
        </>
      )}
    </div>
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Recipe details"
      size="lg"
      mobileSize="lg"
      isMobile={isMobile}
      drawerBodyClassName="space-y-4"
    >
      <DevelopmentRecipeDetail
        view={detailView}
        onEditCustomRecipe={onEditCustomRecipe}
        onDeleteCustomRecipe={onDeleteCustomRecipe}
        isFavorite={(view) =>
          isFavorite(String(view.combination.uuid || view.combination.id))
        }
        onToggleFavorite={(view) =>
          toggleFavorite(String(view.combination.uuid || view.combination.id))
        }
        onShareRecipe={onShareRecipe}
      />
      {actionButtons}
    </ResponsiveModal>
  );
};
