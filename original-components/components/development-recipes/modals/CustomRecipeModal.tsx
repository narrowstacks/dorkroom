import React from 'react';
import { Modal, ModalBackdrop, ModalContent } from '@gluestack-ui/themed';
import { RecipeDetail } from '@/components/development-recipes';
import { getCustomRecipeDetailModalConfig } from '@/components/development-recipes/ModalStyles';
import type { Film, Developer, Combination } from '@/api/dorkroom/types';
import type { CustomRecipe } from '@/types/customRecipeTypes';

interface CustomRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedCustomRecipe: CustomRecipe | null;
  onEdit: (recipe: CustomRecipe) => void;
  onDuplicate: (combination: Combination) => void;
  onDelete: () => void;
  getCustomRecipeFilm: (recipeId: string) => Film | undefined;
  getCustomRecipeDeveloper: (recipeId: string) => Developer | undefined;
  isDesktop: boolean;
}

export function CustomRecipeModal({
  isOpen,
  onClose,
  currentSelectedCustomRecipe,
  onEdit,
  onDuplicate,
  onDelete,
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
  isDesktop,
}: CustomRecipeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={getCustomRecipeDetailModalConfig(isDesktop).size}
    >
      <ModalBackdrop />
      <ModalContent
        className={getCustomRecipeDetailModalConfig(isDesktop).className}
        style={getCustomRecipeDetailModalConfig(isDesktop).style}
      >
        {currentSelectedCustomRecipe && (
          <RecipeDetail
            combination={{
              id: currentSelectedCustomRecipe.id,
              name: currentSelectedCustomRecipe.name,
              uuid: currentSelectedCustomRecipe.id,
              slug: currentSelectedCustomRecipe.id,
              filmStockId: currentSelectedCustomRecipe.filmId,
              developerId: currentSelectedCustomRecipe.developerId,
              temperatureF: currentSelectedCustomRecipe.temperatureF,
              timeMinutes: currentSelectedCustomRecipe.timeMinutes,
              shootingIso: currentSelectedCustomRecipe.shootingIso,
              pushPull: currentSelectedCustomRecipe.pushPull,
              agitationSchedule: currentSelectedCustomRecipe.agitationSchedule,
              notes: currentSelectedCustomRecipe.notes,
              customDilution: currentSelectedCustomRecipe.customDilution,
              dateAdded: currentSelectedCustomRecipe.dateCreated,
            }}
            film={getCustomRecipeFilm(currentSelectedCustomRecipe.id)}
            developer={getCustomRecipeDeveloper(currentSelectedCustomRecipe.id)}
            onClose={onClose}
            onEdit={() => onEdit(currentSelectedCustomRecipe)}
            onDuplicate={() =>
              onDuplicate({
                id: currentSelectedCustomRecipe.id,
                name: currentSelectedCustomRecipe.name,
                uuid: currentSelectedCustomRecipe.id,
                slug: currentSelectedCustomRecipe.id,
                filmStockId: currentSelectedCustomRecipe.filmId,
                developerId: currentSelectedCustomRecipe.developerId,
                temperatureF: currentSelectedCustomRecipe.temperatureF,
                timeMinutes: currentSelectedCustomRecipe.timeMinutes,
                shootingIso: currentSelectedCustomRecipe.shootingIso,
                pushPull: currentSelectedCustomRecipe.pushPull,
                agitationSchedule:
                  currentSelectedCustomRecipe.agitationSchedule,
                notes: currentSelectedCustomRecipe.notes,
                customDilution: currentSelectedCustomRecipe.customDilution,
                dateAdded: currentSelectedCustomRecipe.dateCreated,
              })
            }
            onDelete={onDelete}
            isCustomRecipe={true}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
