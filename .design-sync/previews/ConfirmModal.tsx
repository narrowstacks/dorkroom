import { ConfirmModal } from '@dorkroom/ui';
import { useState } from 'react';

// Destructive confirm — the canonical "delete preset" flow with a warning icon.
export const Destructive = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 420 }}>
      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Delete preset?"
        message="“Portrait 5×7 with 0.5″ border” will be permanently removed. This can’t be undone."
        confirmText="Delete"
        cancelText="Keep"
        isDestructive
      />
    </div>
  );
};

// Non-destructive confirmation — warning-toned, used to gate a discard action.
export const NonDestructive = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 420 }}>
      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Discard unsaved changes?"
        message="You have unsaved edits to this development recipe. Leaving now discards your changes to the dilution and time."
        confirmText="Discard"
        cancelText="Stay"
      />
    </div>
  );
};

// In-progress state — confirm button shows the processing label and is disabled.
export const Processing = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 420 }}>
      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Delete preset?"
        message="“Tri-X 400 @ EI 800 push” is being removed from your saved presets."
        confirmText="Delete"
        isDestructive
        isProcessing
      />
    </div>
  );
};
