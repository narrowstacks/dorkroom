import React from "react";
import { Platform } from "react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
} from "@gluestack-ui/themed";
import { X } from "lucide-react-native";
import { CustomRecipeForm } from "@/components/development-recipes";
import { getRecipeFormModalConfig } from "@/components/development-recipes/ModalStyles";
import type { CustomRecipe } from "@/types/customRecipeTypes";

interface CustomRecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomRecipe: CustomRecipe | undefined;
  onSave: (recipeId: string) => void;
  isDesktop: boolean;
}

export function CustomRecipeFormModal({
  isOpen,
  onClose,
  editingCustomRecipe,
  onSave,
  isDesktop,
}: CustomRecipeFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={getRecipeFormModalConfig(isDesktop).size}
    >
      <ModalBackdrop />
      <ModalContent
        className={getRecipeFormModalConfig(isDesktop).className}
        style={getRecipeFormModalConfig(isDesktop).style}
      >
        {isDesktop && (
          <ModalHeader className="pb-4">
            <Text className="text-lg font-semibold">
              {editingCustomRecipe ? "Edit Recipe" : "New Recipe"}
            </Text>
            <ModalCloseButton>
              <X size={20} />
            </ModalCloseButton>
          </ModalHeader>
        )}
        <ModalBody className="flex-1 p-0">
          <CustomRecipeForm
            recipe={editingCustomRecipe}
            onClose={onClose}
            onSave={onSave}
            isDesktop={isDesktop}
            isMobileWeb={Platform.OS === "web" && !isDesktop}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
