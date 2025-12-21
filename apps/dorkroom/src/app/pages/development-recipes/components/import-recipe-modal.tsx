import { ImportRecipeForm, ResponsiveModal } from '@dorkroom/ui';
import type { FC } from 'react';

export interface ImportRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  isProcessing: boolean;
  error?: string;
  onImport: (url: string) => Promise<void>;
}

export const ImportRecipeModal: FC<ImportRecipeModalProps> = ({
  isOpen,
  onClose,
  isMobile,
  isProcessing,
  error,
  onImport,
}) => {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import shared recipe"
      size="sm"
      mobileSize="md"
      mobileMaxHeight="70vh"
      isMobile={isMobile}
    >
      <ImportRecipeForm
        onImport={onImport}
        onCancel={onClose}
        isProcessing={isProcessing}
        error={error}
      />
    </ResponsiveModal>
  );
};
