import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipeFormData } from '@dorkroom/logic';
import {
  CustomRecipeForm,
  type DevelopmentCombinationView,
  ResponsiveModal,
} from '@dorkroom/ui';
import type { FC } from 'react';
import {
  CUSTOM_RECIPE_FORM_DEFAULT,
  convertRecipeToFormData,
} from '../utils/recipeUtils';

export interface CustomRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  editingRecipe: DevelopmentCombinationView | null;
  isSubmitting: boolean;
  onSubmit: (data: CustomRecipeFormData) => Promise<void>;
  filmOptions: Array<{ label: string; value: string }>;
  developerOptions: Array<{ label: string; value: string }>;
  allFilms: Film[];
  allDevelopers: Developer[];
}

export const CustomRecipeModal: FC<CustomRecipeModalProps> = ({
  isOpen,
  onClose,
  isMobile,
  editingRecipe,
  isSubmitting,
  onSubmit,
  filmOptions,
  developerOptions,
  allFilms,
  allDevelopers,
}) => {
  const title = editingRecipe ? 'Edit custom recipe' : 'Add custom recipe';
  const initialValue = editingRecipe
    ? convertRecipeToFormData(editingRecipe)
    : CUSTOM_RECIPE_FORM_DEFAULT;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      mobileSize="lg"
      mobileMaxHeight="100dvh"
      isMobile={isMobile}
      drawerBodyClassName="pb-24"
    >
      <CustomRecipeForm
        initialValue={initialValue}
        onSubmit={onSubmit}
        onCancel={onClose}
        filmOptions={filmOptions}
        developerOptions={developerOptions}
        allFilms={allFilms}
        allDevelopers={allDevelopers}
        isSubmitting={isSubmitting}
      />
    </ResponsiveModal>
  );
};
