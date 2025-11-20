import { X } from 'lucide-react';
import {
  Modal,
  Drawer,
  DrawerContent,
  DrawerBody,
  DevelopmentRecipeDetail,
  type DevelopmentCombinationView,
} from '@dorkroom/ui';

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

export function RecipeDetailModal(props: RecipeDetailModalProps) {
  const {
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
  } = props;

  if (!detailView) {
    return null;
  }

  const recipeId = String(detailView.combination.uuid || detailView.combination.id);
  const isRecipeFavorite = isFavorite(recipeId);
  const isCustomRecipe = detailView.source === 'custom';

  const actionButtons = (
    <>
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
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        anchor="bottom"
        enableBackgroundBlur={true}
      >
        <DrawerContent className="h-full max-h-[85vh] bg-[color:var(--color-surface)]">
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
              Recipe details
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border-secondary)',
                borderWidth: 1,
              }}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
          <DrawerBody className="space-y-4 px-4 pb-6 pt-4">
            <DevelopmentRecipeDetail
              view={detailView}
              onEditCustomRecipe={onEditCustomRecipe}
              onDeleteCustomRecipe={onDeleteCustomRecipe}
              isFavorite={(view) =>
                isFavorite(
                  String(view.combination.uuid || view.combination.id)
                )
              }
              onToggleFavorite={(view) =>
                toggleFavorite(
                  String(view.combination.uuid || view.combination.id)
                )
              }
              onShareRecipe={onShareRecipe}
            />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              {actionButtons}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recipe details" size="lg">
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
      <div className="flex gap-2 pt-4">{actionButtons}</div>
    </Modal>
  );
}
