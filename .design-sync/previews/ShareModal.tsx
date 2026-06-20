import { ShareModal } from '@dorkroom/ui';
import { useState } from 'react';

const noop = async () => {};

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

// Canonical share modal: web link with a copy control, info icon header.
export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <Frame>
      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        presetName="Portrait 5×7 with 0.5″ border"
        webUrl="https://dorkroom.art/border?preset=portrait-5x7-half-inch"
        onCopyToClipboard={noop}
      />
    </Frame>
  );
};

// Native share enabled — adds the "Share via system" action above the web link.
export const WithNativeShare = () => {
  const [open, setOpen] = useState(true);
  return (
    <Frame>
      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        presetName="Tri-X 400 in HC-110 (Dilution B)"
        webUrl="https://dorkroom.art/development?recipe=trix-400-hc110-b"
        onCopyToClipboard={noop}
        onNativeShare={noop}
        canShareNatively
      />
    </Frame>
  );
};

// Error state: no valid web URL available to share.
export const ErrorState = () => {
  const [open, setOpen] = useState(true);
  return (
    <Frame>
      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        presetName="Resize 8×10 → 11×14"
        webUrl=""
        onCopyToClipboard={noop}
      />
    </Frame>
  );
};
