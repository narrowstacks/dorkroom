import type { FC } from 'react';
import { X } from 'lucide-react';
import {
  Modal,
  Drawer,
  DrawerContent,
  DrawerBody,
  ImportRecipeForm,
} from '@dorkroom/ui';

export interface ImportRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  isProcessing: boolean;
  error?: string;
  onImport: (url: string) => Promise<void>;
}

export const ImportRecipeModal: FC<ImportRecipeModalProps> = (props) => {
  const { isOpen, onClose, isMobile, isProcessing, error, onImport } = props;

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        anchor="bottom"
        enableBackgroundBlur={true}
      >
        <DrawerContent className="h-full max-h-[70vh] bg-[color:var(--color-surface)]">
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--color-border-secondary)' }}
          >
            <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">
              Import shared recipe
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
          <DrawerBody className="px-4 pb-6 pt-4">
            <ImportRecipeForm
              onImport={onImport}
              onCancel={onClose}
              isProcessing={isProcessing}
              error={error}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import shared recipe" size="sm">
      <ImportRecipeForm
        onImport={onImport}
        onCancel={onClose}
        isProcessing={isProcessing}
        error={error}
      />
    </Modal>
  );
};
