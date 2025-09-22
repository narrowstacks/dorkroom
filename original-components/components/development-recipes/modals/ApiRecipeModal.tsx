import React from "react";
import { Modal, ModalBackdrop, ModalContent } from "@gluestack-ui/themed";
import { RecipeDetail } from "@/components/development-recipes";
import { getRecipeDetailModalConfig } from "@/components/development-recipes/ModalStyles";
import type { Film, Developer, Combination } from "@/api/dorkroom/types";

interface ApiRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCombination: Combination | null;
  onDuplicate: (combination: Combination) => void;
  getFilmById: (filmId: string) => Film | undefined;
  getDeveloperById: (developerId: string) => Developer | undefined;
  isDesktop: boolean;
}

export function ApiRecipeModal({
  isOpen,
  onClose,
  selectedCombination,
  onDuplicate,
  getFilmById,
  getDeveloperById,
  isDesktop,
}: ApiRecipeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={getRecipeDetailModalConfig(isDesktop).size}
    >
      <ModalBackdrop />
      <ModalContent
        className={getRecipeDetailModalConfig(isDesktop).className}
        style={getRecipeDetailModalConfig(isDesktop).style}
      >
        {selectedCombination && (
          <RecipeDetail
            combination={selectedCombination}
            film={getFilmById(selectedCombination.filmStockId)}
            developer={getDeveloperById(selectedCombination.developerId)}
            onClose={onClose}
            onDuplicate={() => onDuplicate(selectedCombination)}
            isCustomRecipe={false}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
