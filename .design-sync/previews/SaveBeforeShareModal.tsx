import { SaveBeforeShareModal } from '@dorkroom/ui';
import { useState } from 'react';

const noop = () => {};

// This modal renders a non-portal `fixed inset-0` overlay centered in a
// `min-h-screen` flex container. A wrapper with `transform` establishes a
// containing block for `position: fixed`, so the overlay is trapped inside
// this frame (and therefore captured) instead of escaping to the viewport.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 640,
        transform: 'translateZ(0)',
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid var(--color-border-secondary)',
      }}
    >
      {children}
    </div>
  );
}

// Canonical state: prompt to name and save a preset before sharing.
export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <Frame>
      <SaveBeforeShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSaveAndShare={noop}
      />
    </Frame>
  );
};

// Error state: an external error message surfaced beneath the name field.
export const WithError = () => {
  const [open, setOpen] = useState(true);
  return (
    <Frame>
      <SaveBeforeShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSaveAndShare={noop}
        error="A preset with this name already exists. Choose a different name."
      />
    </Frame>
  );
};

// Loading state: saving in progress, inputs disabled, spinner on the action.
export const Saving = () => {
  const [open, setOpen] = useState(true);
  return (
    <Frame>
      <SaveBeforeShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSaveAndShare={noop}
        isLoading
      />
    </Frame>
  );
};
