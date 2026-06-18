import { MobileSidebar } from '@dorkroom/ui';
import { useState } from 'react';

const noop = () => {};

// The open mobile navigation drawer with the app's real sectioned nav
// (Printing / Film / Camera / Reference) plus the Theme + Settings footer.
// The component is h-full, so we frame it in a phone-height panel.
export const Open = () => {
  const [path, setPath] = useState('/border');
  return (
    <div
      style={{
        width: 300,
        height: 560,
        border: '1px solid var(--color-border-primary)',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <MobileSidebar pathname={path} onNavigate={setPath} onClose={noop} />
    </div>
  );
};

// A different route highlighted — the Films entry is active in the Reference
// section, showing the active-item treatment.
export const ReferenceActive = () => {
  const [path, setPath] = useState('/films');
  return (
    <div
      style={{
        width: 300,
        height: 560,
        border: '1px solid var(--color-border-primary)',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <MobileSidebar pathname={path} onNavigate={setPath} onClose={noop} />
    </div>
  );
};
