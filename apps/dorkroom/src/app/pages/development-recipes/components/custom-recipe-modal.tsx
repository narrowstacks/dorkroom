import type { CustomRecipeFormData } from '@dorkroom/logic';
import {
  CustomRecipeForm,
  type DevelopmentCombinationView,
  Drawer,
  DrawerBody,
  DrawerContent,
  Modal,
} from '@dorkroom/ui';
import { X } from 'lucide-react';
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
}

export const CustomRecipeModal: FC<CustomRecipeModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    isMobile,
    editingRecipe,
    isSubmitting,
    onSubmit,
    filmOptions,
    developerOptions,
  } = props;

  const title = editingRecipe ? 'Edit custom recipe' : 'Add custom recipe';
  const initialValue = editingRecipe
    ? convertRecipeToFormData(editingRecipe)
    : CUSTOM_RECIPE_FORM_DEFAULT;

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        anchor="bottom"
        enableBackgroundBlur={true}
        className="max-h-[100dvh]"
      >
        <DrawerContent className="h-full max-h-[100dvh] bg-[color:var(--color-surface)]">
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
              {title}
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
          <DrawerBody className="px-4 pb-24 pt-4">
            <CustomRecipeForm
              initialValue={initialValue}
              onSubmit={onSubmit}
              onCancel={onClose}
              filmOptions={filmOptions}
              developerOptions={developerOptions}
              isSubmitting={isSubmitting}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <CustomRecipeForm
        initialValue={initialValue}
        onSubmit={onSubmit}
        onCancel={onClose}
        filmOptions={filmOptions}
        developerOptions={developerOptions}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};
