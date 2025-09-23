import React from 'react';
import { Modal } from '../modal';
import { Drawer, DrawerBody, DrawerContent } from '../drawer';
import { DevelopmentRecipeDetail } from './recipe-detail';
import type { DevelopmentCombinationView } from './results-table';
import { cn } from '../../lib/cn';
import { X } from 'lucide-react';

interface SharedRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: DevelopmentCombinationView | null;
  onAddToCollection: () => void;
  isProcessing?: boolean;
  recipeSource?: 'shared' | 'custom';
  variant?: 'modal' | 'drawer';
}

export function SharedRecipeModal({
  isOpen,
  onClose,
  recipe,
  onAddToCollection,
  isProcessing = false,
  recipeSource = 'shared',
  variant = 'modal',
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
        className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Not now
      </button>
      <button
        type="button"
        onClick={onAddToCollection}
        disabled={isProcessing}
        className={cn(
          'rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90',
          isProcessing && 'cursor-wait opacity-70'
        )}
      >
        {isProcessing
          ? 'Adding...'
          : isCustomRecipe
          ? 'Add to My Recipes'
          : 'Save Recipe'}
      </button>
    </div>
  );

  const body = (
    <div className="space-y-4">
      <div className="text-sm text-white/70">{description}</div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-white/50">
          Recipe
        </div>
        <div className="mb-3 text-lg font-semibold text-white">{recipeName}</div>

        <DevelopmentRecipeDetail view={recipe} />
      </div>

      <div className="text-sm text-white/60">
        Would you like to add this recipe to your collection?
      </div>
    </div>
  );

  if (variant === 'drawer') {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="bottom">
        <DrawerContent className="h-full max-h-[85vh] bg-zinc-900">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="text-base font-semibold text-white">{modalTitle}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
          <DrawerBody className="px-4 pb-6 pt-4">
            {body}
          </DrawerBody>
          <div className="border-t border-white/10 px-4 pb-4 pt-3">{actions}</div>
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
